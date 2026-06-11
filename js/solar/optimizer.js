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
    const modo = document.getElementById('modoAutoSizing')?.value || 'net_zero'; 
    const textoOriginal = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = "⏳ Calculando arquitectura (Bisección)...";
        btn.disabled = true;
    }

    // 🟢 FIX: Función inyectora segura (Programación Defensiva)
    const setUIValue = (id, valor) => {
        const el = document.getElementById(id);
        if (el) el.value = valor;
        else console.warn(`[Optimizer] Input '${id}' no encontrado en la UI. El valor calculado fue: ${valor}`);
    };

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
            if (typeof c === 'number' || (typeof c === 'string' && !isNaN(c))) {
                kw = Number(c);
            } else if (typeof c === 'object' && c !== null) {
                // 🟢 FIX: Buscar explícitamente 'consumoKW' (Perfil Sintético/Normalizado)
                let val = c.consumoKW ?? c.kw ?? c.consumption ?? c.Demanda ?? c.demand ?? c['Demanda (kW)'];
                
                // Eliminamos Object.values(c)[0] para evitar que se robe el número de Año
                if (val !== undefined && val !== null) {
                    kw = Number(val);
                }
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
            
            setUIValue('area', areaSugerida); // Inyección Segura
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
        
        setUIValue('inversorAC', inversorComercial); // Inyección Segura
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
        setUIValue('capacidadBateria', bateriaComercial); // Inyección Segura
        
        let reservaOptima = (modo === 'fixed_area') ? 80 : (modo === 'off_grid' ? 15 : 30);
        setUIValue('reservaRespaldo', reservaOptima); // Inyección Segura

        // Avisamos al main.js que ya terminamos de manipular el DOM
        if (typeof callbackRender === 'function') {
            await callbackRender();
        }

    } catch (err) {
        console.error("Error en auto-dimensionamiento:", err);
        alert("Ocurrió un error al intentar dimensionar el sistema.");
    } finally {
        if (btn) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    }
}