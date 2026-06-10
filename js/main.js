// ============================================
// main.js
// Punto de entrada principal - ORQUESTADOR PURO
// ============================================

import { fetchHourlyWeather } from './solar/weather.js';
import { simulateYear } from './solar/yearly.js';
import { calcularAhorroCFE } from './solar/cfe.js';
import { autoDimensionarSistema } from './solar/optimizer.js';

import {
    createPowerChart,
    createIrradianceChart,
    createBatteryChart,
    createTemperatureChart,
    createNetLoadChart
} from './ui/charts.js';

import { readCSV } from './utils/csv.js';

import {
    getConfigFromUI,
    updateKPIs,
    actualizarKPIsFinancieros,
    calcularFinanzas,
    getSelectedDay
} from './ui/uiController.js';

// ============================================
// VARIABLES GLOBALES Y CACHÉ
// ============================================
let hourlyWeather = [];
let currentCsvData = []; 
let currentWeatherProfile = ''; 
let currentCoords = ''; 
let cfeChartInstance = null; // Instancia global para la gráfica CFE

const CIUDADES_MEXICO = {
    monterrey: { lat: 25.6866, lon: -100.3161, alt: 540, tarifa: 'golfo_norte' },
    cdmx: { lat: 19.4326, lon: -99.1332, alt: 2240, tarifa: 'valle_mexico' },
    guadalajara: { lat: 20.6597, lon: -103.3500, alt: 1566, tarifa: 'jalisco' },
    merida: { lat: 20.9674, lon: -89.6237, alt: 9, tarifa: 'peninsular' },
    hermosillo: { lat: 29.0729, lon: -110.9559, alt: 210, tarifa: 'noroeste' },
    tijuana: { lat: 32.5149, lon: -117.0382, alt: 20, tarifa: 'baja_california' }
};

// ============================================
// AGREGADOR MENSUAL (GENERACIÓN VS CONSUMO)
// ============================================
function procesarDatosMensualesCFE(yearlySimulation, csvData) {
    let genMensualKWh = new Array(12).fill(0);
    let consMensualKWh = new Array(12).fill(0);

    const diasSimulados = yearlySimulation.dailyResults || [];
    
    diasSimulados.forEach(dayData => {
        const mes = dayData.date.getMonth();
        
        // 1. Acumulamos la Generación Solar del mes
        genMensualKWh[mes] += dayData.energy || 0;
        
        // 2. Acumulamos el Consumo Industrial directamente desde el motor físico
        if (dayData.energySystem && dayData.energySystem.intervals) {
            dayData.energySystem.intervals.forEach(int => {
                // Sumamos la energía de cada intervalo de 15 min
                consMensualKWh[mes] += int.consumption || 0; 
            });
        }
    });

    return { genMensualKWh, consMensualKWh };
}

// ============================================
// RENDERIZADO DE GRÁFICA CFE (CHART.JS)
// ============================================
function renderGraficaCFE(genMensual, consMensual) {
    const ctx = document.getElementById('cfeMonthlyChart');
    if (!ctx) return;

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
                    backgroundColor: 'rgba(100, 116, 139, 0.7)', 
                    borderColor: 'rgba(100, 116, 139, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Generación Solar (kWh)',
                    data: genMensual,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)', 
                    borderColor: 'rgba(21, 128, 60, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Energía (kWh)' } }
            }
        }
    });
}

// ============================================
// FLUJO PRINCIPAL DE SIMULACIÓN
// ============================================
async function runSimulation() {
    try {
        const config = getConfigFromUI();
        
        const coordsKey = `${config.latitude},${config.longitude}`;

        if (hourlyWeather.length === 0 || currentWeatherProfile !== config.climaEspecifico || currentCoords !== coordsKey) {
            hourlyWeather = await fetchHourlyWeather(config.latitude, config.longitude, config.altitude, config.climaEspecifico);
            currentWeatherProfile = config.climaEspecifico;
            currentCoords = coordsKey; 
        }

        const capacidadReal = config.capacidadBateria > 0 ? config.capacidadBateria : 0.001;

        // 🟢 Única ejecución real de la simulación del año
        const yearlySimulation = simulateYear({
            ...config,
            hourlyWeather,
            annualConsumption: currentCsvData,
            batteryConfig: {
                capacityKWh: capacidadReal, 
                initialSOC: config.socInicial / 100
            }
        });

        window.yearlySimulation = yearlySimulation;

        // Disparos a la UI (KPIs y Finanzas)
        updateKPIs(yearlySimulation);
        const totalCAPEX = calcularFinanzas(config, capacidadReal);
        const finanzasCFE = calcularAhorroCFE(yearlySimulation);
        actualizarKPIsFinancieros(finanzasCFE, totalCAPEX);

        // 🟢 CÓDIGO CORREGIDO:
        // Disparos a los Gráficos Principales
        const escenarioSeleccionado = getSelectedDay(yearlySimulation.dailyResults);
        window.currentDayData = escenarioSeleccionado;

        // Conservar la memoria de estado del selector de resolución
        const escalaActual = document.getElementById('escalaTiempo').value;
        
        if (escalaActual === 'dia') {
            updateCharts(escenarioSeleccionado);
        } else {
            // Actualizamos en segundo plano las gráficas avanzadas inferiores (siempre diarias)
            if (escenarioSeleccionado.energySystem?.intervals) {
                createBatteryChart('batteryChart', escenarioSeleccionado.energySystem.intervals);
            }
            if (escenarioSeleccionado.fullSimulation) {
                createIrradianceChart('irradianceChart', escenarioSeleccionado.fullSimulation);
                createTemperatureChart('temperatureChart', escenarioSeleccionado.fullSimulation);
            }
            
            // Disparamos el orquestador temporal para mantener intactas las barras macro
            actualizarGraficasTemporales();
        }

        // Disparos a la Gráfica Anual CFE (Usando el único resultado correcto)
        const datosAgrupados = procesarDatosMensualesCFE(yearlySimulation, currentCsvData);
        renderGraficaCFE(datosAgrupados.genMensualKWh, datosAgrupados.consMensualKWh);

    } catch (err) {
        console.error('Simulation error:', err);
    }
}

