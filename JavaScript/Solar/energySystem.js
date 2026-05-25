// ============================================
// energySystem.js
// Sistema energético completo
// ============================================

import {

    chargeBattery,

    dischargeBattery,

    batteryEnergy,

    batterySOCPercent

} from './battery.js';




// ============================================
// SIMULACION ENERGETICA
// ============================================

export function simulateEnergySystem({

    solarSimulation,

    battery,

    hourlyConsumption = []

}) {

    // ========================================
    // VALIDACIONES
    // ========================================

    if (!solarSimulation?.hourly) {

        throw new Error(
            'Invalid solar simulation'
        );
    }


    const results = [];


    // ========================================
    // ACUMULADOS
    // ========================================

    let totalSolarEnergy = 0;

    let totalConsumption = 0;

    let totalGridImport = 0;

    let totalGridExport = 0;

    let totalBatteryCharge = 0;

    let totalBatteryDischarge = 0;


    // ========================================
    // LOOP HORARIO
    // ========================================

    for (let hour = 0; hour < 24; hour++) {

        // ====================================
        // PRODUCCION SOLAR
        // ====================================

        const solarPower =

            solarSimulation
            .hourly[hour]
            ?.power || 0;


        // W -> kWh
        const solarEnergy =
            solarPower / 1000;


        // ====================================
        // CONSUMO
        // ====================================

        const consumption =
            hourlyConsumption[hour] || 0;


        // ====================================
        // VARIABLES
        // ====================================

        let batteryCharge = 0;

        let batteryDischarge = 0;

        let gridImport = 0;

        let gridExport = 0;


        // ====================================
        // BALANCE ENERGETICO
        // ====================================

        const netEnergy =
            solarEnergy - consumption;


        // ====================================
        // EXCESO SOLAR
        // ====================================

        if (netEnergy > 0) {

            batteryCharge =
                chargeBattery(

                    battery,

                    netEnergy
                );


            gridExport =
                Math.max(

                    0,

                    netEnergy -
                    batteryCharge
                );
        }


        // ====================================
        // DEFICIT
        // ====================================

        else if (netEnergy < 0) {

            const deficit =
                Math.abs(netEnergy);


            batteryDischarge =
                dischargeBattery(

                    battery,

                    deficit
                );


            gridImport =
                Math.max(

                    0,

                    deficit -
                    batteryDischarge
                );
        }


        // ====================================
        // ACUMULADOS
        // ====================================

        totalSolarEnergy +=
            solarEnergy;

        totalConsumption +=
            consumption;

        totalGridImport +=
            gridImport;

        totalGridExport +=
            gridExport;

        totalBatteryCharge +=
            batteryCharge;

        totalBatteryDischarge +=
            batteryDischarge;


        // ====================================
        // RESULTADOS HORARIOS
        // ====================================

        results.push({

            hour,

            solarEnergy,

            consumption,

            netEnergy,

            batterySOC:
                battery.soc,

            batterySOCPercent:
                batterySOCPercent(
                    battery
                ),

            batteryEnergy:
                batteryEnergy(
                    battery
                ),

            batteryCharge,

            batteryDischarge,

            gridImport,

            gridExport
        });
    }


    // ========================================
    // RESULTADOS FINALES
    // ========================================

    return {

        hourly: results,

        summary: {

            totalSolarEnergy,

            totalConsumption,

            totalGridImport,

            totalGridExport,

            totalBatteryCharge,

            totalBatteryDischarge,

            selfConsumptionRatio:

                totalConsumption > 0

                ?

                (
                    1 -
                    totalGridImport /
                    totalConsumption
                )

                :

                0
        }
    };
}