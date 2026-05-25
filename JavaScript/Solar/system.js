// ============================================
// system.js
// Modelo completo del sistema FV
// ============================================




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
// FACTOR TOTAL DE PERDIDAS
// ============================================

export function systemLosses({

    soiling = 0.98,

    shading = 1.0,

    wiring = 0.98,

    mismatch = 0.99,

    inverter = 0.96,

    degradation = 1.0

}) {

    const lossesFactor =

        soiling *

        shading *

        wiring *

        mismatch *

        inverter *

        degradation;


    return clamp(
        lossesFactor,
        0,
        1
    );
}




// ============================================
// POTENCIA NETA AC
// ============================================

export function netACPower(

    dcPower,

    lossesFactor

) {

    return Math.max(

        0,

        dcPower *
        lossesFactor
    );
}




// ============================================
// ENERGIA NETA AC
// ============================================

export function netACEnergy(

    dcEnergy,

    lossesFactor

) {

    return Math.max(

        0,

        dcEnergy *
        lossesFactor
    );
}




// ============================================
// FACTOR DE CAPACIDAD
// ============================================

export function capacityFactor(

    actualEnergy,

    ratedPower,

    hours = 24

) {

    if (

        ratedPower <= 0 ||

        hours <= 0

    ) {

        return 0;
    }


    const theoretical =

        ratedPower *
        hours;


    return actualEnergy /
        theoretical;
}




// ============================================
// PERFORMANCE RATIO
// ============================================

export function performanceRatio(

    actualEnergy,

    referenceEnergy

) {

    if (referenceEnergy <= 0) {

        return 0;
    }


    return actualEnergy /
        referenceEnergy;
}




// ============================================
// SPECIFIC YIELD
// kWh/kWp
// ============================================

export function specificYield(

    energyKWh,

    installedPowerKWp

) {

    if (installedPowerKWp <= 0) {

        return 0;
    }


    return (
        energyKWh /
        installedPowerKWp
    );
}




// ============================================
// SYSTEM EFFICIENCY
// ============================================

export function systemEfficiency(

    outputEnergy,

    inputSolarEnergy

) {

    if (inputSolarEnergy <= 0) {

        return 0;
    }


    return (
        outputEnergy /
        inputSolarEnergy
    );
}




// ============================================
// AUTOCONSUMO
// ============================================

export function selfConsumptionRatio(

    selfConsumedEnergy,

    totalSolarEnergy

) {

    if (totalSolarEnergy <= 0) {

        return 0;
    }


    return (
        selfConsumedEnergy /
        totalSolarEnergy
    );
}




// ============================================
// AUTOSUFICIENCIA
// ============================================

export function selfSufficiencyRatio(

    selfConsumedEnergy,

    totalConsumption

) {

    if (totalConsumption <= 0) {

        return 0;
    }


    return (
        selfConsumedEnergy /
        totalConsumption
    );
}