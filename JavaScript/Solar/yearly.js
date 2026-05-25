// ============================================
// yearly.js
// Simulación anual
// ============================================

import {
    simulateDay
} from './simulation.js';



// ============================================
// SIMULACION ANUAL
// ============================================

export function simulateYear(config) {

    const dailyResults = [];

    let annualEnergy = 0;


    for (let day = 0; day < 365; day++) {

        const date =
            new Date(
                config.year || 2026,
                0,
                1 + day
            );


        const result =
            simulateDay({

                ...config,

                date
            });


        annualEnergy +=
            result.totalEnergyKWh;


        dailyResults.push({

            day: day + 1,

            date,

            energy:
                result.totalEnergyKWh
        });
    }


    return {

        annualEnergy,

        dailyResults
    };
}