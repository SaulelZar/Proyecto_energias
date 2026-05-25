// ============================================
// IMPORTS
// ============================================

import {

    solarPosition

} from './solar/geometry.js';


import {

    extraterrestrialIrradiance,

    airMass,

    atmosphericTransmittance,

    directNormalIrradiance,

    globalHorizontalIrradiance,

    diffuseHorizontalIrradiance

} from './solar/irradiance.js';


import {

    incidenceAngle,

    planeOfArrayIrradiance,

    panelTemperature,

    thermalEfficiency,

    generatedPower

} from './solar/panel.js';


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

    createBatteryChart

} from './ui/charts.js';


import {

    readCSV,

    consumptionProfile

} from './utils/csv.js';




// ============================================
// CONFIGURACION GENERAL
// ============================================

const LATITUDE = 25.6866;

const LONGITUDE = -100.3161;

const ALTITUDE = 540;

const STANDARD_MERIDIAN = -90;



// ============================================
// CLIMA HORARIO
// ============================================

const hourlyWeather =
    await fetchHourlyWeather(

        LATITUDE,

        LONGITUDE
    );



console.log(
    'CLIMA:',
    hourlyWeather
);




// ============================================
// SIMULACION SOLAR
// ============================================

const simulation =
    simulateDay({

        latitude: LATITUDE,

        longitude: LONGITUDE,

        altitude: ALTITUDE,

        standardMeridian:
            STANDARD_MERIDIAN,

        panelTilt: 25,

        panelAzimuth: 180,

        panelArea: 4,

        nominalEfficiency: 0.22,

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




// ============================================
// BATERIA
// ============================================

const battery =
    createBattery({

        capacityKWh: 10,

        initialSOC: 0.5
    });




// ============================================
// CONSUMO DEFAULT
// ============================================

const hourlyConsumption = [

    0.4, 0.3, 0.3, 0.3,

    0.4, 0.6, 0.8, 1.0,

    1.2, 1.0, 0.9, 0.8,

    0.7, 0.7, 0.8, 1.0,

    1.3, 1.5, 1.7, 1.6,

    1.2, 0.9, 0.6, 0.5
];




// ============================================
// SIMULACION ENERGETICA
// ============================================

let energyResults =
    simulateEnergySystem({

        solarSimulation:
            simulation,

        battery,

        hourlyConsumption
    });



console.table(
    energyResults
);




// ============================================
// GRAFICAS
// ============================================

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




// ============================================
// IMPORTACION CSV
// ============================================

const csvInput =
    document.getElementById(
        'csvInput'
    );



csvInput.addEventListener(

    'change',

    async (event) => {

        const file =
            event.target.files[0];


        if (!file) return;


        try {

            // ================================
            // LEER CSV
            // ================================

            const data =
                await readCSV(file);


            console.log(
                'CSV IMPORTADO:',
                data
            );


            // ================================
            // PERFIL DE CONSUMO
            // ================================

            const profile =
                consumptionProfile(
                    data
                );


            console.log(
                'PERFIL:',
                profile
            );


            // ================================
            // REINICIAR BATERIA
            // ================================

            const updatedBattery =
                createBattery({

                    capacityKWh: 10,

                    initialSOC: 0.5
                });


            // ================================
            // NUEVA SIMULACION
            // ================================

            energyResults =
                simulateEnergySystem({

                    solarSimulation:
                        simulation,

                    battery:
                        updatedBattery,

                    hourlyConsumption:
                        profile
                });


            console.table(
                energyResults
            );


            // ================================
            // ACTUALIZAR GRAFICA
            // ================================

            createBatteryChart(

                'batteryChart',

                energyResults
            );

        } catch (error) {

            console.error(error);
        }
    }
);