// ============================================
// irradiance.js
// Modelos de irradiancia solar
// ============================================

import {
    deg2rad
} from './geometry.js';


// ============================================
// CONSTANTE SOLAR
// ============================================

export const SOLAR_CONSTANT = 1361; // W/m²



// ============================================
// IRRADIANCIA EXTRATERRESTRE
// ============================================

export function extraterrestrialIrradiance(
    dayOfYear
) {

    return SOLAR_CONSTANT *
        (
            1 +
            0.033 *
            Math.cos(
                deg2rad(
                    (360 * dayOfYear) / 365
                )
            )
        );
}



// ============================================
// AIR MASS (KASTEN-YOUNG)
// ============================================

export function airMass(
    zenith
) {

    if (zenith >= 90) {
        return Infinity;
    }

    return 1 /
        (
            Math.cos(deg2rad(zenith))
            +
            0.50572 *
            Math.pow(
                96.07995 - zenith,
                -1.6364
            )
        );
}



// ============================================
// MODELO SIMPLE DE TRANSMITANCIA
// ============================================

export function atmosphericTransmittance(
    airMassValue,
    altitude = 0
) {

    // Corrección básica por altitud
    const altitudeFactor =
        Math.exp(-altitude / 8434.5);

    return Math.pow(
        0.7,
        Math.pow(airMassValue, 0.678)
    ) / altitudeFactor;
}



// ============================================
// DIRECT NORMAL IRRADIANCE
// ============================================

export function directNormalIrradiance(
    extraterrestrial,
    transmittance
) {

    return extraterrestrial *
        transmittance;
}



// ============================================
// GLOBAL HORIZONTAL IRRADIANCE
// ============================================

export function globalHorizontalIrradiance(
    dni,
    zenith
) {

    return dni *
        Math.cos(
            deg2rad(zenith)
        );
}



// ============================================
// DIFFUSE HORIZONTAL IRRADIANCE
// MODELO MUY SIMPLE
// ============================================

export function diffuseHorizontalIrradiance(
    ghi,
    dni,
    zenith
) {

    return ghi -
        (
            dni *
            Math.cos(
                deg2rad(zenith)
            )
        );
}

