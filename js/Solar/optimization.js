// ============================================
// optimization.js
// Optimización de orientación (Rendimiento Anual)
// ============================================

// 🟢 FIX: Cambiamos simulateDay por simulateYear para encontrar el óptimo anual
import { simulateYear } from './yearly.js';

// ============================================
// OPTIMIZAR TILT (INCLINACIÓN)
// ============================================

export function optimizeTilt(
    config,
    {
        minTilt = 0,
        maxTilt = 60,
        step = 1
    } = {}
) {
    let bestTilt = minTilt;
    let bestEnergy = -Infinity;
    const history = [];

    step = Math.max(0.1, step);

    for (let tilt = minTilt; tilt <= maxTilt; tilt += step) {
        
        // 🟢 FIX: Evaluamos el año completo.
        // Mandamos annualConsumption vacío para saltarnos el cómputo de la batería 
        // y la red, enfocando el procesador solo en la generación fotovoltaica pura.
        const result = simulateYear({
            ...config,
            panelTilt: tilt,
            annualConsumption: [] 
        });

        const energy = Number(result.annualEnergy) || 0;

        history.push({ tilt, energy });

        if (energy > bestEnergy) {
            bestEnergy = energy;
            bestTilt = tilt;
        }
    }

    return {
        bestTilt,
        bestEnergy,
        history
    };
}


// ============================================
// OPTIMIZAR AZIMUTH (ORIENTACIÓN)
// ============================================

export function optimizeAzimuth(
    config,
    {
        minAzimuth = 90, // Este
        maxAzimuth = 270, // Oeste
        step = 5
    } = {}
) {
    let bestAzimuth = 180; // Default Sur
    let bestEnergy = -Infinity;
    const history = [];

    step = Math.max(0.1, step);

    for (let azimuth = minAzimuth; azimuth <= maxAzimuth; azimuth += step) {
        
        const result = simulateYear({
            ...config,
            panelAzimuth: azimuth,
            annualConsumption: []
        });

        const energy = Number(result.annualEnergy) || 0;

        history.push({ azimuth, energy });

        if (energy > bestEnergy) {
            bestEnergy = energy;
            bestAzimuth = azimuth;
        }
    }

    return {
        bestAzimuth,
        bestEnergy,
        history
    };
}


// ============================================
// OPTIMIZACION CONJUNTA (SUPERFICIE 3D)
// ============================================

export function optimizeOrientation(
    config,
    {
        tiltMin = 0,
        tiltMax = 60,
        tiltStep = 5,      // 🟢 FIX: Pasos más grandes para evitar congelar el navegador
        azimuthMin = 90,
        azimuthMax = 270,
        azimuthStep = 10   // 🟢 FIX: Reducimos la resolución de la grilla
    } = {}
) {
    let bestTilt = 0;
    let bestAzimuth = 180;
    let bestEnergy = -Infinity;
    const history = [];

    tiltStep = Math.max(1, tiltStep);
    azimuthStep = Math.max(1, azimuthStep);

    // Iteramos sobre una malla paramétrica para encontrar el máximo global
    for (let tilt = tiltMin; tilt <= tiltMax; tilt += tiltStep) {
        
        for (let azimuth = azimuthMin; azimuth <= azimuthMax; azimuth += azimuthStep) {
            
            const result = simulateYear({
                ...config,
                panelTilt: tilt,
                panelAzimuth: azimuth,
                annualConsumption: []
            });

            const energy = Number(result.annualEnergy) || 0;

            history.push({ tilt, azimuth, energy });

            if (energy > bestEnergy) {
                bestEnergy = energy;
                bestTilt = tilt;
                bestAzimuth = azimuth;
            }
        }
    }

    return {
        bestTilt,
        bestAzimuth,
        bestEnergy,
        history
    };
}