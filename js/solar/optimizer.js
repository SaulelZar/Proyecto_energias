// ============================================
// optimizer.js
// Algoritmo de dimensionamiento automático
// ============================================

import { simulateYear } from './yearly.js';

export async function autoDimensionarSistema(configOriginal, hourlyWeather, currentCsvData, callbackRender) {
    if (currentCsvData.length === 0) {
        alert("Primero sube un archivo CSV con la demanda de la planta.");
        return;
    }

    const btn = document.getElementById('btnAutoSizing');
    const modo = document.getElementById('modoAutoSizing').value; 
    const textoOriginal = btn.innerHTML;
    
    btn.innerHTML = "⏳ Calculando arquitectura (Bisección)...";
    btn.disabled = true;

    try {
        let config = { ...configOriginal };
        
        let simPrueba = simulateYear({
            ...config,
            hourlyWeather,
            annualConsumption: currentCsvData,
            batteryConfig: { capacityKWh: 1, initialSOC: 0.5 }
        });

        const consumoTotal = simPrueba.annualConsumptionEnergy;

        let maxDemandaKW = 0;
        currentCsvData.forEach(c => {
            let kw = 0;
            if (typeof c === 'number' || (typeof c === 'string' && !isNaN(c))) kw = Number(c);
            else if (typeof c === 'object' && c !== null) {
                let val = c.consumption ?? c.Demanda ?? c.demand ?? c.kW ?? c['Demanda (kW)'] ?? Object.values(c)[0];
                kw = Number(val);
            }
            if (kw > maxDemandaKW) maxDemandaKW = kw;
        });
        if (maxDemandaKW === 0) maxDemandaKW = 50; 

        // 1. PANELES
        if (modo === 'net_zero' || modo === 'off_grid') {
            const generacionActual = simPrueba.annualEnergy;
            const areaOptima = config.panelArea * (consumoTotal / generacionActual);
            const factorSeguridad = (modo === 'off_grid') ? 1.20 : 1.05; 
            const areaSugerida = Math.ceil(areaOptima * factorSeguridad);
            
            document.getElementById('area').value = areaSugerida;
            config.panelArea = areaSugerida;
            
            simPrueba = simulateYear({
                ...config, hourlyWeather, annualConsumption: currentCsvData,
                batteryConfig: { capacityKWh: 1, initialSOC: 0.5 }
            });
        }

        // 2. INVERSOR
        const picoSolarKW = simPrueba.peakPower / 1000;
        const inversorOptimo = Math.max(picoSolarKW, maxDemandaKW) * 1.15; 
        const inversorComercial = Math.ceil(inversorOptimo / 10) * 10; 
        document.getElementById('inversorAC').value = inversorComercial;
        config.inverterAC = inversorComercial;

        // 3. BISECCIÓN (BATERÍA)
        let limiteInferior = 0; 
        let limiteSuperior = consumoTotal / 365 * 6; 
        let iteracion = 0;
        let bateriaOptima = limiteSuperior;

        while ((limiteSuperior - limiteInferior) > 0.5 && iteracion < 50) {
            const puntoMedio = (limiteInferior + limiteSuperior) / 2;
            const simBiseccion = simulateYear({
                ...config, hourlyWeather, annualConsumption: currentCsvData,
                batteryConfig: { capacityKWh: puntoMedio, initialSOC: 0.5 }
            });

            let fallo = (modo === 'off_grid') 
                ? (simBiseccion.solarCoverage < 99.5 || simBiseccion.totalBlackoutEvents > 0)
                : (simBiseccion.totalBlackoutEvents > 0);

            if (fallo) limiteInferior = puntoMedio;
            else { bateriaOptima = puntoMedio; limiteSuperior = puntoMedio; }
            iteracion++;
        }

        // 4. UI Y MÁRGENES
        const bateriaConMargen = bateriaOptima * 1.15;
        const bateriaComercial = Math.ceil(bateriaConMargen / 50) * 50;
        document.getElementById('capacidadBateria').value = bateriaComercial;
        
        let reservaOptima = (modo === 'fixed_area') ? 80 : (modo === 'off_grid' ? 15 : 30);
        document.getElementById('reservaRespaldo').value = reservaOptima;

        // Avisamos al main.js que ya terminamos de manipular el DOM y puede arrancar
        await callbackRender();

    } catch (err) {
        console.error("Error en auto-dimensionamiento:", err);
        alert("Ocurrió un error al intentar dimensionar el sistema.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}