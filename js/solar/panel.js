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

    dni =
        Number(dni) || 0;


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

    dhi =
        Number(dhi) || 0;


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

    ghi =
        Number(ghi) || 0;

    albedo =
        clamp(albedo, 0, 1);


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
// IRRADIANCIA SOBRE PANEL (BIFACIALIDAD INYECTADA)
// ============================================
export function planeOfArrayIrradiance(
    dni, dhi, ghi, incidenceAngleDeg, panelTilt, 
    albedo = 0.2, bifacialityFactor = 0 // 🟢 Nuevo parámetro
) {
    const beam = beamComponent(dni, incidenceAngleDeg);
    const diffuse = diffuseComponent(dhi, panelTilt);
    const ground = groundReflectedComponent(ghi, panelTilt, albedo);

    // 🟢 FÍSICA BIFACIAL: La luz que entra por detrás del panel
    let rearIrradiance = 0;
    if (bifacialityFactor > 0) {
        // La cara trasera "ve" el suelo (albedo) y el cielo detrás del panel
        const rearDiffuse = dhi * (1 - Math.cos(deg2rad(panelTilt))) / 2;
        const rearGround = ghi * albedo * (1 + Math.cos(deg2rad(panelTilt))) / 2;
        rearIrradiance = (rearDiffuse + rearGround) * (bifacialityFactor / 100);
    }

    return Math.max(0, beam + diffuse + ground + rearIrradiance);
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

    ambientTemp =
        Number(ambientTemp) || 25;

    poaIrradiance =
        Number(poaIrradiance) || 0;


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

    nominalEfficiency =
        Number(nominalEfficiency) || 0;

    panelTemp =
        Number(panelTemp) || 25;


    const efficiency =

        nominalEfficiency *

        (
            1 +

            tempCoefficient *

            (panelTemp - 25)
        );


    // ========================================
    // LIMITES FISICOS
    // ========================================

    return clamp(
        efficiency,
        0,
        nominalEfficiency * 1.05
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

    poaIrradiance =
        Number(poaIrradiance) || 0;

    panelArea =
        Number(panelArea) || 0;

    efficiency =
        Number(efficiency) || 0;


    return Math.max(

        0,

        poaIrradiance *

        panelArea *

        efficiency
    );
}


// ============================================
// SEGUIMIENTO SOLAR (TRACKERS)
// ============================================
export function calculateTracking(trackingType, zenith, solarAzimuth, fixedTilt, fixedAzimuth, maxRotation = 60) {
    if (trackingType === 'dual') {
        // 2 Ejes: El panel mira exactamente a donde está el sol
        return {
            tilt: clamp(zenith, 0, maxRotation), 
            azimuth: solarAzimuth
        };
    }

    if (trackingType === 'single') {
        // 1 Eje (Horizontal Norte-Sur): Gira para seguir el sol de Este a Oeste
        const safeZenith = clamp(zenith, 0, 89.9); // Evita tangentes infinitas
        const zRad = deg2rad(safeZenith);
        const azRad = deg2rad(solarAzimuth - 180); // Relativo al sur

        // Matemática trigonométrica del seguidor HSAT
        let rotation = Math.atan(Math.sin(azRad) * Math.tan(zRad));
        rotation = clamp(rotation, deg2rad(-maxRotation), deg2rad(maxRotation));

        const tilt = rad2deg(Math.abs(rotation));
        // Si la rotación es negativa mira al Este (mañana), si es positiva mira al Oeste (tarde)
        const azimuth = rotation < 0 ? 90 : 270; 

        return { tilt, azimuth };
    }

    // Fijo (Default)
    return { tilt: fixedTilt, azimuth: fixedAzimuth };
}