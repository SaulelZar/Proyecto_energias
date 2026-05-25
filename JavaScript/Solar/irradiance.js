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
// CLAMP
// ============================================

function clamp(

    value,

    min,

    max

) {

    return Math.min(
        max,
        Math.max(min, value)
    );
}




// ============================================
// IRRADIANCIA EXTRATERRESTRE
// ============================================

export function extraterrestrialIrradiance(

    dayOfYear

) {

    return (

        SOLAR_CONSTANT *

        (
            1 +

            0.033 *

            Math.cos(

                deg2rad(

                    (360 * dayOfYear) / 365
                )
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

    // Sol bajo horizonte
    if (zenith >= 90) {

        return null;
    }


    const cosZenith =

        Math.cos(
            deg2rad(zenith)
        );


    const denominator =

        cosZenith

        +

        0.50572 *

        Math.pow(

            96.07995 - zenith,

            -1.6364
        );


    if (denominator <= 0) {

        return null;
    }


    return 1 / denominator;
}




// ============================================
// TRANSMITANCIA ATMOSFERICA
// ============================================

export function atmosphericTransmittance(

    airMassValue,

    altitude = 0

) {

    if (

        airMassValue === null ||

        airMassValue <= 0

    ) {

        return 0;
    }


    // Corrección básica por altitud
    const altitudeFactor =

        Math.exp(
            -altitude / 8434.5
        );


    const transmittance =

        Math.pow(

            0.7,

            Math.pow(
                airMassValue,
                0.678
            )
        )

        /

        altitudeFactor;


    return clamp(
        transmittance,
        0,
        1
    );
}




// ============================================
// DIRECT NORMAL IRRADIANCE
// ============================================

export function directNormalIrradiance(

    extraterrestrial,

    transmittance

) {

    return Math.max(

        0,

        extraterrestrial *
        transmittance
    );
}




// ============================================
// GLOBAL HORIZONTAL IRRADIANCE
// ============================================

export function globalHorizontalIrradiance(

    dni,

    zenith

) {

    const cosZenith =

        Math.cos(
            deg2rad(zenith)
        );


    return Math.max(

        0,

        dni * cosZenith
    );
}




// ============================================
// DIFFUSE HORIZONTAL IRRADIANCE
// MODELO SIMPLE EMPIRICO
// ============================================

export function diffuseHorizontalIrradiance(

    ghi

) {

    // Aproximación:
    // ~10-30% de GHI suele ser difusa

    return ghi * 0.15;
}




// ============================================
// BEAM HORIZONTAL IRRADIANCE
// ============================================

export function beamHorizontalIrradiance(

    dni,

    zenith

) {

    return Math.max(

        0,

        dni *

        Math.cos(
            deg2rad(zenith)
        )
    );
}