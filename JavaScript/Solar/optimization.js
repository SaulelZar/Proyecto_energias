// ============================================
// optimization.js
// Optimización de orientación
// ============================================

import {
    simulateDay
} from './simulation.js';



// ============================================
// OPTIMIZAR TILT
// ============================================

export function optimizeTilt(config) {

    let bestTilt = 0;

    let bestEnergy = 0;


    for (let tilt = 0; tilt <= 60; tilt++) {

        const result =
            simulateDay({

                ...config,

                panelTilt: tilt
            });


        if (
            result.totalEnergyKWh >
            bestEnergy
        ) {

            bestEnergy =
                result.totalEnergyKWh;

            bestTilt = tilt;
        }
    }


    return {

        bestTilt,

        bestEnergy
    };
}



// ============================================
// OPTIMIZAR AZIMUTH
// ============================================

export function optimizeAzimuth(config) {

    let bestAzimuth = 180;

    let bestEnergy = 0;


    for (
        let azimuth = 90;
        azimuth <= 270;
        azimuth += 5
    ) {

        const result =
            simulateDay({

                ...config,

                panelAzimuth: azimuth
            });


        if (
            result.totalEnergyKWh >
            bestEnergy
        ) {

            bestEnergy =
                result.totalEnergyKWh;

            bestAzimuth = azimuth;
        }
    }


    return {

        bestAzimuth,

        bestEnergy
    };
}