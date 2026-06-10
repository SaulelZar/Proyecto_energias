// ============================================
// energySystem.js
// Balance de energía, Microrred y Cargas Parásitas
// ============================================

import {
    chargeBattery,
    dischargeBattery,
    batteryEnergy
} from './battery.js';

export function simulateEnergySystem({
    solarSimulation,
    battery,
    hourlyConsumption = [],
    config = {} // 🟢 Recibimos la configuración global
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
    let totalUnmetLoad = 0;

    // 🟢 PARÁMETROS DE INTELIGENCIA DE RED (UPS)
    const reserveSOC = Number(config.reservaRespaldo) || 0;
    const gridReliability = (Number(config.fallaRed) ?? 100) / 100;
    const reserveEnergyKWh = (reserveSOC / 100) * battery.capacityKWh;

    for (let i = 0; i < totalIntervals; i++) {

        const s = solarSimulation.hourly[i];
        const hour = s.hour ?? 0;
        const minutes = s.minutes ?? 0;

        // 1. Lectura de Potencia (Solar, Enfriamiento y Motores)
        const solarPowerW = Math.max(0, s.power || 0);
        const coolingPowerW = Math.max(0, s.coolingPower || 0); 
        const trackingPowerW = Math.max(0, s.trackingPower || 0); // 🟢 Leemos los motores

        // 2. Conversión de Potencia (W) a Energía (kWh)
        const solarEnergyKWh = (solarPowerW / 1000) * INTERVAL_HOURS;
        const coolingEnergyKWh = (coolingPowerW / 1000) * INTERVAL_HOURS;
        const trackingEnergyKWh = (trackingPowerW / 1000) * INTERVAL_HOURS; // 🟢 kWh de motores

        // 3. Balance de Demanda
        const consumptionKW = Math.max(0, Number(hourlyConsumption[i]) || 0);
        
        // 🟢 FÍSICA APLICADA: La fábrica ahora paga la demanda + Bombas de Agua + Motores del Tracker
        const totalConsumptionKWh = (consumptionKW * INTERVAL_HOURS) + coolingEnergyKWh + trackingEnergyKWh;

        const net = solarEnergyKWh - totalConsumptionKWh;

        let batteryCharge = 0;
        let batteryDischarge = 0;
        let gridImport = 0;
        let gridExport = 0;
        let unmetLoad = 0;

        // 🎲 Tirar los dados: ¿Hay un apagón en este intervalo?
        const isGridAvailable = Math.random() < gridReliability;

        if (net > 0) {
            // ==========================================
            // EXCESO DE SOL
            // ==========================================
            batteryCharge = chargeBattery(battery, net);
            
            // Si la red está caída, no podemos exportar la energía sobrante
            gridExport = isGridAvailable ? Math.max(0, net - batteryCharge) : 0;
            
        } else {
            // ==========================================
            // DÉFICIT DE ENERGÍA (Fábrica + Bombas piden más que el sol)
            // ==========================================
            const deficit = Math.abs(net);
            const currentEnergy = batteryEnergy(battery);

            if (isGridAvailable) {
                // 🔵 MODO NORMAL (Peak Shaving) - Respetar la barda del UPS
                const availableForShaving = Math.max(0, currentEnergy - reserveEnergyKWh);
                const requestedDischarge = Math.min(deficit, availableForShaving);
                
                batteryDischarge = dischargeBattery(battery, requestedDischarge);
                gridImport = Math.max(0, deficit - batteryDischarge);
                
            } else {
                // 🔴 MODO ISLA (Apagón) - Ignorar reserva, salvar la planta
                const absoluteMinEnergy = battery.capacityKWh * battery.minSOC;
                const emergencyAvailable = Math.max(0, currentEnergy - absoluteMinEnergy);
                const requestedDischarge = Math.min(deficit, emergencyAvailable);
                
                batteryDischarge = dischargeBattery(battery, requestedDischarge);
                
                // Si la batería no alcanzó a cubrir todo y no hay CFE, hay un apagón parcial
                unmetLoad = Math.max(0, deficit - batteryDischarge);
                gridImport = 0; 
            }
        }

        totalSolarEnergy += solarEnergyKWh;
        totalConsumption += totalConsumptionKWh; 
        totalGridImport += gridImport;
        totalGridExport += gridExport;
        totalUnmetLoad += unmetLoad;

        results.push({
            interval: i,
            hour,
            minutes,
            solarPower: solarPowerW,
            solarEnergy: solarEnergyKWh,
            coolingPower: coolingPowerW, 
            consumption: totalConsumptionKWh, // Exporta la suma total para la gráfica roja
            netEnergy: net,
            batterySOC: battery.soc,
            batteryEnergy: batteryEnergy(battery),
            batteryCharge,
            batteryDischarge,
            gridImport,
            gridExport,
            unmetLoad,
            isGridAvailable
        });
    }

    const solarCoverage = totalConsumption > 0
        ? ((totalConsumption - totalGridImport) / totalConsumption) * 100
        : 0;

    return {
        intervals: results,
        totalSolarEnergy,
        totalConsumption,
        totalGridImport,
        totalGridExport,
        totalUnmetLoad,
        solarCoverage
    };
}