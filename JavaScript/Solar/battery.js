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

    return {

        capacityKWh,

        soc: initialSOC,

        maxChargePower,

        maxDischargePower,

        chargeEfficiency,

        dischargeEfficiency,

        minSOC,

        maxSOC
    };
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
// CARGAR BATERIA
// ============================================

export function chargeBattery(

    battery,

    energyKWh
) {

    const currentEnergy =
        batteryEnergy(battery);


    const maxEnergy =
        battery.capacityKWh *
        battery.maxSOC;


    const availableSpace =
        maxEnergy - currentEnergy;


    const effectiveEnergy =
        energyKWh *
        battery.chargeEfficiency;


    const chargedEnergy =
        Math.min(
            effectiveEnergy,
            availableSpace
        );


    battery.soc =
        (
            currentEnergy +
            chargedEnergy
        )
        /
        battery.capacityKWh;


    return chargedEnergy;
}



// ============================================
// DESCARGAR BATERIA
// ============================================

export function dischargeBattery(

    battery,

    energyNeededKWh
) {

    const currentEnergy =
        batteryEnergy(battery);


    const minEnergy =
        battery.capacityKWh *
        battery.minSOC;


    const availableEnergy =
        currentEnergy - minEnergy;


    const requiredEnergy =
        energyNeededKWh /
        battery.dischargeEfficiency;


    const dischargedEnergy =
        Math.min(
            requiredEnergy,
            availableEnergy
        );


    battery.soc =
        (
            currentEnergy -
            dischargedEnergy
        )
        /
        battery.capacityKWh;


    return dischargedEnergy *
        battery.dischargeEfficiency;
}