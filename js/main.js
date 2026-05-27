// ============================================
// main.js
// Punto de entrada principal - VERSIÓN COMPLETA Y GLOBAL
// ============================================

import { fetchHourlyWeather } from './solar/weather.js';
import { simulateYear } from './solar/yearly.js';
import { createBattery } from './solar/battery.js';
import { simulateEnergySystem } from './solar/energySystem.js';

import {
    createPowerChart,
    createIrradianceChart,
    createBatteryChart,
    createTemperatureChart
} from './ui/charts.js';

import {
    readCSV,
    intervalConsumptionProfile
} from './utils/csv.js';


// ============================================
// VARIABLES GLOBALES (Con memoria)
// ============================================

let yearlySimulation = null;
let energyResults = null;
let hourlyWeather = [];
let currentCsvData = []; // Memoria para que el botón Calcular no borre tu fábrica

const DEFAULT_HOURLY_CONSUMPTION = Array(96).fill(0);


// ============================================
// BATERÍA
// ============================================

function buildBattery() {
    return createBattery({
        capacityKWh: 10,
        initialSOC: 0.5
    });
}


// ============================================
// INPUT SAFE
// ============================================

function getInputValue(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;

    const v = Number(el.value);
    return isNaN(v) ? fallback : v;
}


// ============================================
// CONFIG UI
// ============================================

function getConfigFromUI() {
    const longitude = getInputValue('longitud', -100.3161);
    const standardMeridian = Math.round(longitude / 15) * 15;

    return {
        latitude: getInputValue('latitud', 25.6866),
        longitude: longitude,
        altitude: getInputValue('altitud', 540),
        standardMeridian: standardMeridian,
        panelTilt: getInputValue('inclinacion', 25),
        panelAzimuth: getInputValue('azimut', 180),
        panelArea: getInputValue('area', 4),
        nominalEfficiency: getInputValue('eficiencia', 22) / 100,
        year: 2026
    };
}


// ============================================
// KPIs
// ============================================

function updateKPIs() {
    if (!yearlySimulation) return;

    document.getElementById('genAnual').textContent =
        yearlySimulation.annualEnergy.toFixed(2) + ' kWh';

    document.getElementById('efSistema').textContent =
        (yearlySimulation.averageEfficiency * 100).toFixed(1) + '%';

    document.getElementById('potenciaPico').textContent =
        (yearlySimulation.peakPower / 1000).toFixed(2) + ' kW';

    if (yearlySimulation.annualConsumptionEnergy > 0) {
        const cobertura = ((yearlySimulation.annualConsumptionEnergy - yearlySimulation.annualGridImport) / yearlySimulation.annualConsumptionEnergy) * 100;
        document.getElementById('cobertura').textContent = cobertura.toFixed(1) + '%';
    } else {
        document.getElementById('cobertura').textContent = '0%';
    }
}


// ============================================
// CHARTS
// ============================================

function updateCharts() {
    if (!yearlySimulation) return;

    const firstDay = yearlySimulation.dailyResults[0];

    if (!firstDay?.fullSimulation) return;

    // Pasamos el balance completo (incluye el CSV) a las gráficas principales
    if (energyResults?.intervals) {
        createPowerChart('powerChart', energyResults.intervals);
        createBatteryChart('batteryChart', energyResults.intervals);
    }

    createIrradianceChart('irradianceChart', firstDay.fullSimulation);
    createTemperatureChart('temperatureChart', firstDay.fullSimulation);
}


// ============================================
// SIMULACIÓN PRINCIPAL
// ============================================

async function runSimulation() {
    try {
        const config = getConfigFromUI();
        console.log('CONFIG:', config);
        console.log('RAW CONSUMPTION ROWS:', currentCsvData.length);

        // Solo descargamos el clima si no lo tenemos en memoria
        if (hourlyWeather.length === 0) {
            hourlyWeather = await fetchHourlyWeather(
                config.latitude,
                config.longitude
            );
            console.log('WEATHER LOADED');
        }

        yearlySimulation = simulateYear({
            ...config,
            hourlyWeather,
            annualConsumption: currentCsvData
        });

        console.log('ANNUAL ENERGY:', yearlySimulation.annualEnergy);

        const firstDay = yearlySimulation.dailyResults[0].fullSimulation;
        const battery = buildBattery();

        let firstDayConsumption = DEFAULT_HOURLY_CONSUMPTION;
        
        // Extraemos solo las primeras 24 horas (96 intervalos) para la gráfica principal
        if (currentCsvData.length > 0) {
            const targetColumn = 'kw' in currentCsvData[0] ? 'kw' : 'Demanda_kW';
            const fullProfile = intervalConsumptionProfile(currentCsvData, targetColumn);
            firstDayConsumption = fullProfile.slice(0, 96);
        }

        energyResults = simulateEnergySystem({
            solarSimulation: firstDay,
            battery,
            hourlyConsumption: firstDayConsumption
        });

        updateKPIs();
        updateCharts();

    } catch (err) {
        console.error('Simulation error:', err);
    }
}


// ============================================
// CSV IMPORT
// ============================================

function setupCSVImport() {
    const csvInput = document.getElementById('csvFile');

    if (!csvInput) return;

    csvInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Guardamos la matriz en la memoria global
            currentCsvData = await readCSV(file);
            console.log('CSV CARGADO EN MEMORIA:', currentCsvData.length);

            await runSimulation();

        } catch (err) {
            console.error('CSV error:', err);
        }
    });
}


// ============================================
// BOTÓN CALCULAR
// ============================================

function setupCalculateButton() {
    const btn = document.getElementById('calcularBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        // Al darle click, usará la memoria global sin borrar el CSV
        await runSimulation();
    });
}


// ============================================
// INIT (¡El interruptor principal!)
// ============================================

async function init() {
    console.log('Inicializando simulador FV...');

    setupCSVImport();
    setupCalculateButton();

    // Arranca el simulador en ceros al cargar la página
    await runSimulation();
}

// Encendemos la app
init();