// ============================================
// panel.js
// Modelos fotovoltaicos
// ============================================

import {

    deg2rad,

    rad2deg,

    clamp

} from './geometry.js';




// ============================================
// ANGULO DE INCIDENCIA
// ============================================

export function incidenceAngle(

    zenith,

    solarAzimuth,

    panelTilt,

    panelAzimuth

) {

    const zenithRad =
        deg2rad(zenith);

    const solarAzRad =
        deg2rad(solarAzimuth);

    const tiltRad =
        deg2rad(panelTilt);

    const panelAzRad =
        deg2rad(panelAzimuth);


    let cosTheta =

        Math.cos(zenithRad) *

        Math.cos(tiltRad)

        +

        Math.sin(zenithRad) *

        Math.sin(tiltRad) *

        Math.cos(
            solarAzRad -
            panelAzRad
        );


    // ========================================
    // ESTABILIDAD NUMERICA
    // ========================================

    cosTheta =
        clamp(
            cosTheta,
            -1,
            1
        );


    return rad2deg(

        Math.acos(cosTheta)
    );
}




// ============================================
// COMPONENTE DIRECTA
// ============================================

export function beamComponent(

    dni,

    incidenceAngleDeg

) {

    const incidenceRad =
        deg2rad(
            incidenceAngleDeg
        );


    return Math.max(

        0,

        dni *
        Math.cos(incidenceRad)
    );
}




// ============================================
// COMPONENTE DIFUSA
// MODELO ISOTROPICO
// ============================================

export function diffuseComponent(

    dhi,

    panelTilt

) {

    const tiltRad =
        deg2rad(panelTilt);


    return (

        dhi *

        (
            1 +
            Math.cos(tiltRad)
        ) / 2
    );
}




// ============================================
// COMPONENTE REFLEJADA
// ============================================

export function groundReflectedComponent(

    ghi,

    panelTilt,

    albedo = 0.2

) {

    const tiltRad =
        deg2rad(panelTilt);


    return (

        ghi *

        albedo *

        (
            1 -
            Math.cos(tiltRad)
        ) / 2
    );
}




// ============================================
// IRRADIANCIA SOBRE PANEL
// ============================================

export function planeOfArrayIrradiance(

    dni,

    dhi,

    ghi,

    incidenceAngleDeg,

    panelTilt,

    albedo = 0.2

) {

    const beam =

        beamComponent(

            dni,

            incidenceAngleDeg
        );


    const diffuse =

        diffuseComponent(

            dhi,

            panelTilt
        );


    const ground =

        groundReflectedComponent(

            ghi,

            panelTilt,

            albedo
        );


    return Math.max(

        0,

        beam +
        diffuse +
        ground
    );
}




// ============================================
// TEMPERATURA DEL PANEL
// MODELO NOCT
// ============================================

export function panelTemperature(

    ambientTemp,

    poaIrradiance,

    noct = 45

) {

    return (

        ambientTemp +

        (
            (noct - 20) / 800
        ) *

        poaIrradiance
    );
}




// ============================================
// EFICIENCIA TERMICA
// ============================================

export function thermalEfficiency(

    nominalEfficiency,

    panelTemp,

    tempCoefficient = -0.004

) {

    const efficiency =

        nominalEfficiency *

        (
            1 +

            tempCoefficient *

            (panelTemp - 25)
        );


    return Math.max(
        0,
        efficiency
    );
}




// ============================================
// POTENCIA GENERADA
// ============================================

export function generatedPower(

    poaIrradiance,

    panelArea,

    efficiency

) {

    return Math.max(

        0,

        poaIrradiance *

        panelArea *

        efficiency
    );
}