// ============================================
// ACTUALIZACIÓN DE GRÁFICAS TEMPORALES
// ============================================
function updateCharts(selectedDay) {
    if (!selectedDay) return;
    window.currentDayData = selectedDay;

    // 🟢 FIX: Restaurar etiquetas a resolución de 15 minutos
    const powerBadge = document.getElementById('powerChart')?.closest('.chart-container')?.querySelector('.badge');
    const netBadge = document.getElementById('netLoadChart')?.closest('.chart-container')?.querySelector('.badge');
    if (powerBadge) powerBadge.textContent = 'Resolución: 15 min';
    if (netBadge) netBadge.textContent = 'Peak Shaving (Reducción de Picos)';

    if (selectedDay.energySystem?.intervals) {
        createPowerChart('powerChart', selectedDay.energySystem.intervals);
        createBatteryChart('batteryChart', selectedDay.energySystem.intervals);
        createNetLoadChart('netLoadChart', selectedDay.energySystem.intervals);
    }

    if (selectedDay.fullSimulation) {
        createIrradianceChart('irradianceChart', selectedDay.fullSimulation);
        createTemperatureChart('temperatureChart', selectedDay.fullSimulation);
    }
}

function renderMacroChart(canvasId, title, labels, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // 🟢 FIX: Aseguramos la aniquilación de la vista de 15 min antes de pintar barras
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    
    new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { title: { display: true, text: title, font: { size: 14 } }, legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Energía (kWh)' } } }
        }
    });
}

function actualizarGraficasTemporales() {
    // 🟢 FIX 1: Quitamos la dependencia fantasma de window.currentCsvData
    if (!window.yearlySimulation) return; 

    const escala = document.getElementById('escalaTiempo').value;
    const mesIdx = parseInt(document.getElementById('mesSelector').value);

    // MODO DIARIO (15 MIN) -> Restaura tus gráficas de línea originales
    if (escala === 'dia') {
        if (window.currentDayData) updateCharts(window.currentDayData);
        return;
    }

    // MODO MES / AÑO -> Extracción de los datos matemáticamente validados
    let renderLabels = [];
    let renderGen = [];
    let renderCons = [];
    let renderComp = [];

    const dailyResults = window.yearlySimulation.dailyResults || [];

    if (escala === 'ano') {
        renderLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        renderGen = new Array(12).fill(0);
        renderCons = new Array(12).fill(0);
        renderComp = new Array(12).fill(0);

        dailyResults.forEach(dayData => {
            const m = dayData.date.getMonth();
            renderGen[m] += dayData.energy || 0; // Acumular Generación Solar

            if (dayData.energySystem && dayData.energySystem.intervals) {
                dayData.energySystem.intervals.forEach(int => {
                    renderCons[m] += int.consumption || 0; // Acumular Demanda Industrial
                    renderComp[m] += int.gridImport || 0;  // Acumular Compra a CFE
                });
            }
        });

    } else if (escala === 'mes') {
        // Filtrar solo los días del mes seleccionado
        const diasDelMes = dailyResults.filter(d => d.date.getMonth() === mesIdx);

        diasDelMes.forEach((dayData, index) => {
            renderLabels.push(`Día ${index + 1}`);
            renderGen.push(dayData.energy || 0);

            let consumoDia = 0;
            let compraDia = 0;
            if (dayData.energySystem && dayData.energySystem.intervals) {
                dayData.energySystem.intervals.forEach(int => {
                    consumoDia += int.consumption || 0;
                    compraDia += int.gridImport || 0;
                });
            }
            renderCons.push(consumoDia);
            renderComp.push(compraDia);
        });
    }

    // 🟢 FIX: Actualizar etiquetas según la escala seleccionada
    const powerBadge = document.getElementById('powerChart')?.closest('.chart-container')?.querySelector('.badge');
    const netBadge = document.getElementById('netLoadChart')?.closest('.chart-container')?.querySelector('.badge');
    if (powerBadge) powerBadge.textContent = escala === 'ano' ? 'Resolución: Mensual' : 'Resolución: Diaria';
    if (netBadge) netBadge.textContent = 'Volumen Facturable a CFE';


    // 🟢 FIX: Renderizar Gráfica 1 (Balance General - Barras)
    renderMacroChart('powerChart', `Balance Energético (${escala === 'ano' ? 'Acumulado Anual' : 'Acumulado Mensual'})`, renderLabels, [
        { label: 'Demanda Industrial (kWh)', data: renderCons, backgroundColor: 'rgba(100, 116, 139, 0.7)' },
        { label: 'Generación FV (kWh)', data: renderGen, backgroundColor: 'rgba(234, 179, 8, 0.8)' }
    ]);

    // 🟢 FIX: Renderizar Gráfica 2 (Demanda Neta vs CFE - Barras parejas)
    renderMacroChart('netLoadChart', `Demanda Neta vs CFE (${escala === 'ano' ? 'Acumulado Anual' : 'Acumulado Mensual'})`, renderLabels, [
        { 
            label: 'Demanda Original Teórica (kWh)', 
            data: renderCons, 
            backgroundColor: 'rgba(100, 116, 139, 0.7)' // Gris tenue para mostrar el volumen original
        },
        { 
            label: 'Demanda Neta Comprada a CFE (kWh)', 
            data: renderComp, 
            backgroundColor: 'rgba(37, 99, 235, 0.8)' // Azul parejo con el resto del dashboard
        }
    ]);
}

