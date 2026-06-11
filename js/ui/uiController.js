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
        capacidadBateria: getInputValue('capacidadBateria', 1000),
        socInicial: getInputValue('socInicial', 50),
        climaEspecifico: document.getElementById('climaEspecifico')?.value || 'normal',
        year: 2026,
        tipoTarifa: document.getElementById('tipoTarifa')?.value || 'gdmth', 
        tipoCostoApagon: document.getElementById('tipoCostoApagon')?.value || 'hora', 
        costoApagon: getInputValue('costoApagon', 5000), 
        inverterAC: getInputValue('inversorAC', 1000) 
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
    
    document.getElementById('kpiApagones').textContent = simulacion.totalBlackoutEvents || 0;
    document.getElementById('kpiMaxApagon').textContent = (simulacion.maxBlackoutDurationHours || 0).toFixed(1) + ' hrs';
}

export function actualizarKPIsFinancieros(finanzas, capexTotal, simulacion, config) {
    const formatMXN = (val) => val.toLocaleString('es-MX', { 
        style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 
    });

    // 🟢 MATEMÁTICA DE CONTINUIDAD CORREGIDA (Apagones Evitados)
    let ahorroPorResiliencia = 0;
    
    if (simulacion && config) {
        // 1. ¿Cuántos apagones habría SIN BATERÍA? (Física estadística)
        const totalGridOutageHours = 8760 * (1 - (config.fallaRed / 100));
        const totalGridEvents = totalGridOutageHours / 2; // Asumimos duración media de 2hrs por evento en México

        // 2. ¿Cuántos apagones logramos EVITAR gracias al BESS?
        const avoidedHours = Math.max(0, totalGridOutageHours - (simulacion.totalBlackoutHours || 0));
        const avoidedEvents = Math.max(0, totalGridEvents - (simulacion.totalBlackoutEvents || 0));

        // 3. Multiplicador según el tipo seleccionado por el usuario
        if (config.tipoCostoApagon === 'hora') {
            ahorroPorResiliencia = avoidedHours * config.costoApagon;
        } else {
            ahorroPorResiliencia = avoidedEvents * config.costoApagon;
        }
    }
    
    const ahorroTotalIntegral = finanzas.ahorroAnual + ahorroPorResiliencia;

    const elGastoOrig = document.getElementById('kpiGastoOriginal');
    const elGastoNuevo = document.getElementById('kpiGastoNuevo');
    const elAhorro = document.getElementById('kpiAhorro');
    const elROI = document.getElementById('kpiROI');

    if (elGastoOrig) elGastoOrig.textContent = formatMXN(finanzas.gastoOriginal);
    if (elGastoNuevo) elGastoNuevo.textContent = formatMXN(finanzas.gastoNuevo);
    
    if (elAhorro) {
        elAhorro.innerHTML = ahorroPorResiliencia > 0 
            ? `${formatMXN(ahorroTotalIntegral)} <br><span style="font-size: 0.6em; color: var(--accent);">Incluye ${formatMXN(ahorroPorResiliencia)} extra por evitar paros operativos</span>`
            : formatMXN(finanzas.ahorroAnual);
    }

    if (elROI) {
        if (ahorroTotalIntegral > 0 && capexTotal > 0) {
            const roiAños = capexTotal / ahorroTotalIntegral;
            elROI.innerHTML = `${roiAños.toFixed(1)} <span>Años</span>`;
            
            // 🟢 DISPARAMOS LA GRÁFICA DE CASHFLOW
            // Actualizamos la etiqueta (badge)
            const badge = document.getElementById('roiBadge');
            if(badge) badge.textContent = `Retorno en el Mes ${Math.round(roiAños * 12)}`;
            
            // Si la importas directo en main.js, dispárala allá. Si no, hazlo aquí.
        } else {
            elROI.innerHTML = `N/A`;
        }
    }
// 🟢 FIX 2: Retornar el valor para que main.js pueda usarlo en la gráfica
    return {
        ahorroTotal: ahorroTotalIntegral,
        gastoNuevo: finanzas.gastoNuevo
    }; 
}

export function calcularFinanzas(config, capacidadBateriaReal) {
    const potenciaKWp = config.panelArea * config.nominalEfficiency; 
    const unitPanel = getInputValue('costoPanelWp', 6.00);
    const unitBateria = getInputValue('costoBateriaKWh', 7000);
    const unitInversor = getInputValue('costoInversorKW', 2000);

    // 🟢 EL COSTO RESPONDE DIRECTAMENTE AL TIPO DE SEGUIDOR Y ENFRIAMIENTO (Justificación al Profesor)
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

    const totalCAPEX = (capexFV + capexBESS + capexInversor) * 1.15;

    const kpiElement = document.getElementById('kpiCapex');
    if (kpiElement) kpiElement.textContent = totalCAPEX.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MXN';
    
    return totalCAPEX;
}

export function getSelectedDay(dailyResults) {
    // ... (El código de getSelectedDay se mantiene intacto)
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
        if (quiereFinDeSemana) return d.date.getMonth() === targetMonth && diaSemana === 0;
        else return d.date.getMonth() === targetMonth && diaSemana === 3;
    });
    return diaEncontrado || dailyResults[0]; 
}