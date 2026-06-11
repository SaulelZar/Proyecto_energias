// ============================================
// cfe.js
// MOTOR FINANCIERO DUAL (Industrial + Residencial Escalonado)
// ============================================

export function calcularAhorroCFE(simulacionAnual, config) {
    const tarifa = config?.tipoTarifa || 'gdmth';

    if (tarifa.startsWith('1')) {
        return calcularResidencial(simulacionAnual, tarifa);
    } else {
        return calcularIndustrial(simulacionAnual, tarifa);
    }
}

// ============================================
// LÓGICA 1: TARIFAS RESIDENCIALES (Bimestrales Escalonadas + DAC)
// ============================================
function calcularResidencial(simulacionAnual, tipoTarifa) {
    // Límites de bloques de energía definidos por CFE
    const LIMITES = {
        '1A': { basico: 150, intermedio: 150, dac: 350 },
        '1B': { basico: 150, intermedio: 250, dac: 800 },
        '1C': { basico: 150, intermedio: 250, dac: 1700 },
        '1D': { basico: 150, intermedio: 250, dac: 2000 },
        '1E': { basico: 150, intermedio: 350, dac: 5000 },
        '1F': { basico: 150, intermedio: 450, dac: 5000 }
    };
    
    // Precios paramétricos estimados (MXN/kWh)
    const PRECIOS = { basico: 1.05, intermedio: 1.30, excedente: 3.65, dac: 5.80 };
    const bloque = LIMITES[tipoTarifa];

    // Condición DAC (Alto Consumo): Se evalúa si el promedio mensual supera el límite
    const promMensualSin = simulacionAnual.annualConsumptionEnergy / 12;
    const promMensualCon = simulacionAnual.annualGridImport / 12;
    const esDAC_Sin = promMensualSin > bloque.dac;
    const esDAC_Con = promMensualCon > bloque.dac;

    // Agrupación en 6 Bimestres (Regla residencial)
    let bimestresSin = new Array(6).fill(0);
    let bimestresCon = new Array(6).fill(0);

    simulacionAnual.dailyResults.forEach(day => {
        const mes = day.date.getMonth(); // 0-11
        const bimestreIdx = Math.floor(mes / 2); // 0-5

        day.energySystem.intervals.forEach(int => {
            bimestresSin[bimestreIdx] += int.consumption || 0;
            bimestresCon[bimestreIdx] += Math.max(0, int.gridImport || 0);
        });
    });

    // Procesamiento en Cascada
    const calcularCobroBimestre = (consumo, esDAC) => {
        if (esDAC) return consumo * PRECIOS.dac; // Castigo directo sin escalones
        
        let costo = 0;
        let restante = consumo;

        let cobroBasico = Math.min(restante, bloque.basico);
        costo += cobroBasico * PRECIOS.basico;
        restante -= cobroBasico;

        if (restante > 0) {
            let cobroIntermedio = Math.min(restante, bloque.intermedio);
            costo += cobroIntermedio * PRECIOS.intermedio;
            restante -= cobroIntermedio;
        }

        if (restante > 0) {
            costo += restante * PRECIOS.excedente; // Excedente sin subsidio
        }
        return costo;
    };

    let costoAnualSin = 0;
    let costoAnualCon = 0;

    for (let i = 0; i < 6; i++) {
        costoAnualSin += calcularCobroBimestre(bimestresSin[i], esDAC_Sin);
        costoAnualCon += calcularCobroBimestre(bimestresCon[i], esDAC_Con);
    }

    return { gastoOriginal: costoAnualSin, gastoNuevo: costoAnualCon, ahorroAnual: costoAnualSin - costoAnualCon };
}