// ============================================
// EVENT LISTENERS & WIRING
// ============================================
function setupCSVImport() {
    const csvInput = document.getElementById('csvFile');
    if (!csvInput) return;
    
    csvInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // El motor delega el trabajo sucio al módulo especializado
            currentCsvData = await readCSV(file);
            console.log(`✅ CSV Procesado exitosamente: ${currentCsvData.length} registros cargados.`);
            
            // Refrescamos la simulación con los nuevos datos
            await runSimulation();
            
        } catch (err) { 
            console.error('Error en la importación del CSV:', err); 
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Botones Principales
    document.getElementById('calcularBtn')?.addEventListener('click', runSimulation);
    document.getElementById('btnAutoSizing')?.addEventListener('click', () => {
        autoDimensionarSistema(getConfigFromUI(), hourlyWeather, currentCsvData, runSimulation);
    });

    // 2. Selector de Ciudad (Lógica Unificada)
    document.getElementById('ciudad')?.addEventListener('change', async function(e) {
        if (this.value === 'custom') return; 
        
        const selectedOption = this.options[this.selectedIndex];
        
        // Verificamos si estamos usando los atributos 'data-' o el objeto CIUDADES_MEXICO
        let newLat = selectedOption.getAttribute('data-lat');
        let newLon = selectedOption.getAttribute('data-lon');

        if (newLat && newLon) {
            document.getElementById('latitud').value = newLat;
            document.getElementById('longitud').value = newLon;
            
            // Auto-trigger the simulation
            if (window.yearlySimulation) await runSimulation();
        }
    });

    // 3. Dropdowns Rápidos (Estación, Tipo Día, etc.)
    ['estacion', 'tipoDia', 'diaEspecifico', 'climaEspecifico'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', async () => {
            if (window.yearlySimulation) await runSimulation();
        });
    });

    // 4. Escalas Temporales de Gráficas
    const escalaSelect = document.getElementById('escalaTiempo');
    const mesSelect = document.getElementById('mesSelector');
    if (escalaSelect) {
        escalaSelect.addEventListener('change', (e) => {
            e.target.value === 'mes' ? mesSelect.classList.remove('hidden') : mesSelect.classList.add('hidden');
            actualizarGraficasTemporales();
        });
    }
    if (mesSelect) mesSelect.addEventListener('change', actualizarGraficasTemporales);

    // 5. Inputs Manuales (Si se mueven, cambia a Custom)
    const inputsGeograficos = ['latitud', 'longitud', 'altitud', 'inclinacion', 'azimut'];
    inputsGeograficos.forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('change', async () => {
                const selectCiudad = document.getElementById('ciudad');
                if (selectCiudad && selectCiudad.value !== 'custom') {
                    selectCiudad.value = 'custom';
                }
                if (window.yearlySimulation) await runSimulation();
            });
        }
    });

    // 6. Tema Visual
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            isLight ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', 'light');
            themeToggleBtn.innerHTML = isLight 
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Modo Claro`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Modo Oscuro`;
            if (window.yearlySimulation) {
                updateCharts(window.currentDayData);
                actualizarGraficasTemporales();
            }
        });
    }
});

// ============================================
// BOOTSTRAP
// ============================================
async function init() {
    setupCSVImport();
    await runSimulation();
}

init();