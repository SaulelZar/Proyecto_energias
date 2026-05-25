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

export function optimizeTilt(

    config,

    {

        minTilt = 0,

        maxTilt = 60,

        step = 1

    } = {}

) {

    let bestTilt = minTilt;

    let bestEnergy = -Infinity;

    const history = [];


    for (

        let tilt = minTilt;

        tilt <= maxTilt;

        tilt += step

    ) {

        const result =

            simulateDay({

                ...config,

                panelTilt: tilt
            });


        const energy =
            result.totalEnergyKWh;


        history.push({

            tilt,

            energy
        });


        if (energy > bestEnergy) {

            bestEnergy =
                energy;

            bestTilt =
                tilt;
        }
    }


    return {

        bestTilt,

        bestEnergy,

        history
    };
}




// ============================================
// OPTIMIZAR AZIMUTH
// ============================================

export function optimizeAzimuth(

    config,

    {

        minAzimuth = 90,

        maxAzimuth = 270,

        step = 5

    } = {}

) {

    let bestAzimuth = 180;

    let bestEnergy = -Infinity;

    const history = [];


    for (

        let azimuth = minAzimuth;

        azimuth <= maxAzimuth;

        azimuth += step

    ) {

        const result =

            simulateDay({

                ...config,

                panelAzimuth: azimuth
            });


        const energy =
            result.totalEnergyKWh;


        history.push({

            azimuth,

            energy
        });


        if (energy > bestEnergy) {

            bestEnergy =
                energy;

            bestAzimuth =
                azimuth;
        }
    }


    return {

        bestAzimuth,

        bestEnergy,

        history
    };
}




// ============================================
// OPTIMIZACION CONJUNTA
// ============================================

export function optimizeOrientation(

    config,

    {

        tiltMin = 0,

        tiltMax = 60,

        tiltStep = 2,

        azimuthMin = 90,

        azimuthMax = 270,

        azimuthStep = 10

    } = {}

) {

    let bestTilt = 0;

    let bestAzimuth = 180;

    let bestEnergy = -Infinity;

    const history = [];


    for (

        let tilt = tiltMin;

        tilt <= tiltMax;

        tilt += tiltStep

    ) {

        for (

            let azimuth = azimuthMin;

            azimuth <= azimuthMax;

            azimuth += azimuthStep

        ) {

            const result =

                simulateDay({

                    ...config,

                    panelTilt: tilt,

                    panelAzimuth: azimuth
                });


            const energy =
                result.totalEnergyKWh;


            history.push({

                tilt,

                azimuth,

                energy
            });


            if (energy > bestEnergy) {

                bestEnergy =
                    energy;

                bestTilt =
                    tilt;

                bestAzimuth =
                    azimuth;
            }
        }
    }


    return {

        bestTilt,

        bestAzimuth,

        bestEnergy,

        history
    };
}