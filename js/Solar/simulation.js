// ============================================
// simulation.js
// Simulación temporal (CORREGIDA Y OPTIMIZADA)
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
    generatedPower,
    calculateTracking
} from './panel.js';

import {
    weatherAdjustment,
    windCooling
} from './weather.js';


// ============================================
// SIMULACIÓN DIARIA
// ============================================

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
    date = new Date(),
    ...config // 🟢 Capturamos config (tracking, bifaciality, inverterAC)
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
        
        // 🟢 Temperatura ambiente extraída una sola vez para TODO el intervalo
        const ambient = weatherData.temperature ?? ambientTemperature;

        const currentDate = new Date(date);
        currentDate.setHours(hour, minutes, 0, 0);

        const position = solarPosition(
            currentDate,
            latitude,
            longitude,
            standardMeridian
        );

        // ========================================
        // NOCHE
        // ========================================

        if (position.elevation <= 0 || position.zenith >= 90) {

            let nightTemp = windCooling(ambient, weatherData.windSpeed || 0);

            results.push({
                interval,
                hour,
                minutes,
                elevation: position.elevation,
                azimuth: position.azimuth,
                zenith: position.zenith,

                dni: 0,
                ghi: 0,
                dhi: 0,
                poa: 0,
                power: 0,
                energy: 0,
                efficiency: 0,

                panelTemp: nightTemp, 
                weatherFactor: 0
            });

            continue;
        }

        // ========================================
        // IRRADIANCIA BASE
        // ========================================

        const extraterrestrial = extraterrestrialIrradiance(position.dayOfYear);
        const am = airMass(position.zenith);

        if (!isFinite(am) || am <= 0) {
            continue;
        }

        const transmittance = atmosphericTransmittance(am, altitude);
        let dni = directNormalIrradiance(extraterrestrial, transmittance);
        let ghi = globalHorizontalIrradiance(dni, position.zenith);
        let dhi = diffuseHorizontalIrradiance(ghi);

        // ========================================
        // CLIMA Y ÓPTICA ATMOSFÉRICA
        // ========================================

        const cCover = weatherData.cloudCover || 0;
        const weatherFactor = weatherAdjustment(weatherData);

        const dniCloudFactor = Math.max(0, 1 - (cCover / 70)); 
        
        dni = Math.max(0, dni * dniCloudFactor);
        ghi = Math.max(0, ghi * weatherFactor);

        const radZenith = position.zenith * (Math.PI / 180);
        dhi = Math.max(0, ghi - (dni * Math.cos(radZenith)));
        
        // ========================================
        // POA Y TRACKING
        // ========================================
        
        const tracker = calculateTracking(
            config.tracking || 'fixed', 
            position.zenith, 
            position.azimuth, 
            panelTilt, 
            panelAzimuth
        );

        const incidence = incidenceAngle(
            position.zenith, position.azimuth, 
            tracker.tilt, tracker.azimuth
        );

        let poa = planeOfArrayIrradiance(
            dni, dhi, ghi, incidence, tracker.tilt, 0.2, config.bifaciality || 0
        );

        poa = Math.max(0, poa);

        // ========================================
        // TEMPERATURA
        // ========================================
        
        // 🟢 FIX: Eliminamos la redeclaración de "ambient" aquí. Usamos la de arriba.
        let panelTemp = panelTemperature(ambient, poa);
        panelTemp = windCooling(panelTemp, weatherData.windSpeed || 0);

        // ========================================
        // EFICIENCIA
        // ========================================
        
        let efficiency = thermalEfficiency(nominalEfficiency, panelTemp);
        efficiency = Math.max(0, Math.min(efficiency, nominalEfficiency * 1.05));

        // ========================================
        // POTENCIA DC Y CLIPPING AC
        // ========================================
        
        let powerDC = generatedPower(poa, panelArea, efficiency);
        powerDC = Math.max(0, powerDC);

        let powerAC = powerDC;
        if (config.inverterAC > 0) {
            const limiteWatts = config.inverterAC * 1000; 
            powerAC = Math.min(powerDC, limiteWatts);
        }

        const energy = (powerAC / 1000) * INTERVAL_HOURS;
        totalEnergyWh += powerAC * INTERVAL_HOURS;
        peakPower = Math.max(peakPower, powerAC);

        efficiencyAccumulator += efficiency;
        efficiencySamples++;

        // ========================================
        // RESULTADO
        // ========================================

        results.push({
            interval,
            hour,
            minutes,

            elevation: position.elevation,
            azimuth: position.azimuth,
            zenith: position.zenith,

            dni,
            ghi,
            dhi,
            poa,

            // 🟢 FIX: Guardamos powerAC, que ya trae el recorte del inversor aplicado
            power: powerAC,
            energy: energy,

            efficiency,
            panelTemp,
            weatherFactor
        });
    }

    const averageEfficiency =
        efficiencySamples > 0
            ? efficiencyAccumulator / efficiencySamples
            : 0;

    return {
        hourly: results,
        totalEnergyWh,
        totalEnergyKWh: totalEnergyWh / 1000,
        peakPower,
        averageEfficiency
    };
}