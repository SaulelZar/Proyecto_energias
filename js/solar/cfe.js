// ============================================
// MOTOR FINANCIERO CFE (GDMTH / GDMTO) 
// Módulo independiente de facturación en MXN
// ============================================

const TARIFAS_CFE = {
    gdmth: {
        energia: { base: 1.25, intermedia: 2.10, punta: 3.80 }, // MXN / kWh
        demanda: { capacidad: 385.00, distribucion: 130.00 }    // MXN / kW
    },
    gdmto: {
        energia: { unica: 1.95 },                               // MXN / kWh
        demanda: { capacidad: 320.00, distribucion: 130.00 }    // MXN / kW
    }
};

function obtenerPeriodoCFE(fecha) {
    const hora = fecha.getHours();
    const dia = fecha.getDay(); 

    if (dia === 0 || dia === 6) {
        if (hora >= 0 && hora < 6) return 'base';
        return 'intermedia';
    }

    if (hora >= 0 && hora < 6) return 'base';
    if (hora >= 20 && hora < 22) return 'punta';
    return 'intermedia';
}

export function calcularAhorroCFE(simulacionAnual) {
    let costoSinSolar = 0;
    let costoConSolar = 0;

    let energiaMensualSin = { base: 0, intermedia: 0, punta: 0 };
    let energiaMensualCon = { base: 0, intermedia: 0, punta: 0 };
    
    let maxDemandaSin = 0;
    let maxDemandaCon = 0;
    let maxDemandaPuntaCon = 0;

    const tarifa = TARIFAS_CFE.gdmth; 
    
    if (!simulacionAnual || !simulacionAnual.dailyResults || simulacionAnual.dailyResults.length === 0) {
        return { gastoOriginal: 0, gastoNuevo: 0, ahorroAnual: 0 };
    }

    const diasTotales = simulacionAnual.dailyResults.length;
    let mesActual = 0; 

    simulacionAnual.dailyResults.forEach((diaData, diaIndex) => {
        if (!diaData.energySystem || !diaData.energySystem.intervals) return;

        const intervalosDelDia = diaData.energySystem.intervals;
        const totalIntervalosDia = intervalosDelDia.length;

        intervalosDelDia.forEach((intervalo, intIndex) => {
            
            let fecha = intervalo.timestamp ? new Date(intervalo.timestamp) : null;
            if (!fecha || isNaN(fecha.getTime())) {
                fecha = new Date(2026, 0, 1); 
                fecha.setMinutes((diaIndex * 24 * 60) + (intIndex * 15)); 
            }

            const mes = fecha.getMonth();
            const periodo = obtenerPeriodoCFE(fecha);
            const esUltimoIntervalo = (diaIndex === diasTotales - 1) && (intIndex === totalIntervalosDia - 1);

            if (diaIndex === 0 && intIndex === 0) mesActual = mes;

            if (mes !== mesActual || esUltimoIntervalo) {
                const costoEnergiaSin = 
                    (energiaMensualSin.base * tarifa.energia.base) + 
                    (energiaMensualSin.intermedia * tarifa.energia.intermedia) + 
                    (energiaMensualSin.punta * tarifa.energia.punta);

                const costoEnergiaCon = 
                    (energiaMensualCon.base * tarifa.energia.base) + 
                    (energiaMensualCon.intermedia * tarifa.energia.intermedia) + 
                    (energiaMensualCon.punta * tarifa.energia.punta);

                const costoDemandaSin = (maxDemandaSin * tarifa.demanda.distribucion) + (maxDemandaSin * tarifa.demanda.capacidad);
                const costoDemandaCon = (maxDemandaCon * tarifa.demanda.distribucion) + (maxDemandaPuntaCon * tarifa.demanda.capacidad);

                costoSinSolar += (costoEnergiaSin + costoDemandaSin);
                costoConSolar += (costoEnergiaCon + costoDemandaCon);

                energiaMensualSin = { base: 0, intermedia: 0, punta: 0 };
                energiaMensualCon = { base: 0, intermedia: 0, punta: 0 };
                maxDemandaSin = 0;
                maxDemandaCon = 0;
                maxDemandaPuntaCon = 0;
                mesActual = mes;
            }

            // 🟢 TRADUCTOR TERMODINÁMICO EXACTO (kWh a kW)
            // Extraemos la energía (kWh) proveniente de energySystem.js
            const consumokWh = Number(intervalo.consumption) || 0;
            let compraCFE_kWh = Number(intervalo.gridImport) || 0;
            
            if (compraCFE_kWh < 0) compraCFE_kWh = 0; 

            // Transformamos a Potencia (kW) para evaluar los picos de demanda
            const consumokW = consumokWh * 4;
            const compraCFE_kW = compraCFE_kWh * 4;

            // Acumuladores
            energiaMensualSin[periodo] += consumokWh;
            energiaMensualCon[periodo] += compraCFE_kWh;

            if (consumokW > maxDemandaSin) maxDemandaSin = consumokW;
            if (compraCFE_kW > maxDemandaCon) maxDemandaCon = compraCFE_kW;
            if (periodo === 'punta' && compraCFE_kW > maxDemandaPuntaCon) maxDemandaPuntaCon = compraCFE_kW;
        });
    });

    return {
        gastoOriginal: costoSinSolar,
        gastoNuevo: costoConSolar,
        ahorroAnual: costoSinSolar - costoConSolar
    };
}