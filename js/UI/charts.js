// ============================================
// charts.js
// Gráficas del Simulador - VERSIÓN INDUSTRIAL
// ============================================

const chartRegistry = {};

function safeChart() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado');
        return false;
    }
    return true;
}

function destroyChart(canvasId) {
    if (chartRegistry[canvasId]) {
        chartRegistry[canvasId].destroy();
        delete chartRegistry[canvasId];
    }
}

function createLineChart({
    canvasId,
    labels,
    datasets,
    yMin = undefined,
    yMax = undefined,
    yAxisLabel = '' // 🟢 NUEVO: Etiqueta para el eje Y
}) {

    if (!safeChart()) return;

    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.warn(`Canvas "${canvasId}" no encontrado`);
        return;
    }

    destroyChart(canvasId);
    const ctx = canvas.getContext('2d');

    const scales = {
        x: {
            ticks: {
                maxTicksLimit: 12 // 🟢 FIX: Mostrar hora cada 2 hrs (más limpio en 96 intervalos)
            }
        },
        y: {
            beginAtZero: true,
            title: {
                display: !!yAxisLabel,
                text: yAxisLabel
            }
        }
    };

    if (yMin !== undefined) scales.y.min = yMin;
    if (yMax !== undefined) scales.y.max = yMax;

    chartRegistry[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 }, // 🟢 NUEVO: Animación suave al cargar
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                tooltip: { // 🟢 FIX: Tooltips limpios a 2 decimales
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            },
            scales
        }
    });

    return chartRegistry[canvasId];
}

function formatTimeLabel(data) {
    const hour = data?.hour ?? 0;
    const minutes = data?.minutes ?? 0;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// 🟢 FIX: Agregamos soporte para colores (color) y relleno (fill)
function buildDataset({ label, data, color, borderWidth = 2, fill = false }) {
    return {
        label,
        data,
        borderColor: color,
        backgroundColor: fill ? color.replace('rgb', 'rgba').replace(')', ', 0.2)') : 'transparent',
        borderWidth,
        tension: 0.4, // 🟢 FIX: Curvas termodinámicas suaves
        fill,
        pointRadius: 0,
        pointHoverRadius: 4 // Puntos visibles al pasar el ratón
    };
}

// =============================
// POWER (Reemplazar en charts.js)
// =============================
export function createPowerChart(canvasId, intervals) {
    if (!Array.isArray(intervals) || !intervals.length) return;

    return createLineChart({
        canvasId,
        labels: intervals.map(formatTimeLabel),
        yAxisLabel: 'Potencia (kW)',
        datasets: [
            buildDataset({
                label: 'Generación Fotovoltaica',
                // La potencia solar viene en Watts, la pasamos a kW
                data: intervals.map(h => (h.solarPower ?? 0) / 1000), 
                color: 'rgb(234, 179, 8)', // Amarillo
                fill: true
            }),
            buildDataset({
                label: 'Demanda Industrial (CSV)',
                // 🟢 FIX VISUAL: El CSV se procesó como Energía (kWh) en intervalos de 15 min.
                // Para graficarlo como Potencia (kW) frente a frente con el panel, lo dividimos entre 0.25h
                data: intervals.map(h => (h.consumption ?? 0) / 0.25), 
                color: 'rgb(239, 68, 68)', // Rojo industrial
                borderWidth: 2,
                fill: false // Sin relleno para que no tape al sol
            })
        ]
    });
}

// =============================
// IRRADIANCIA
// =============================
export function createIrradianceChart(canvasId, simulation) {
    if (!simulation?.hourly?.length) return;

    return createLineChart({
        canvasId,
        labels: simulation.hourly.map(formatTimeLabel),
        yAxisLabel: 'Irradiancia (W/m²)',
        datasets: [
            buildDataset({ 
                label: 'POA (Plano del Arreglo)', 
                data: simulation.hourly.map(h => h.poa ?? 0), 
                color: 'rgb(249, 115, 22)', // Naranja oscuro
                borderWidth: 2 
            }),
            buildDataset({ 
                label: 'DNI (Directa Normal)', 
                data: simulation.hourly.map(h => h.dni ?? 0), 
                color: 'rgb(59, 130, 246)', // Azul
                borderWidth: 1 
            }),
            buildDataset({ 
                label: 'GHI (Global Horizontal)', 
                data: simulation.hourly.map(h => h.ghi ?? 0), 
                color: 'rgb(168, 85, 247)', // Púrpura
                borderWidth: 1 
            })
        ]
    });
}

// =============================
// BATERÍA
// =============================
export function createBatteryChart(canvasId, intervals) {
    if (!Array.isArray(intervals) || !intervals.length) return;

    return createLineChart({
        canvasId,
        labels: intervals.map(formatTimeLabel),
        yAxisLabel: 'Estado de Carga (%)',
        yMin: 0,
        yMax: 100,
        datasets: [
            buildDataset({
                label: 'SOC de la Batería',
                data: intervals.map(h => (h.batterySOC ?? 0) * 100),
                color: 'rgb(34, 197, 94)', // Verde industrial
                fill: true
            })
        ]
    });
}

// =============================
// TEMPERATURA
// =============================
export function createTemperatureChart(canvasId, simulation) {
    if (!simulation?.hourly?.length) return;

    return createLineChart({
        canvasId,
        labels: simulation.hourly.map(formatTimeLabel),
        yAxisLabel: 'Temperatura (°C)',
        datasets: [
            buildDataset({
                label: 'Temperatura del Panel',
                data: simulation.hourly.map(h => h.panelTemp ?? 0),
                color: 'rgb(239, 68, 68)', // Rojo
                fill: true
            })
        ]
    });
}

// ============================================
// GRÁFICA DE DEMANDA NETA VS ORIGINAL
// ============================================
export function createNetLoadChart(canvasId, intervals) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destruir gráfica anterior si existe para evitar superposición
    if (window[canvasId] instanceof Chart) {
        window[canvasId].destroy();
    }

    const labels = intervals.map(d => {
        const h = String(d.hour).padStart(2, '0');
        const m = String(d.minutes).padStart(2, '0');
        return `${h}:${m}`;
    });

    // Demanda Original (Sin FV)
    const demandaOriginal = intervals.map(d => d.consumption || 0);
    
    // Demanda Neta (Lo que le compramos a CFE = Grid Import)
    const demandaNeta = intervals.map(d => d.gridImport || 0);

    const ctx = canvas.getContext('2d');
    window[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Demanda Original (Sin Paneles) kW',
                    data: demandaOriginal,
                    borderColor: 'rgba(239, 68, 68, 0.4)', // Rojo transparente
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 2,
                    borderDash: [5, 5], // Línea punteada para indicar que es "teórica"
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Demanda Neta (Facturable a CFE) kW',
                    data: demandaNeta,
                    borderColor: 'rgba(37, 99, 235, 1)', // Azul fuerte
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kW`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Potencia (kW)' }
                },
                x: {
                    ticks: { maxTicksLimit: 24 }
                }
            }
        }
    });
}