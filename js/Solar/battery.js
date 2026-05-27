// ============================================
// battery.js
// Sistema de baterías - CORREGIDO
// ============================================

// ============================================
// CLAMP
// ============================================
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// ============================================
// LIMITAR SOC
// ============================================
export function clampSOC(soc, minSOC = 0, maxSOC = 1) {
    return clamp(soc, minSOC, maxSOC);
}

// ============================================
// CREAR BATERIA
// ============================================
export function createBattery({
    capacityKWh,
    initialSOC = 0.5,
    maxChargePower,
    maxDischargePower,
    chargeEfficiency = 0.95,
    dischargeEfficiency = 0.95,
    minSOC = 0.1, // Límite de profundidad de descarga (DOD) de 90%
    maxSOC = 1.0
}) {

    if (capacityKWh <= 0) {
        throw new Error('Battery capacity must be > 0');
    }

    if (initialSOC < 0 || initialSOC > 1) {
        throw new Error('Initial SOC must be between 0 and 1');
    }

    if (minSOC < 0 || maxSOC > 1 || minSOC >= maxSOC) {
        throw new Error('Invalid SOC limits');
    }

    if (chargeEfficiency <= 0 || chargeEfficiency > 1 || dischargeEfficiency <= 0 || dischargeEfficiency > 1) {
        throw new Error('Invalid efficiency parameters');
    }

    // 🟢 FIX 1: Límite físico de C-Rate. 
    // Si no se define potencia máxima, asumimos un sistema 1C (1 kW por cada 1 kWh de capacidad).
    const defaultPower = capacityKWh; 

    return {
        capacityKWh,
        soc: clampSOC(initialSOC, minSOC, maxSOC),
        
        maxChargePower: maxChargePower !== undefined ? maxChargePower : defaultPower,
        maxDischargePower: maxDischargePower !== undefined ? maxDischargePower : defaultPower,
        
        chargeEfficiency,
        dischargeEfficiency,
        minSOC,
        maxSOC,
        cycles: 0,
        totalChargedEnergy: 0,
        totalDischargedEnergy: 0
    };
}

// ============================================
// ENERGIA ACTUAL
// ============================================
export function batteryEnergy(battery) {
    return battery.capacityKWh * battery.soc;
}

// ============================================
// ESPACIO DISPONIBLE
// ============================================
export function availableChargeSpace(battery) {
    const maxEnergy = battery.capacityKWh * battery.maxSOC;
    return Math.max(0, maxEnergy - batteryEnergy(battery));
}

// ============================================
// ENERGIA DISPONIBLE
// ============================================
export function availableDischargeEnergy(battery) {
    const minEnergy = battery.capacityKWh * battery.minSOC;
    return Math.max(0, batteryEnergy(battery) - minEnergy);
}

// ============================================
// CARGAR BATERIA
// ============================================
export function chargeBattery(battery, energyKWh, intervalHours = 0.25) {
    if (energyKWh <= 0) return 0;

    // 🟢 LIMITACIÓN FÍSICA: El inversor recorta la energía que intenta entrar de golpe
    const powerLimitedEnergy = battery.maxChargePower * intervalHours;
    const inputEnergy = Math.min(energyKWh, powerLimitedEnergy);

    const availableSpace = availableChargeSpace(battery);

    // Se aplican pérdidas térmicas por resistencia interna (eficiencia)
    const storedEnergy = Math.min(
        inputEnergy * battery.chargeEfficiency,
        availableSpace
    );

    const newEnergy = batteryEnergy(battery) + storedEnergy;
    battery.soc = clampSOC(newEnergy / battery.capacityKWh, battery.minSOC, battery.maxSOC);

    battery.totalChargedEnergy += storedEnergy;
    return storedEnergy;
}

// ============================================
// DESCARGAR BATERIA
// ============================================
export function dischargeBattery(battery, energyNeededKWh, intervalHours = 0.25) {
    if (energyNeededKWh <= 0) return 0;

    // 🟢 LIMITACIÓN FÍSICA: El inversor recorta lo que la fábrica puede exigirle a la batería
    const powerLimitedEnergy = battery.maxDischargePower * intervalHours;
    const requestedEnergy = Math.min(energyNeededKWh, powerLimitedEnergy);

    const availableEnergy = availableDischargeEnergy(battery);

    // La batería debe entregar más energía interna para compensar sus propias pérdidas
    const internalRequiredEnergy = requestedEnergy / battery.dischargeEfficiency;

    const extractedEnergy = Math.min(internalRequiredEnergy, availableEnergy);

    const newEnergy = batteryEnergy(battery) - extractedEnergy;
    battery.soc = clampSOC(newEnergy / battery.capacityKWh, battery.minSOC, battery.maxSOC);

    const deliveredEnergy = extractedEnergy * battery.dischargeEfficiency;

    battery.totalDischargedEnergy += deliveredEnergy;

    // 🟢 FIX 2: Cálculo correcto de los "Equivalent Full Cycles" (EFC)
    // Se cuenta un ciclo cuando la energía acumulada (throughput) equivale a la capacidad nominal.
    battery.cycles += extractedEnergy / battery.capacityKWh;

    return deliveredEnergy;
}

// ============================================
// ESTADOS DE LA BATERÍA
// ============================================
export function batterySOCPercent(battery) {
    return battery.soc * 100;
}

export function isBatteryFull(battery) {
    return (battery.soc >= battery.maxSOC - 1e-6); // Margen de error flotante
}

export function isBatteryEmpty(battery) {
    return (battery.soc <= battery.minSOC + 1e-6);
}