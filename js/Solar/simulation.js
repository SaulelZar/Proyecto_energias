// ============================================
// simulation.js
// Simulación temporal - CORREGIDA
// ============================================

import { solarPosition } from './geometry.js';

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

// 🟢 FIX: Importar el modelo de pérdidas AC/DC
import { systemLosses, netACPower } from './system.js';


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

    const results = [];
    const INTERVALS_PER_HOUR = 4;
    const TOTAL_INTERVALS = 24 * INTERVALS_PER_HOUR;
    const INTERVAL_HOURS = 0.25;

    let totalEnergyWh = 0;
    let peakPower = 0;
    let efficiencyAccumulator = 0;
    let efficiencySamples = 0;

    for (let interval = 0; interval < TOTAL_INTERVALS; interval++) {

        const hour = Math.floor(interval / INTERVALS_PER_HOUR);
        const minutes = (interval % INTERVALS_PER_HOUR) * 15;
        const weatherData = hourlyWeather[hour] || {};

        const currentDate = new Date(date);
        currentDate.setHours(hour, minutes, 0, 0);

        const position = solarPosition(
            currentDate,
            latitude,
            longitude,
            standardMeridian
        );

        if (position.elevation <= 0 || position.zenith >= 90) {
            results.push({
                interval, hour, minutes,
                elevation: position.elevation, azimuth: position.azimuth, zenith: position.zenith,
                dni: 0, ghi: 0, dhi: 0, poa: 0, power: 0, energy: 0, efficiency: 0,
                panelTemp: ambientTemperature, weatherFactor: 0
            });
            continue;
        }

        const extraterrestrial = extraterrestrialIrradiance(position.dayOfYear);
        const am = airMass(position.zenith);

        if (!isFinite(am) || am <= 0) continue;

        const transmittance = atmosphericTransmittance(am, altitude);
        let dni = directNormalIrradiance(extraterrestrial, transmittance);
        let ghi = globalHorizontalIrradiance(dni, position.zenith);

        // 🟢 FIX: Pasar los 3 parámetros evita el error de sobrestimación de radiación
        let dhi = diffuseHorizontalIrradiance(ghi, dni, position.zenith);

        const weatherFactor = weatherAdjustment(weatherData);
        dni = Math.max(0, dni * weatherFactor);
        ghi = Math.max(0, ghi * weatherFactor);
        dhi = Math.max(0, dhi * weatherFactor);

        const incidence = incidenceAngle(
            position.zenith, position.azimuth, panelTilt, panelAzimuth
        );

        let poa = planeOfArrayIrradiance(dni, dhi, ghi, incidence, panelTilt);
        poa = Math.max(0, poa);

        const ambient = weatherData.temperature ?? ambientTemperature;
        let panelTemp = panelTemperature(ambient, poa);
        panelTemp = windCooling(panelTemp, weatherData.windSpeed || 0);

        let efficiency = thermalEfficiency(nominalEfficiency, panelTemp);
        efficiency = Math.max(0, Math.min(efficiency, nominalEfficiency * 1.05));

        // 🟢 FIX: Potencia DC convertida a AC aplicando las pérdidas físicas del sistema
        let powerDC = generatedPower(poa, panelArea, efficiency);
        const losses = systemLosses({
            soiling: 0.98,
            inverter: 0.96,
            wiring: 0.98,
            mismatch: 0.99
        });
        
        let power = netACPower(powerDC, losses);

        const energy = (power / 1000) * INTERVAL_HOURS;
        totalEnergyWh += power * INTERVAL_HOURS;
        peakPower = Math.max(peakPower, power);

        efficiencyAccumulator += efficiency;
        efficiencySamples++;

        results.push({
            interval, hour, minutes,
            elevation: position.elevation, azimuth: position.azimuth, zenith: position.zenith,
            dni, ghi, dhi, poa, power, energy,
            efficiency, panelTemp, weatherFactor
        });
    }

    const averageEfficiency = efficiencySamples > 0 ? efficiencyAccumulator / efficiencySamples : 0;

    return {
        hourly: results,
        totalEnergyWh,
        totalEnergyKWh: totalEnergyWh / 1000,
        peakPower,
        averageEfficiency
    };
}