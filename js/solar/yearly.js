// ============================================
// yearly.js
// Simulación anual - CORREGIDO Y OPTIMIZADO
// ============================================

import { simulateDay } from './simulation.js';
import { createBattery } from './battery.js';
import { simulateEnergySystem } from './energySystem.js';

function daysInYear(year) {
    return (
        (year % 4 === 0 && year % 100 !== 0) ||
        year % 400 === 0
    ) ? 366 : 365;
}

export function simulateYear({
    year = 2026,
    hourlyWeather = [],
    annualConsumption = [],
    batteryConfig = {
        capacityKWh: 10,
        initialSOC: 0.5
    },
    ...config
}) {

    const totalDays = daysInYear(year);
    const INTERVALS_PER_DAY = 96;

    const battery = createBattery(batteryConfig);

    const dailyResults = [];
    const annualResults = [];
    const monthlyEnergy = Array(12).fill(0);

    let annualEnergy = 0;
    let annualConsumptionEnergy = 0;
    let annualGridImport = 0;
    let annualGridExport = 0;
    let peakPower = 0;
    let effSum = 0;
    let effCount = 0;

    let totalBlackoutEvents = 0;
    let currentBlackoutIntervals = 0;
    let maxBlackoutIntervals = 0;
    let isCurrentlyInBlackout = false;

    // ========================================
    // 🟢 FIX 1 y 2: OPTIMIZACIÓN O(1) Y TIMEZONES
    // Agrupamos los 35,040 registros en un Diccionario (Map) usando la fecha como llave.
    // Usamos las columnas directas (year, month, day) para evitar que 'new Date(UTC)' 
    // desfase los horarios por tu zona horaria local.
    // ========================================
    const consumptionMap = new Map();

    if (annualConsumption && annualConsumption.length > 0) {
        for (const c of annualConsumption) {
            
            const cYear = Number(c.year);
            const cMonth = Number(c.month) - 1; // GenReg usa 1-12, JavaScript usa 0-11
            const cDay = Number(c.day);
            
            if (isNaN(cYear) || isNaN(cMonth) || isNaN(cDay)) continue;

            const dateKey = `${cYear}-${cMonth}-${cDay}`;
            
            // Inicializar el día con ceros si no existe
            if (!consumptionMap.has(dateKey)) {
                consumptionMap.set(dateKey, Array(INTERVALS_PER_DAY).fill(0));
            }

            const hour = Number(c.hour) || 0;
            const minutes = Number(c.minutes) || 0;
            
            // Índice del array de 96 posiciones
            const index = (hour * 4) + Math.floor(minutes / 15);

            // Extraemos la potencia (soporta el output de GenReg o de la UI)
            const powerKW = Number(c.kw) || Number(c.Demanda_kW) || 0;
            
            consumptionMap.get(dateKey)[index] = powerKW;
        }
    }

    // ========================================
    // CÁLCULO DE DÍAS METEOROLÓGICOS
    // Open-Meteo entrega usualmente 7 días (168 horas).
    // ========================================
    const weatherDaysCount = Math.floor(hourlyWeather.length / 24) || 1;

    for (let day = 0; day < totalDays; day++) {

        const date = new Date(year, 0, 1 + day);
        const currentMonth = date.getMonth();
        const currentDate = date.getDate();

        // ========================================
        // 🟢 FIX 3: EL FIN DEL "DÍA DE LA MARMOTA"
        // Extraemos las 24 horas correspondientes a este día específico.
        // Si el año supera los 7 días de pronóstico, usamos módulo (%) para ciclar el clima.
        // ========================================
        const weatherDayIndex = day % weatherDaysCount;
        const dailyWeather = hourlyWeather.slice(
            weatherDayIndex * 24, 
            (weatherDayIndex + 1) * 24
        );

        const solarDay = simulateDay({
            ...config,
            date,
            hourlyWeather: dailyWeather
        });

        // ========================================
        // RECUPERACIÓN INSTANTÁNEA DEL CONSUMO
        // ========================================
        const dateKey = `${year}-${currentMonth}-${currentDate}`;
        const dayConsumption = consumptionMap.get(dateKey) || Array(INTERVALS_PER_DAY).fill(0);

        // 🟢 FIX: Pasamos 'config' para que el motor sepa de cuánto es la reserva
        const energyDay = simulateEnergySystem({
            solarSimulation: solarDay,
            battery,
            hourlyConsumption: dayConsumption,
            config: config 
        });

        const dailyEnergy = solarDay.totalEnergyKWh;

        annualEnergy += dailyEnergy;
        monthlyEnergy[currentMonth] += dailyEnergy;

        peakPower = Math.max(peakPower, solarDay.peakPower);

        effSum += solarDay.averageEfficiency;
        effCount++;

        const len = Math.min(
            solarDay.hourly.length,
            energyDay.intervals.length
        );

        for (let i = 0; i < len; i++) {

            const s = solarDay.hourly[i];
            const e = energyDay.intervals[i];

            const timestamp = new Date(year, currentMonth, currentDate, s.hour, s.minutes);

            annualConsumptionEnergy += e.consumption || 0;
            annualGridImport += e.gridImport || 0;
            annualGridExport += e.gridExport || 0;

            if (e.unmetLoad > 0.001) {
                if (!isCurrentlyInBlackout) {
                    isCurrentlyInBlackout = true;
                    totalBlackoutEvents++; // Inicia un nuevo evento
                }
                currentBlackoutIntervals++;
                if (currentBlackoutIntervals > maxBlackoutIntervals) {
                    maxBlackoutIntervals = currentBlackoutIntervals; // Guardamos el récord
                }
            } else {
                isCurrentlyInBlackout = false;
                currentBlackoutIntervals = 0; // Se restablece la red, reiniciamos contador
            }

            annualConsumptionEnergy += e.consumption || 0;

            annualResults.push({
                timestamp,
                hour: s.hour,
                minutes: s.minutes,
                poa: s.poa,
                power: s.power,
                dni: s.dni,
                ghi: s.ghi,
                dhi: s.dhi,
                panelTemp: s.panelTemp,
                efficiency: s.efficiency,
                weatherFactor: s.weatherFactor,
                consumption: e.consumption,
                solarEnergy: e.solarEnergy,
                netEnergy: e.netEnergy,
                batterySOC: e.batterySOC,
                gridImport: e.gridImport,
                gridExport: e.gridExport
            });
        }

        dailyResults.push({
            day: day + 1,
            date,
            energy: dailyEnergy,
            peakPower: solarDay.peakPower,
            averageEfficiency: solarDay.averageEfficiency,
            fullSimulation: solarDay,
            energySystem: energyDay
        });
    }

    return {
        annualEnergy,
        annualConsumptionEnergy,
        annualGridImport,
        annualGridExport,
        averageDailyEnergy: annualEnergy / totalDays,
        averageEfficiency: effCount ? effSum / effCount : 0,
        peakPower,
        monthlyEnergy,
        dailyResults,
        annualResults,
        totalBlackoutEvents,
        maxBlackoutDurationHours: maxBlackoutIntervals * 0.25
    };
}