// ============================================
// LÓGICA 2: TARIFAS INDUSTRIALES (GDMTH / GDMTO)
// ============================================
function calcularIndustrial(simulacionAnual, tipoTarifa) {
    const TARIFAS_IND = {
        gdmth: {
            energia: { base: 1.25, intermedia: 2.10, punta: 3.80 },
            demanda: { capacidad: 385.00, distribucion: 130.00 }
        },
        gdmto: { // Datos recibo Streger May 2026
            energia: { unica: 2.05 },
            demanda: { capacidad: 320.00, distribucion: 130.00 }
        }
    };
    const t = TARIFAS_IND[tipoTarifa];

    let costoAnualSin = 0;
    let costoAnualCon = 0;

    // Agrupación de Demanda Mensual
    let maxDemandaMensualSin = new Array(12).fill(0);
    let maxDemandaMensualCon = new Array(12).fill(0);
    let energiaMensualSin = Array.from({ length: 12 }, () => ({ base: 0, int: 0, punta: 0 }));
    let energiaMensualCon = Array.from({ length: 12 }, () => ({ base: 0, int: 0, punta: 0 }));

    simulacionAnual.dailyResults.forEach(day => {
        const mes = day.date.getMonth();
        const diaSemana = day.date.getDay();

        day.energySystem.intervals.forEach(int => {
            const h = int.hour;
            // Traductor Termodinámico de kWh a kW (multiplicar por 4 en intervalos de 15 min)
            const demandaKW_Sin = (int.consumption || 0) * 4;
            const demandaKW_Con = Math.max(0, (int.gridImport || 0) * 4);

            if (demandaKW_Sin > maxDemandaMensualSin[mes]) maxDemandaMensualSin[mes] = demandaKW_Sin;
            if (demandaKW_Con > maxDemandaMensualCon[mes]) maxDemandaMensualCon[mes] = demandaKW_Con;

            // Clasificación Horaria (GDMTH)
            let periodo = 'int';
            if (diaSemana === 0 || diaSemana === 6) {
                if (h >= 0 && h < 6) periodo = 'base';
            } else {
                if (h >= 0 && h < 6) periodo = 'base';
                else if (h >= 20 && h < 22) periodo = 'punta';
            }

            energiaMensualSin[mes][periodo] += (int.consumption || 0);
            energiaMensualCon[mes][periodo] += Math.max(0, int.gridImport || 0);
        });
    });

    // Facturación Mes a Mes
    for (let i = 0; i < 12; i++) {
        // Cargos por Demanda (Fijos)
        const cargoDemandaSin = (maxDemandaMensualSin[i] * t.demanda.distribucion) + (maxDemandaMensualSin[i] * t.demanda.capacidad);
        const cargoDemandaCon = (maxDemandaMensualCon[i] * t.demanda.distribucion) + (maxDemandaMensualCon[i] * t.demanda.capacidad);

        // Cargos por Energía Volumétrica
        let cargoEnergiaSin = 0;
        let cargoEnergiaCon = 0;

        if (tipoTarifa === 'gdmth') {
            cargoEnergiaSin = (energiaMensualSin[i].base * t.energia.base) + (energiaMensualSin[i].int * t.energia.intermedia) + (energiaMensualSin[i].punta * t.energia.punta);
            cargoEnergiaCon = (energiaMensualCon[i].base * t.energia.base) + (energiaMensualCon[i].int * t.energia.intermedia) + (energiaMensualCon[i].punta * t.energia.punta);
        } else {
            // GDMTO: Suma plana
            const sumaSin = energiaMensualSin[i].base + energiaMensualSin[i].int + energiaMensualSin[i].punta;
            const sumaCon = energiaMensualCon[i].base + energiaMensualCon[i].int + energiaMensualCon[i].punta;
            cargoEnergiaSin = sumaSin * t.energia.unica;
            cargoEnergiaCon = sumaCon * t.energia.unica;
        }

        costoAnualSin += (cargoDemandaSin + cargoEnergiaSin);
        costoAnualCon += (cargoDemandaCon + cargoEnergiaCon);
    }

    return { gastoOriginal: costoAnualSin, gastoNuevo: costoAnualCon, ahorroAnual: costoAnualSin - costoAnualCon };
}