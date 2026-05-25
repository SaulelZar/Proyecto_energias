// ============================================
// main.js
// Punto de entrada principal
// ============================================




// ============================================
// IMPORTS
// ============================================

import {

    fetchHourlyWeather

} from './solar/weather.js';


import {

    simulateDay

} from './solar/simulation.js';


import {

    createBattery

} from './solar/battery.js';


import {

    simulateEnergySystem

} from './solar/energySystem.js';


import {

    createPowerChart,

    createIrradianceChart,

    createBatteryChart,

    createTemperatureChart

} from './ui/charts.js';


import {

    readCSV,

    consumptionProfile

} from './utils/csv.js';


// ============================================
// CONSUMO DEFAULT
// ============================================

const DEFAULT_CONSUMPTION = [

    0.4, 0.3, 0.3, 0.3,

    0.4, 0.6, 0.8, 1.0,

    1.2, 1.0, 0.9, 0.8,

    0.7, 0.7, 0.8, 1.0,

    1.3, 1.5, 1.7, 1.6,

    1.2, 0.9, 0.6, 0.5
];




// ============================================
// VARIABLES GLOBALES
// ============================================

let simulation = null;

let energyResults = null;

let hourlyWeather = [];




// ============================================
// CREAR BATERIA
// ============================================

function buildBattery() {

    return createBattery({

        capacityKWh: 10,

        initialSOC: 0.5
    });
}




// ============================================
// SIMULACION PRINCIPAL
// ============================================

async function runSimulation(

    hourlyConsumption =
        DEFAULT_CONSUMPTION

) {

    try {

        // ====================================
        // CLIMA
        // ====================================

        const config =
            getConfigFromUI();


        hourlyWeather =

            await fetchHourlyWeather(

                config.latitude,

                config.longitude
            );


        console.log(
            'CLIMA:',
            hourlyWeather
        );


        // ====================================
        // SIMULACION SOLAR
        // ====================================

        simulation =

            simulateDay({

                ...CONFIG,

                hourlyWeather
            });


        console.table(
            simulation.hourly
        );


        console.log(

            'Energia diaria:',

            simulation.totalEnergyKWh,

            'kWh'
        );


        // ====================================
        // BATERIA
        // ====================================

        const battery =
            buildBattery();


        // ====================================
        // SISTEMA ENERGETICO
        // ====================================

        energyResults =

            simulateEnergySystem({

                solarSimulation:
                    simulation,

                battery,

                hourlyConsumption
            });


        console.table(
            energyResults
        );


        // ====================================
        // GRAFICAS
        // ====================================

        updateCharts();

    } catch (error) {

        console.error(
            'Simulation error:',
            error
        );
    }
}


// ============================================
// LEER INPUT NUMERICO
// ============================================

function getInputValue(

    id,

    fallback = 0

) {

    const element =
        document.getElementById(id);


    if (!element) {

        return fallback;
    }


    const value =
        Number(element.value);


    return isNaN(value)
        ? fallback
        : value;
}




// ============================================
// CONFIGURACION DESDE UI
// ============================================

function getConfigFromUI() {

    return {

        latitude:
            getInputValue(
                'latitud',
                25.6866
            ),

        longitude:
            getInputValue(
                'longitud',
                -100.3161
            ),

        altitude:
            getInputValue(
                'altitud',
                540
            ),

        standardMeridian: -90,

        panelTilt:
            getInputValue(
                'inclinacion',
                25
            ),

        panelAzimuth:
            getInputValue(
                'azimut',
                180
            ),

        panelArea:
            getInputValue(
                'area',
                4
            ),

        nominalEfficiency:
            getInputValue(
                'eficiencia',
                22
            ) / 100
    };
}


// ============================================
// ACTUALIZAR GRAFICAS
// ============================================

function updateCharts() {

    createPowerChart(

        'powerChart',

        simulation
    );


    createIrradianceChart(

        'irradianceChart',

        simulation
    );


    createBatteryChart(

        'batteryChart',

        energyResults
    );


    createTemperatureChart(

        'temperatureChart',

        simulation
    );
}




// ============================================
// IMPORTACION CSV
// ============================================

function setupCSVImport() {

    const csvInput =

        document.getElementById(
            'csvInput'
        );


    if (!csvInput) {

        console.warn(
            'CSV input not found'
        );

        return;
    }


    csvInput.addEventListener(

        'change',

        async (event) => {

            const file =
                event.target.files[0];


            if (!file) return;


            try {

                // ============================
                // LEER CSV
                // ============================

                const data =

                    await readCSV(file);


                console.log(
                    'CSV:',
                    data
                );


                // ============================
                // PERFIL CONSUMO
                // ============================

                const profile =

                    consumptionProfile(
                        data
                    );


                console.log(
                    'PROFILE:',
                    profile
                );


                // ============================
                // RE-SIMULAR
                // ============================

                await runSimulation(
                    profile
                );

            } catch (error) {

                console.error(
                    'CSV error:',
                    error
                );
            }
        }
    );
}




// ============================================
// INIT APP
// ============================================

async function init() {

    console.log(
        'Inicializando simulador FV...'
    );


    setupCSVImport();

    await runSimulation();
}




// ============================================
// START
// ============================================

init();