// ============================================
// energySystem.js
// Balance de energía y batería - CORREGIDO
// ============================================

import {
    chargeBattery,
    dischargeBattery,
    batteryEnergy
} from './battery.js';

export function simulateEnergySystem({
    solarSimulation,
    battery,
    hourlyConsumption = []
}) {

    if (!solarSimulation?.hourly) {
        throw new Error('Solar simulation inválida');
    }

    const INTERVAL_HOURS = 0.25;
    const totalIntervals = solarSimulation.hourly.length;

    if (hourlyConsumption.length !== totalIntervals) {
        hourlyConsumption = Array(totalIntervals)
            .fill(0)
            .map((_, i) => hourlyConsumption[i] ?? 0);
    }

    const results = [];

    let totalSolarEnergy = 0;
    let totalConsumption = 0;
    let totalGridImport = 0;
    let totalGridExport = 0;

    for (let i = 0; i < totalIntervals; i++) {

        const s = solarSimulation.hourly[i];
        const hour = s.hour ?? 0;
        const minutes = s.minutes ?? 0;

        const solarPowerW = Math.max(0, s.power || 0);
        
        // Generación en kWh
        const solarEnergyKWh = (solarPowerW / 1000) * INTERVAL_HOURS;

        // 🟢 FIX DE UNIDADES: Leemos la potencia en kW y la convertimos a energía (kWh)
        const consumptionKW = Math.max(0, Number(hourlyConsumption[i]) || 0);
        const consumptionKWh = consumptionKW * INTERVAL_HOURS;

        // Balance termodinámico y eléctrico correcto (kWh - kWh)
        const net = solarEnergyKWh - consumptionKWh;

        let batteryCharge = 0;
        let batteryDischarge = 0;
        let gridImport = 0;
        let gridExport = 0;

        if (net > 0) {
            batteryCharge = chargeBattery(battery, net);
            gridExport = Math.max(0, net - batteryCharge);
        } else {
            const deficit = Math.abs(net);
            batteryDischarge = dischargeBattery(battery, deficit);
            gridImport = Math.max(0, deficit - batteryDischarge);
        }

        totalSolarEnergy += solarEnergyKWh;
        totalConsumption += consumptionKWh; 
        totalGridImport += gridImport;
        totalGridExport += gridExport;

        results.push({
            interval: i,
            hour,
            minutes,
            solarPower: solarPowerW,
            solarEnergy: solarEnergyKWh,
            consumption: consumptionKWh, // Exportamos energía real
            netEnergy: net,
            batterySOC: battery.soc,
            batteryEnergy: batteryEnergy(battery),
            batteryCharge,
            batteryDischarge,
            gridImport,
            gridExport
        });
    }

    const solarCoverage =
        totalConsumption > 0
            ? ((totalConsumption - totalGridImport) / totalConsumption) * 100
            : 0;

    return {
        intervals: results,
        totalSolarEnergy,
        totalConsumption,
        totalGridImport,
        totalGridExport,
        solarCoverage
    };
}