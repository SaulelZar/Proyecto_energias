// ============================================
// panel.js
// Modelos fotovoltaicos
// ============================================

import {
    deg2rad
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

    const zenithRad = deg2rad(zenith);

    const solarAzRad = deg2rad(solarAzimuth);

    const tiltRad = deg2rad(panelTilt);

    const panelAzRad = deg2rad(panelAzimuth);


    const cosTheta =

        Math.cos(zenithRad) *
        Math.cos(tiltRad)

        +

        Math.sin(zenithRad) *
        Math.sin(tiltRad) *
        Math.cos(solarAzRad - panelAzRad);


    return Math.acos(cosTheta) * 180 / Math.PI;
}



// ============================================
// IRRADIANCIA SOBRE PANEL
// ============================================

export function planeOfArrayIrradiance(

    dni,

    dhi,

    ghi,

    incidenceAngleDeg,

    panelTilt

) {

    const incidenceRad =
        deg2rad(incidenceAngleDeg);

    const tiltRad =
        deg2rad(panelTilt);


    // Componente directa
    const beam =
        dni * Math.cos(incidenceRad);


    // Difusa isotrópica
    const diffuse =
        dhi *
        (1 + Math.cos(tiltRad)) / 2;


    // Reflejada por suelo
    const albedo = 0.2;

    const ground =
        ghi *
        albedo *
        (1 - Math.cos(tiltRad)) / 2;


    return beam + diffuse + ground;
}



// ============================================
// TEMPERATURA DEL PANEL
// ============================================

export function panelTemperature(

    ambientTemp,

    poaIrradiance,

    noct = 45

) {

    return ambientTemp +
        (
            (noct - 20) / 800
        ) *
        poaIrradiance;
}



// ============================================
// EFICIENCIA TERMICA
// ============================================

export function thermalEfficiency(

    nominalEfficiency,

    panelTemp,

    tempCoefficient = -0.004

) {

    return nominalEfficiency *

        (
            1 +
            tempCoefficient *
            (panelTemp - 25)
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

    return (
        poaIrradiance *
        panelArea *
        efficiency
    );
}