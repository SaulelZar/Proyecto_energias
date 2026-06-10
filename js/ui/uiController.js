// ============================================
// uiController.js
// Manipulación exclusiva del DOM y cálculos de CAPEX
// ============================================


export function getInputValue(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = Number(el.value);
    return isNaN(v) ? fallback : v;
}

export function getConfigFromUI() {
    const longitude = getInputValue('longitud', -100.3161);
    const standardMeridian = Math.round(longitude / 15) * 15;

    return {
        latitude: getInputValue('latitud', 25.6866),
        longitude: longitude,
        altitude: getInputValue('altitud', 540),
        standardMeridian: standardMeridian,
        panelTilt: getInputValue('inclinacion', 25),
        panelAzimuth: getInputValue('azimut', 180),
        panelArea: getInputValue('area', 1000),
        nominalEfficiency: getInputValue('eficiencia', 22.5) / 100,
        tracking: document.getElementById('tracking')?.value || 'fixed',
        bifaciality: getInputValue('bifacial', 0),
        inverterAC: getInputValue('inversorAC', 1000), 
        coolingType: document.getElementById('enfriamiento')?.value || 'none',
        reservaRespaldo: getInputValue('reservaRespaldo', 30),
        fallaRed: getInputValue('fallaRed', 99.5),
        capacidadBateria: getInputValue('capacidadBateria', 50),
        socInicial: getInputValue('socInicial', 50),
        climaEspecifico: document.getElementById('climaEspecifico')?.value || 'normal',
        year: 2026
    };
}

export function updateKPIs(simulacion) {
    if (!simulacion) return;
    document.getElementById('genAnual').textContent = simulacion.annualEnergy.toFixed(2) + ' kWh';
    document.getElementById('efSistema').textContent = (simulacion.averageEfficiency * 100).toFixed(1) + '%';
    document.getElementById('potenciaPico').textContent = (simulacion.peakPower / 1000).toFixed(2) + ' kW';

    if (simulacion.annualConsumptionEnergy > 0) {
        const cobertura = ((simulacion.annualConsumptionEnergy - simulacion.annualGridImport) / simulacion.annualConsumptionEnergy) * 100;
        document.getElementById('cobertura').textContent = cobertura.toFixed(1) + '%';
    } else {
        document.getElementById('cobertura').textContent = '0%';
    }
    
    document.getElementById('kpiApagones').textContent = simulacion.totalBlackoutEvents;
    document.getElementById('kpiMaxApagon').textContent = simulacion.maxBlackoutDurationHours.toFixed(1) + ' hrs';
}

export function actualizarKPIsFinancieros(finanzas, capexTotal) {
    const formatMXN = (val) => val.toLocaleString('es-MX', { 
        style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 
    });

    const elGastoOrig = document.getElementById('kpiGastoOriginal');
    const elGastoNuevo = document.getElementById('kpiGastoNuevo');
    const elAhorro = document.getElementById('kpiAhorro');
    const elROI = document.getElementById('kpiROI');

    if (elGastoOrig) elGastoOrig.textContent = formatMXN(finanzas.gastoOriginal);
    if (elGastoNuevo) elGastoNuevo.textContent = formatMXN(finanzas.gastoNuevo);
    if (elAhorro) elAhorro.textContent = formatMXN(finanzas.ahorroAnual);

    if (elROI) {
        if (finanzas.ahorroAnual > 0 && capexTotal > 0) {
            const roiAños = capexTotal / finanzas.ahorroAnual;
            elROI.innerHTML = `${roiAños.toFixed(1)} <span>Años</span>`;
        } else {
            elROI.innerHTML = `N/A`;
        }
    }
}

export function calcularFinanzas(config, capacidadBateriaReal) {
    const potenciaKWp = config.panelArea * config.nominalEfficiency; 
    const unitPanel = getInputValue('costoPanelWp', 6.00);
    const unitBateria = getInputValue('costoBateriaKWh', 7000);
    const unitInversor = getInputValue('costoInversorKW', 2000);

    let factorEstructura = 1.0; 
    if (config.panelTilt > 35 && config.tracking === 'fixed') factorEstructura = 1.10; 
    if (config.tracking === 'single') factorEstructura = 1.15; 
    if (config.tracking === 'dual') factorEstructura = 1.35;   

    let factorEnfriamiento = 1.0; 
    if (config.coolingType === 'active_air') factorEnfriamiento = 1.08; 
    if (config.coolingType === 'active_water') factorEnfriamiento = 1.25; 

    const capexFV = potenciaKWp * 1000 * unitPanel * factorEstructura * factorEnfriamiento;
    const capexBESS = capacidadBateriaReal * unitBateria;
    const capexInversor = config.inverterAC * unitInversor;

    const totalCAPEX = (capexFV + capexBESS + capexInversor) * 1.15; // 15% BOS

    const kpiElement = document.getElementById('kpiCapex');
    if (kpiElement) {
        kpiElement.textContent = totalCAPEX.toLocaleString('es-MX', {
            style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0
        }) + ' MXN';
    }
    return totalCAPEX;
}

export function getSelectedDay(dailyResults) {
    const fechaInput = document.getElementById('diaEspecifico')?.value;
    if (fechaInput) {
        const [year, month, day] = fechaInput.split('-');
        const targetMonth = Number(month) - 1; 
        const targetDay = Number(day);
        const diaExacto = dailyResults.find(d => d.date.getMonth() === targetMonth && d.date.getDate() === targetDay);
        if (diaExacto) return diaExacto;
    }

    const estacion = document.getElementById('estacion')?.value || 'verano';
    const tipoDia = document.getElementById('tipoDia')?.value || 'semana';

    let targetMonth = 2; 
    if (estacion === 'verano') targetMonth = 5; 
    if (estacion === 'otono') targetMonth = 8; 
    if (estacion === 'invierno') targetMonth = 11; 

    const quiereFinDeSemana = (tipoDia === 'fin_semana');

    const diaEncontrado = dailyResults.find(d => {
        const diaSemana = d.date.getDay();
        if (quiereFinDeSemana) {
            return d.date.getMonth() === targetMonth && diaSemana === 0;
        } else {
            return d.date.getMonth() === targetMonth && diaSemana === 3;
        }
    });

    return diaEncontrado || dailyResults[0]; 
}