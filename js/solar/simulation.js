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
// FÍSICA TERMODINÁMICA DEL MÓDULO (Modelo NOCT / Faiman)
// ============================================
export function calcularEficienciaTermica(tAmb, ghi, windSpeed) {
    // 1. Parámetros de un módulo moderno (Ej. Tier 1 Mono PERC)
    const NOCT = 45;      // Nominal Operating Cell Temperature (°C)
    const beta = 0.0035;  // Coeficiente de temperatura de potencia (0.35% / °C)
    const tRef = 25;      // Temperatura STC (Standard Test Conditions)

    // Si es de noche, el panel no se calienta por radiación y no genera
    if (ghi <= 0) return 1.0;

    // 2. Ecuación NOCT: Calentamiento base por Irradiancia
    // A 800 W/m2 el panel alcanza la temperatura NOCT (45°C) si T_amb es 20°C
    let tCelda = tAmb + ((NOCT - 20) / 800) * ghi;

    // 3. Convección Forzada: El viento enfría el módulo
    // Restamos temperatura empíricamente basada en la velocidad del viento (m/s)
    const factorEnfriamientoViento = windSpeed * 1.5; 
    
    // El viento no puede enfriar el panel por debajo de la temperatura ambiente
    tCelda = Math.max(tAmb, tCelda - factorEnfriamientoViento);

    // 4. Rendimiento Térmico Final
    // 1.0 = 100% (STC). Si T_celda > 25, será menor a 1. Si T_celda < 25 (invierno), será mayor a 1!
    let factorEficiencia = 1 - (beta * (tCelda - tRef));

    // Limitamos matemáticamente (Max 15% de ganancia en frío extremo, max 40% pérdida en fuego)
    return Math.max(0.60, Math.min(1.15, factorEficiencia));
}

