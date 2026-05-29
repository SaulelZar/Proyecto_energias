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

    dayOfYear =
        Number(dayOfYear) || 1;


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

    zenith =
        Number(zenith);


    // ========================================
    // SOL BAJO HORIZONTE
    // ========================================

    if (

        !isFinite(zenith) ||

        zenith >= 90 ||

        zenith < 0

    ) {

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


    if (

        !isFinite(denominator) ||

        denominator <= 0

    ) {

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

        !isFinite(airMassValue) ||

        airMassValue <= 0

    ) {

        return 0;
    }


    altitude =
        Number(altitude) || 0;


    // ========================================
    // CORRECCION SIMPLE POR ALTITUD
    // ========================================

    const altitudeFactor =

        Math.exp(
            -altitude / 8434.5
        );


    let transmittance =

        Math.pow(

            0.7,

            Math.pow(
                airMassValue,
                0.678
            )
        )

        /

        altitudeFactor;


    transmittance =
        clamp(
            transmittance,
            0,
            1
        );


    return transmittance;
}




// ============================================
// DIRECT NORMAL IRRADIANCE
// ============================================

export function directNormalIrradiance(

    extraterrestrial,

    transmittance

) {

    extraterrestrial =
        Number(extraterrestrial) || 0;

    transmittance =
        Number(transmittance) || 0;


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

    dni =
        Number(dni) || 0;

    zenith =
        Number(zenith) || 0;


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

    ghi,

    dni = 0,

    zenith = 0

) {

    ghi =
        Number(ghi) || 0;

    dni =
        Number(dni) || 0;

    zenith =
        Number(zenith) || 0;


    // ========================================
    // MODELO EMPIRICO SIMPLE
    // ========================================

    const cosZenith =

        Math.max(
            0,
            Math.cos(
                deg2rad(zenith)
            )
        );


    const beamHorizontal =
        dni * cosZenith;


    let dhi =
        ghi - beamHorizontal;


    // ========================================
    // FALLBACK SI DA NEGATIVO
    // ========================================

    if (dhi < 0) {

        dhi =
            ghi * 0.15;
    }


    return Math.max(0, dhi);
}




// ============================================
// BEAM HORIZONTAL IRRADIANCE
// ============================================

export function beamHorizontalIrradiance(

    dni,

    zenith

) {

    dni =
        Number(dni) || 0;

    zenith =
        Number(zenith) || 0;


    return Math.max(

        0,

        dni *

        Math.cos(
            deg2rad(zenith)
        )
    );
}