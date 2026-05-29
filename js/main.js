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
// VARIABLES GLOBALES (Agregar a main.js)
// ============================================
let yearlySimulation = null;
let energyResults = null;
let hourlyWeather = [];
let currentCsvData = []; 
let currentWeatherProfile = ''; // 🟢 Memoria del escenario meteorológico


const DEFAULT_HOURLY_CONSUMPTION = Array(96).fill(0);

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
// CONFIG UI (Actualizar en main.js)
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
        
        // 🟢 NUEVOS PARÁMETROS INDUSTRIALES
        tracking: document.getElementById('tracking')?.value || 'fixed',
        bifaciality: getInputValue('bifacial', 0),
        inverterAC: getInputValue('inversorAC', 10000), 

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
// BUSCADOR DE ESCENARIOS (Con Día Específico)
// ============================================
function getSelectedDay(dailyResults) {
    // 1. Revisamos si el usuario seleccionó un día exacto en el calendario
    const fechaInput = document.getElementById('diaEspecifico')?.value;

    if (fechaInput) {
        // Extraemos año, mes y día (evitamos problemas de huso horario separando el string)
        const [year, month, day] = fechaInput.split('-');
        
        // El mes en JavaScript empieza en 0 (Enero = 0, Diciembre = 11)
        const targetMonth = Number(month) - 1; 
        const targetDay = Number(day);

        // Buscamos el día exacto en la matriz de los 365 días
        const diaExacto = dailyResults.find(d => 
            d.date.getMonth() === targetMonth && 
            d.date.getDate() === targetDay
        );

        if (diaExacto) {
            console.log(`Graficando día específico: ${fechaInput}`);
            return diaExacto;
        }
    }

    // ========================================
    // 2. Si no hay día específico, usamos el sistema estacional (Régimen Nominal)
    // ========================================
    const estacion = document.getElementById('estacion')?.value || 'verano';
    const tipoDia = document.getElementById('tipoDia')?.value || 'semana';

    let targetMonth = 2; // Primavera
    if (estacion === 'verano') targetMonth = 5; // Junio
    if (estacion === 'otono') targetMonth = 8; // Septiembre
    if (estacion === 'invierno') targetMonth = 11; // Diciembre

    const quiereFinDeSemana = (tipoDia === 'fin_semana');

    const diaEncontrado = dailyResults.find(d => {
        const diaSemana = d.date.getDay();
        
        if (quiereFinDeSemana) {
            // Buscamos el primer Domingo del mes
            return d.date.getMonth() === targetMonth && diaSemana === 0;
        } else {
            // Buscamos el primer Miércoles del mes (libre de inercia de fin de semana)
            return d.date.getMonth() === targetMonth && diaSemana === 3;
        }
    });

    return diaEncontrado || dailyResults[0]; 
}


// ============================================
// CHARTS (Actualizado)
// ============================================
function updateCharts(selectedDay) {
    if (!selectedDay) return;

    // 🟢 Ahora graficamos el día exacto que el usuario seleccionó
    if (selectedDay.energySystem?.intervals) {
        createPowerChart('powerChart', selectedDay.energySystem.intervals);
        createBatteryChart('batteryChart', selectedDay.energySystem.intervals);
    }

    if (selectedDay.fullSimulation) {
        createIrradianceChart('irradianceChart', selectedDay.fullSimulation);
        createTemperatureChart('temperatureChart', selectedDay.fullSimulation);

    }
}


// ============================================
// SIMULACIÓN PRINCIPAL (Actualizar bloque inicial)
// ============================================
async function runSimulation() {
    try {
        const config = getConfigFromUI();
        
        // 🟢 Leemos el selector de clima
        const perfilClima = document.getElementById('climaEspecifico')?.value || 'normal';

        // 🟢 Si no hay clima cargado, O si el usuario cambió el perfil, regeneramos la matriz
        if (hourlyWeather.length === 0 || currentWeatherProfile !== perfilClima) {
            hourlyWeather = await fetchHourlyWeather(config.latitude, config.longitude, perfilClima);
            currentWeatherProfile = perfilClima;
            console.log('CLIMA APLICADO:', perfilClima);
        }

        // 🟢 FIX: Leemos físicamente la capacidad de la interfaz
        const capacidadInput = getInputValue('capacidadBateria', 50);
        const socInicialInput = getInputValue('socInicial', 50);
        
        // Evitamos que el sistema colapse si pones 0 (simulando que no hay batería)
        const capacidadReal = capacidadInput > 0 ? capacidadInput : 0.001;

        // 🟢 FIX: Inyectamos el "batteryConfig" directamente al motor de simulación anual
        yearlySimulation = simulateYear({
            ...config,
            hourlyWeather,
            annualConsumption: currentCsvData,
            batteryConfig: {
                capacityKWh: capacidadReal,
                initialSOC: socInicialInput / 100
            }
        });

        updateKPIs();

        const escenarioSeleccionado = getSelectedDay(yearlySimulation.dailyResults);
        updateCharts(escenarioSeleccionado);

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