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
    const weatherFactor =
    weatherAdjustment(weatherData);

    const results = [];

    let totalEnergyWh = 0;


    for (let hour = 0; hour < 24; hour++) {

        const weatherData =
            hourlyWeather[hour] || null;

        const currentDate = new Date(date);

        currentDate.setHours(hour);

        currentDate.setMinutes(0);

        currentDate.setSeconds(0);


        // ====================================
        // POSICION SOLAR
        // ====================================

        const position = solarPosition(

            currentDate,

            latitude,

            longitude,

            standardMeridian
        );


        // Sol debajo del horizonte
        if (position.elevation <= 0) {

            results.push({

                hour,

                power: 0,

                poa: 0,

                elevation: position.elevation
            });

            continue;
        }


        // ====================================
        // IRRADIANCIA
        // ====================================

        const extraterrestrial =
            extraterrestrialIrradiance(
                position.dayOfYear
            );


        const am =
            airMass(position.zenith);


        const transmittance =
            atmosphericTransmittance(
                am,
                altitude
            );


        // ====================================
        // IRRADIANCIA BASE
        // ====================================

        const dni =
            directNormalIrradiance(
                extraterrestrial,
                transmittance
            );

        const ghi =
            globalHorizontalIrradiance(
                dni,
                position.zenith
            );

        const dhi =
            diffuseHorizontalIrradiance(
                ghi,
                dni,
                position.zenith
            );



        // ====================================
        // AJUSTE CLIMATICO
        // ====================================

        let correctedDNI = dni;

        let correctedGHI = ghi;

        let correctedDHI = dhi;


        if (weatherData) {

            const weatherFactor =
                weatherAdjustment(weatherData);

            correctedDNI =
                dni * weatherFactor;

            correctedGHI =
                ghi * weatherFactor;

            correctedDHI =
                dhi * weatherFactor;
        }

        // ====================================
        // PANEL
        // ====================================

        const incidence =
            incidenceAngle(

                position.zenith,

                position.azimuth,

                panelTilt,

                panelAzimuth
            );


        const poa =
        planeOfArrayIrradiance(

            correctedDNI,

            correctedDHI,

            correctedGHI,

            incidence,

            panelTilt
        );


        // ====================================
        // TEMPERATURA
        // ====================================

        let panelTemp =
            panelTemperature(

                ambientTemperature,

                poa
            );



        // ====================================
        // ENFRIAMIENTO POR VIENTO
        // ====================================

        if (weatherData) {

            panelTemp =
                windCooling(

                    panelTemp,

                    weatherData.windSpeed || 0
                );
        }


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


        totalEnergyWh += power;


        results.push({

            hour,

            elevation: position.elevation,

            azimuth: position.azimuth,

            zenith: position.zenith,

            poa,

            power,

            efficiency,

            panelTemp
        });
    }


    return {

        hourly: results,

        totalEnergyWh,

        totalEnergyKWh:
            totalEnergyWh / 1000
    };
}