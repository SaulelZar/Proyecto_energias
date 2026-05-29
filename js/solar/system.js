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

    const power =

        (Number(dcPower) || 0) *

        (Number(lossesFactor) || 0);


    return Math.max(0, power);
}




// ============================================
// ENERGIA NETA AC
// ============================================

export function netACEnergy(

    dcEnergy,

    lossesFactor

) {

    const energy =

        (Number(dcEnergy) || 0) *

        (Number(lossesFactor) || 0);


    return Math.max(0, energy);
}




// ============================================
// FACTOR DE CAPACIDAD
// ============================================

export function capacityFactor(

    actualEnergy,

    ratedPower,

    hours = 24

) {

    actualEnergy =
        Number(actualEnergy) || 0;

    ratedPower =
        Number(ratedPower) || 0;

    hours =
        Number(hours) || 0;


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

    actualEnergy =
        Number(actualEnergy) || 0;

    referenceEnergy =
        Number(referenceEnergy) || 0;


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

    energyKWh =
        Number(energyKWh) || 0;

    installedPowerKWp =
        Number(installedPowerKWp) || 0;


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

    outputEnergy =
        Number(outputEnergy) || 0;

    inputSolarEnergy =
        Number(inputSolarEnergy) || 0;


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

    selfConsumedEnergy =
        Number(selfConsumedEnergy) || 0;

    totalSolarEnergy =
        Number(totalSolarEnergy) || 0;


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

    selfConsumedEnergy =
        Number(selfConsumedEnergy) || 0;

    totalConsumption =
        Number(totalConsumption) || 0;


    if (totalConsumption <= 0) {

        return 0;
    }


    return (
        selfConsumedEnergy /
        totalConsumption
    );
}