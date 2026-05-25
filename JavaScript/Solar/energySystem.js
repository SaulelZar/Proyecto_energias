// ============================================
// energySystem.js
// Sistema energético completo
// ============================================

import {

    chargeBattery,

    dischargeBattery,

    batteryEnergy

} from './battery.js';




// ============================================
// SIMULACION ENERGETICA
// ============================================

export function simulateEnergySystem({

    solarSimulation,

    battery,

    hourlyConsumption

}) {

    const results = [];


    for (let hour = 0; hour < 24; hour++) {

        const solarPower =
            solarSimulation.hourly[hour].power || 0;


        // W -> kWh por hora
        const solarEnergy =
            solarPower / 1000;


        const consumption =
            hourlyConsumption[hour] || 0;


        let batteryCharge = 0;

        let batteryDischarge = 0;

        let gridImport = 0;

        let gridExport = 0;


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
                    netEnergy - batteryCharge
                );
        }


        // ====================================
        // DEFICIT
        // ====================================

        else {

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
                    deficit - batteryDischarge
                );
        }


        results.push({

            hour,

            solarEnergy,

            consumption,

            batterySOC:
                battery.soc,

            batteryEnergy:
                batteryEnergy(battery),

            batteryCharge,

            batteryDischarge,

            gridImport,

            gridExport
        });
    }


    return results;
}