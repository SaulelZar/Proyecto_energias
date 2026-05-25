// ============================================
// battery.js
// Sistema de baterías
// ============================================



// ============================================
// CREAR BATERIA
// ============================================

export function createBattery({

    capacityKWh,

    initialSOC = 0.5,

    maxChargePower = Infinity,

    maxDischargePower = Infinity,

    chargeEfficiency = 0.95,

    dischargeEfficiency = 0.95,

    minSOC = 0.1,

    maxSOC = 1.0

}) {

    // ========================================
    // VALIDACIONES
    // ========================================

    if (capacityKWh <= 0) {

        throw new Error(
            'Battery capacity must be > 0'
        );
    }

    if (initialSOC < 0 || initialSOC > 1) {

        throw new Error(
            'Initial SOC must be between 0 and 1'
        );
    }


    return {

        capacityKWh,

        soc: clampSOC(initialSOC),

        maxChargePower,

        maxDischargePower,

        chargeEfficiency,

        dischargeEfficiency,

        minSOC,

        maxSOC,

        cycles: 0
    };
}




// ============================================
// LIMITAR SOC
// ============================================

export function clampSOC(soc) {

    return Math.min(
        1,
        Math.max(0, soc)
    );
}




// ============================================
// ENERGIA ACTUAL
// ============================================

export function batteryEnergy(

    battery
) {

    return (
        battery.capacityKWh *
        battery.soc
    );
}




// ============================================
// ESPACIO DISPONIBLE
// ============================================

export function availableChargeSpace(

    battery
) {

    const maxEnergy =
        battery.capacityKWh *
        battery.maxSOC;


    return Math.max(
        0,
        maxEnergy - batteryEnergy(battery)
    );
}




// ============================================
// ENERGIA DISPONIBLE
// ============================================

export function availableDischargeEnergy(

    battery
) {

    const minEnergy =
        battery.capacityKWh *
        battery.minSOC;


    return Math.max(
        0,
        batteryEnergy(battery) - minEnergy
    );
}




// ============================================
// CARGAR BATERIA
// ============================================

export function chargeBattery(

    battery,

    energyKWh
) {

    if (energyKWh <= 0) {

        return 0;
    }


    const availableSpace =
        availableChargeSpace(
            battery
        );


    const effectiveEnergy =
        energyKWh *
        battery.chargeEfficiency;


    const chargedEnergy =
        Math.min(
            effectiveEnergy,
            availableSpace
        );


    const newEnergy =

        batteryEnergy(battery)
        +
        chargedEnergy;


    battery.soc =
        clampSOC(
            newEnergy /
            battery.capacityKWh
        );


    return chargedEnergy;
}




// ============================================
// DESCARGAR BATERIA
// ============================================

export function dischargeBattery(

    battery,

    energyNeededKWh
) {

    if (energyNeededKWh <= 0) {

        return 0;
    }


    const availableEnergy =
        availableDischargeEnergy(
            battery
        );


    const requiredEnergy =
        energyNeededKWh /
        battery.dischargeEfficiency;


    const dischargedEnergy =
        Math.min(
            requiredEnergy,
            availableEnergy
        );


    const newEnergy =

        batteryEnergy(battery)
        -
        dischargedEnergy;


    battery.soc =
        clampSOC(
            newEnergy /
            battery.capacityKWh
        );


    return (

        dischargedEnergy *
        battery.dischargeEfficiency
    );
}




// ============================================
// PORCENTAJE SOC
// ============================================

export function batterySOCPercent(

    battery
) {

    return battery.soc * 100;
}




// ============================================
// BATERIA LLENA
// ============================================

export function isBatteryFull(

    battery
) {

    return (
        battery.soc >= battery.maxSOC
    );
}




// ============================================
// BATERIA VACIA
// ============================================

export function isBatteryEmpty(

    battery
) {

    return (
        battery.soc <= battery.minSOC
    );
}