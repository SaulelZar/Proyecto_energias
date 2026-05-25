// ============================================
// yearly.js
// Simulación anual
// ============================================

import {

    simulateDay

} from './simulation.js';




// ============================================
// DIAS DEL AÑO
// ============================================

function daysInYear(year) {

    const isLeapYear =

        (
            year % 4 === 0 &&
            year % 100 !== 0
        )

        ||

        year % 400 === 0;


    return isLeapYear
        ? 366
        : 365;
}




// ============================================
// SIMULACION ANUAL
// ============================================

export function simulateYear(

    config

) {

    const year =
        config.year || 2026;


    const totalDays =
        daysInYear(year);


    const dailyResults = [];

    const monthlyEnergy =
        Array(12).fill(0);


    // ========================================
    // ACUMULADOS
    // ========================================

    let annualEnergy = 0;

    let peakDayEnergy = 0;

    let minimumDayEnergy =
        Infinity;


    // ========================================
    // LOOP ANUAL
    // ========================================

    for (

        let day = 0;

        day < totalDays;

        day++

    ) {

        const date =

            new Date(

                year,

                0,

                1 + day
            );


        // ====================================
        // SIMULACION DIARIA
        // ====================================

        const result =

            simulateDay({

                ...config,

                date
            });


        const dailyEnergy =
            result.totalEnergyKWh;


        // ====================================
        // ACUMULADOS
        // ====================================

        annualEnergy +=
            dailyEnergy;


        peakDayEnergy =

            Math.max(

                peakDayEnergy,

                dailyEnergy
            );


        minimumDayEnergy =

            Math.min(

                minimumDayEnergy,

                dailyEnergy
            );


        // ====================================
        // ACUMULADO MENSUAL
        // ====================================

        monthlyEnergy[
            date.getMonth()
        ] += dailyEnergy;


        // ====================================
        // RESULTADOS DIARIOS
        // ====================================

        dailyResults.push({

            day: day + 1,

            date,

            energy:
                dailyEnergy,

            peakPower:
                result.peakPower,

            averageEfficiency:
                result.averageEfficiency
        });
    }


    // ========================================
    // PROMEDIOS
    // ========================================

    const averageDailyEnergy =

        annualEnergy /
        totalDays;


    // ========================================
    // RESULTADOS FINALES
    // ========================================

    return {

        annualEnergy,

        averageDailyEnergy,

        peakDayEnergy,

        minimumDayEnergy,

        monthlyEnergy,

        dailyResults
    };
}