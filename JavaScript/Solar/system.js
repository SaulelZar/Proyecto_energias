// ============================================
// system.js
// Modelo completo del sistema FV
// ============================================



// ============================================
// PERDIDAS DEL SISTEMA
// ============================================

export function systemLosses({

    soiling = 0.98,

    shading = 1.0,

    wiring = 0.98,

    mismatch = 0.99,

    inverter = 0.96,

    degradation = 1.0

}) {

    return (

        soiling *

        shading *

        wiring *

        mismatch *

        inverter *

        degradation
    );
}



// ============================================
// POTENCIA NETA AC
// ============================================

export function netACPower(

    dcPower,

    lossesFactor

) {

    return dcPower * lossesFactor;
}



// ============================================
// FACTOR DE CAPACIDAD
// ============================================

export function capacityFactor(

    actualEnergy,

    ratedPower,

    hours = 24

) {

    const theoretical =
        ratedPower * hours;

    return actualEnergy / theoretical;
}



// ============================================
// PERFORMANCE RATIO
// ============================================

export function performanceRatio(

    actualEnergy,

    referenceEnergy

) {

    return actualEnergy / referenceEnergy;
}