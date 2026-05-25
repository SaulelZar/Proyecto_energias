// ============================================
// simulation.js
// Simulación temporal
// ============================================

import {

    solarPosition

} from './geometry.js';


import {

    extraterrestrialIrradiance,

    airMass,

    atmosphericTransmittance,

    directNormalIrradiance,

    globalHorizontalIrradiance,

    diffuseHorizontalIrradiance

} from './irradiance.js';


import {

    incidenceAngle,

    planeOfArrayIrradiance,

    panelTemperature,

    thermalEfficiency,

    generatedPower

} from './panel.js';


import {

    weatherAdjustment,

    windCooling

} from './weather.js';




// ============================================
// SIMULACION HORARIA
// ============================================

export function simulateDay({

    latitude,

    longitude,

    altitude = 0,

    standardMeridian,

    panelTilt,

    panelAzimuth,

    panelArea,

    nominalEfficiency,

    ambientTemperature = 25,

    hourlyWeather = [],

    date = new Date()

}) {

    const results = [];


    // ========================================
    // ACUMULADOS
    // ========================================

    let totalEnergyWh = 0;

    let peakPower = 0;

    let averageEfficiency = 0;


    // ========================================
    // LOOP HORARIO
    // ========================================

    for (let hour = 0; hour < 24; hour++) {

        // ====================================
        // CLIMA
        // ====================================

        const weatherData =
            hourlyWeather[hour] || {};


        // ====================================
        // FECHA ACTUAL
        // ====================================

        const currentDate =
            new Date(date);


        currentDate.setHours(hour);

        currentDate.setMinutes(0);

        currentDate.setSeconds(0);


        // ====================================
        // POSICION SOLAR
        // ====================================

        const position =

            solarPosition(

                currentDate,

                latitude,

                longitude,

                standardMeridian
            );


        // ====================================
        // SOL BAJO HORIZONTE
        // ====================================

        if (position.elevation <= 0) {

            results.push({

                hour,

                elevation:
                    position.elevation,

                azimuth:
                    position.azimuth,

                zenith:
                    position.zenith,

                dni: 0,

                ghi: 0,

                dhi: 0,

                poa: 0,

                power: 0,

                efficiency: 0,

                panelTemp:
                    ambientTemperature
            });

            continue;
        }


        // ====================================
        // IRRADIANCIA EXTRATERRESTRE
        // ====================================

        const extraterrestrial =

            extraterrestrialIrradiance(

                position.dayOfYear
            );


        // ====================================
        // AIR MASS
        // ====================================

        const am =
            airMass(
                position.zenith
            );


        // ====================================
        // TRANSMITANCIA
        // ====================================

        const transmittance =

            atmosphericTransmittance(

                am,

                altitude
            );


        // ====================================
        // DNI
        // ====================================

        const dni =

            directNormalIrradiance(

                extraterrestrial,

                transmittance
            );


        // ====================================
        // GHI
        // ====================================

        const ghi =

            globalHorizontalIrradiance(

                dni,

                position.zenith
            );


        // ====================================
        // DHI
        // ====================================

        const dhi =
            diffuseHorizontalIrradiance(
                ghi
            );


        // ====================================
        // AJUSTE CLIMATICO
        // ====================================

        const weatherFactor =

            weatherAdjustment(
                weatherData
            );


        const correctedDNI =
            dni * weatherFactor;

        const correctedGHI =
            ghi * weatherFactor;

        const correctedDHI =
            dhi * weatherFactor;


        // ====================================
        // ANGULO INCIDENCIA
        // ====================================

        const incidence =

            incidenceAngle(

                position.zenith,

                position.azimuth,

                panelTilt,

                panelAzimuth
            );


        // ====================================
        // POA
        // ====================================

        const poa =

            planeOfArrayIrradiance(

                correctedDNI,

                correctedDHI,

                correctedGHI,

                incidence,

                panelTilt
            );


        // ====================================
        // TEMPERATURA PANEL
        // ====================================

        const ambient =

            weatherData.temperature
            ??
            ambientTemperature;


        let panelTemp =

            panelTemperature(

                ambient,

                poa
            );


        // ====================================
        // ENFRIAMIENTO VIENTO
        // ====================================

        panelTemp =

            windCooling(

                panelTemp,

                weatherData.windSpeed || 0
            );


        // ====================================
        // EFICIENCIA
        // ====================================

        const efficiency =

            thermalEfficiency(

                nominalEfficiency,

                panelTemp
            );


        // ====================================
        // POTENCIA
        // ====================================

        const power =

            generatedPower(

                poa,

                panelArea,

                efficiency
            );


        // ====================================
        // ACUMULADOS
        // ====================================

        totalEnergyWh += power;

        peakPower =
            Math.max(
                peakPower,
                power
            );

        averageEfficiency +=
            efficiency;


        // ====================================
        // RESULTADOS
        // ====================================

        results.push({

            hour,

            elevation:
                position.elevation,

            azimuth:
                position.azimuth,

            zenith:
                position.zenith,

            dni:
                correctedDNI,

            ghi:
                correctedGHI,

            dhi:
                correctedDHI,

            poa,

            power,

            efficiency,

            panelTemp,

            weatherFactor
        });
    }


    // ========================================
    // PROMEDIOS
    // ========================================

    averageEfficiency /=
        24;


    // ========================================
    // RESULTADOS FINALES
    // ========================================

    return {

        hourly: results,

        totalEnergyWh,

        totalEnergyKWh:
            totalEnergyWh / 1000,

        peakPower,

        averageEfficiency
    };
}