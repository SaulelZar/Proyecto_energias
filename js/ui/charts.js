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
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // 🟢 FIX: Destrucción absoluta consultando el motor nativo de Chart.js
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Limpieza de referencias huérfanas
    if (chartRegistry[canvasId]) delete chartRegistry[canvasId];
    if (window[canvasId]) delete window[canvasId];
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

    // Destrucción absoluta para evitar colisiones de memoria en WebGL
    destroyChart(canvasId);

    const labels = intervals.map(d => {
        const h = String(d.hour).padStart(2, '0');
        const m = String(d.minutes).padStart(2, '0');
        return `${h}:${m}`;
    });

    // Transformación Termodinámica: Energía (kWh) -> Potencia (kW)
    const demandaOriginal = intervals.map(d => (d.consumption || 0) * 4);
    const demandaNeta = intervals.map(d => (d.gridImport || 0) * 4);

    const ctx = canvas.getContext('2d');
    chartRegistry[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Demanda Original (Sin Paneles) kW',
                    data: demandaOriginal,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Demanda Neta (Facturable a CFE) kW',
                    data: demandaNeta,
                    borderColor: 'rgba(37, 99, 235, 1)',
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
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(2)} kW` } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Potencia (kW)' } },
                x: { ticks: { maxTicksLimit: 12 } }
            }
        }
    });
}

// ============================================
// RENDERIZADO DE GRÁFICAS (CHART.JS)
// ============================================
let cfeChartInstance = null; // Variable global para destruir el chart anterior al recalcular

function renderGraficaCFE(genMensual, consMensual) {
    const ctx = document.getElementById('cfeMonthlyChart');
    if (!ctx) {
        console.warn("⚠️ No se encontró el canvas 'cfeMonthlyChart' en el DOM.");
        return;
    }

    // Destruir la gráfica anterior si existe (evita el bug de "hover" parpadeante)
    if (cfeChartInstance) {
        cfeChartInstance.destroy();
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    cfeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Consumo Industrial (kWh)',
                    data: consMensual,
                    backgroundColor: 'rgba(100, 116, 139, 0.7)', // Gris pizarra
                    borderColor: 'rgba(100, 116, 139, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Generación Solar (kWh)',
                    data: genMensual,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)', // Verde CFE / Energía Limpia
                    borderColor: 'rgba(21, 128, 60, 1)',
                    borderWidth: 1,
                    borderRadius: 4
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
                title: {
                    display: true,
                    text: 'Balance Energético Anual CFE',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw || 0;
                            return `${context.dataset.label}: ${value.toLocaleString('es-MX', {maximumFractionDigits: 0})} kWh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Energía (kWh)'
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
    
    console.log("📊 [UI] Gráfica de Balance CFE renderizada correctamente.");
}

// UBICACIÓN: charts.js -> Reemplaza la función createCashflowChart completa

export function createCashFlowChart(canvasId, capexTotal, ahorroAnualIntegral, gastoNuevo, años = 10) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (window[canvasId] instanceof Chart) {
        window[canvasId].destroy();
    } else if (chartRegistry[canvasId]) {
        chartRegistry[canvasId].destroy();
    }

    const labels = Array.from({ length: años + 1 }, (_, i) => `Año ${i}`);
    
    const flujoConPaneles = [-capexTotal];
    const barrasAhorro = [0];
    const barrasGasto = [0];

    let acumulado = -capexTotal;
    let ahorroInflacionado = ahorroAnualIntegral;
    let gastoInflacionado = gastoNuevo;

    for (let i = 1; i <= años; i++) {
        acumulado += ahorroInflacionado;
        flujoConPaneles.push(acumulado);
        
        barrasAhorro.push(ahorroInflacionado);
        barrasGasto.push(gastoInflacionado);

        ahorroInflacionado *= 1.03; // 3% de inflación anual tarifaria CFE
        gastoInflacionado *= 1.03;
    }

    const ctx = canvas.getContext('2d');
    chartRegistry[canvasId] = new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Flujo de Efectivo Acumulado (ROI)',
                    data: flujoConPaneles,
                    borderColor: 'rgba(234, 179, 8, 1)', // Amarillo
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.3,
                    yAxisID: 'y', // Asignado al eje izquierdo
                    zIndex: 10
                },
                {
                    type: 'bar',
                    label: 'Ahorro Generado (MXN)',
                    data: barrasAhorro,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)', // Verde
                    yAxisID: 'y1' // Asignado al eje derecho
                },
                {
                    type: 'bar',
                    label: 'Pago a CFE Restante (MXN)',
                    data: barrasGasto,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', // Rojo
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX', {maximumFractionDigits:0})}` } },
                annotation: { annotations: { line1: { type: 'line', yMin: 0, yMax: 0, borderColor: 'white', borderWidth: 1, borderDash: [5, 5] } } }
            },
            scales: { 
                y: { 
                    type: 'linear', display: true, position: 'left', 
                    title: { display: true, text: 'Flujo Acumulado (Línea)' } 
                },
                y1: {
                    type: 'linear', display: true, position: 'right', stacked: true,
                    title: { display: true, text: 'Desglose Anual (Barras)' },
                    grid: { drawOnChartArea: false } // Evita que se cruce la cuadrícula
                },
                x: { 
                    stacked: true // Apila el gasto y el ahorro para mostrar el gasto original total visualmente
                } 
            }
        }
    });
}