// ============================================
// SIMULACIÓN DIARIA (MOTOR FÍSICO Y TERMODINÁMICO)
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
    ...config 
}) {

    const results = [];
    const INTERVALS_PER_HOUR = 4;
    const TOTAL_INTERVALS = 24 * INTERVALS_PER_HOUR;
    const INTERVAL_HOURS = 0.25;

    let totalEnergyWh = 0;
    let peakPower = 0;
    let efficiencyAccumulator = 0;
    let efficiencySamples = 0;

    // 🟢 Memoria térmica
    let lastPanelTemp = null; 

    for (let interval = 0; interval < TOTAL_INTERVALS; interval++) {
        const hour = Math.floor(interval / INTERVALS_PER_HOUR);
        const minutes = (interval % INTERVALS_PER_HOUR) * 15;

        // ========================================
        // INTERPOLACIÓN CLIMÁTICA
        // ========================================
        const currentW = hourlyWeather[hour] || {};
        const nextW = hourlyWeather[hour + 1] || currentW; 
        
        const fraction = minutes / 60; 

        const ambient = (currentW.temperature ?? ambientTemperature) * (1 - fraction) + 
                        (nextW.temperature ?? ambientTemperature) * fraction;
        
        const windSpeed = (currentW.windSpeed || 0) * (1 - fraction) + 
                          (nextW.windSpeed || 0) * fraction;
                          
        const cCover = (currentW.cloudCover || 0) * (1 - fraction) + 
                       (nextW.cloudCover || 0) * fraction;
                       
        const humidity = (currentW.humidity || 50) * (1 - fraction) + 
                         (nextW.humidity || 50) * fraction;

        const currentDate = new Date(date);
        currentDate.setHours(hour, minutes, 0, 0);

        const position = solarPosition(currentDate, latitude, longitude, standardMeridian);

        // ========================================
        // NOCHE (Solo Enfriamiento)
        // ========================================
        if (position.elevation <= 0 || position.zenith >= 90) {
            let nightTemp = windCooling(ambient, windSpeed);
            
            if (lastPanelTemp !== null) {
                nightTemp = panelTemperature(ambient, 0, windSpeed, nominalEfficiency, config.coolingType, lastPanelTemp, INTERVAL_HOURS);
            }

            results.push({
                interval, hour, minutes,
                elevation: position.elevation, azimuth: position.azimuth, zenith: position.zenith,
                dni: 0, ghi: 0, dhi: 0, poa: 0, power: 0, coolingPower: 0, trackingPower: 0, energy: 0, efficiency: 0,
                panelTemp: nightTemp, weatherFactor: 0
            });
            
            lastPanelTemp = nightTemp; 
            continue;
        }

        // ========================================
        // IRRADIANCIA BASE (REAL TMYx VS GEOMÉTRICA)
        // ========================================
        let dni = 0;
        let ghi = 0;
        let dhi = 0;
        let weatherFactor = Math.max(0, 1 - (cCover / 100));

        if (currentW.ghi !== undefined && currentW.ghi !== null) {
            dni = currentW.dni;
            ghi = currentW.ghi;
            dhi = currentW.dhi;
        } else {
            const extraterrestrial = extraterrestrialIrradiance(position.dayOfYear);
            const am = airMass(position.zenith);
            
            if (isFinite(am) && am > 0) {
                const transmittance = atmosphericTransmittance(am, altitude);
                dni = directNormalIrradiance(extraterrestrial, transmittance);
                ghi = globalHorizontalIrradiance(dni, position.zenith);
                dhi = diffuseHorizontalIrradiance(ghi);

                const waterVaporFactor = 1 - (humidity * 0.0005);
                dni *= waterVaporFactor;
                ghi *= waterVaporFactor;

                const cloudOpacity = cCover / 100;
                const dniCloudFactor = Math.max(0, 1 - Math.pow(cloudOpacity, 0.7));
                const dniBlocked = dni * (1 - dniCloudFactor);
                dni = dni * dniCloudFactor;

                let dhiCloudFactor = 1 + (cloudOpacity * 1.2); 
                if (cloudOpacity > 0.8) dhiCloudFactor = 1 - ((cloudOpacity - 0.8) * 5); 
                dhi = (dhi + (dniBlocked * 0.35)) * Math.max(0.1, dhiCloudFactor); 
                
                const radZenith = position.zenith * (Math.PI / 180);
                ghi = (dni * Math.cos(radZenith)) + dhi;
            }
        }

        // ========================================
        // POA Y TRACKING
        // ========================================
        const tracker = calculateTracking(config.tracking || 'fixed', position.zenith, position.azimuth, panelTilt, panelAzimuth);
        const incidence = incidenceAngle(position.zenith, position.azimuth, tracker.tilt, tracker.azimuth);
        let poa = planeOfArrayIrradiance(dni, dhi, ghi, incidence, tracker.tilt, 0.2, config.bifaciality || 0);
        poa = Math.max(0, poa);

        // ========================================
        // TERMODINÁMICA Y TEMPERATURA DE CELDA
        // ========================================
        const tempAmbiente = currentW.temperature ?? ambient;
        const velocidadViento = currentW.windSpeed ?? windSpeed;

        let panelTemp = panelTemperature(
            tempAmbiente, 
            poa, 
            velocidadViento, 
            nominalEfficiency, 
            config.coolingType,
            lastPanelTemp,  
            INTERVAL_HOURS  
        );
        lastPanelTemp = panelTemp; 

        // ========================================
        // ⚡ GENERACIÓN DE POTENCIA AC/DC (A PRUEBA DE BALAS)
        // ========================================
        // 1. Extracción segura de parámetros de interfaz
        const areaEfectiva = Number(panelArea) || Number(config.area) || 1000;
        const eficBase = Number(nominalEfficiency) || Number(config.eficiencia) || 22.5;
        const eficDecimal = eficBase > 1 ? (eficBase / 100) : eficBase;

        // 2. Física Termodinámica Inline (Sin depender de funciones externas)
        let tCelda = tempAmbiente + ((45 - 20) / 800) * ghi;
        tCelda = Math.max(tempAmbiente, tCelda - (velocidadViento * 1.5)); // Enfriamiento por viento
        
        const factorTermico = 1 - (0.0035 * (tCelda - 25)); // Pérdida por calor
        const eficienciaFinal = Math.max(0.10, eficDecimal * factorTermico);

        // 3. Potencia Real y Derating
        let powerDC = (poa * areaEfectiva * eficienciaFinal) / 1000; // Salida en kW
        const perdidasSistema = 1 - (Number(config.systemLosses || 14) / 100);
        powerDC *= perdidasSistema;

        // 4. Inversor
        const limiteInversorKW = Number(config.inversorAC || config.inverterAC || config.inverterSize || 99999);
        let powerAC = Math.min(Math.max(0, powerDC), limiteInversorKW);

        // ========================================
        // CARGAS PARÁSITAS Y ENERGÍA DEL INTERVALO
        // ========================================
        let coolingPowerW = 0;
        if (poa > 50) {
            if (config.coolingType === 'active_air') coolingPowerW = 5 * areaEfectiva;
            if (config.coolingType === 'active_water') coolingPowerW = 12 * areaEfectiva;
        }

        let trackingPowerW = 0;
        if (position.elevation > 0 && poa > 10) {
            if (config.tracking === 'single') trackingPowerW = 1.5 * areaEfectiva; 
            if (config.tracking === 'dual') trackingPowerW = 3.5 * areaEfectiva;   
        }

        // 🟢 FIX 1: ASIGNACIÓN DIMENSIONAL CORRECTA
        // powerAC ya está en kW. La energía (kWh) es potencia pura * tiempo (0.25).
        const intervalEnergy = powerAC * INTERVAL_HOURS; 
        
        // El acumulador térmico y el KPI de la UI operan en Watts. Transformamos powerAC (* 1000).
        totalEnergyWh += (powerAC * 1000) * INTERVAL_HOURS;
        peakPower = Math.max(peakPower, powerAC * 1000); 

        efficiencyAccumulator += eficienciaFinal;
        efficiencySamples++;

        results.push({
            interval, hour, minutes,
            elevation: position.elevation, azimuth: position.azimuth, zenith: position.zenith,
            dni, ghi, dhi, poa, 
            power: powerAC * 1000, // 🟢 FIX 2: Exportamos la potencia al sistema en Watts (Alineado)
            coolingPower: coolingPowerW, trackingPower: trackingPowerW, 
            energy: intervalEnergy, // 🟢 FIX 3: Exportamos la energía real ya convertida a kWh
            efficiency: eficienciaFinal, panelTemp: tCelda, weatherFactor
        });
    }

    return {
        hourly: results,
        totalEnergyWh,
        totalEnergyKWh: totalEnergyWh / 1000,
        peakPower,
        averageEfficiency: efficiencySamples > 0 ? efficiencyAccumulator / efficiencySamples : 0
    };
}