// ============================================
// weather.js
// Motor Meteorológico Híbrido (Datos Reales TMYx + Respaldo Estocástico)
// Versión Completa con Malla de 50 Ciudades Reales y Trazabilidad SCADA
// ============================================

// ============================================
// 📍 REGISTRO DE ESTACIONES METEOROLÓGICAS (MÉXICO)
// Matriz de coordenadas reales vinculada a tus archivos JSON generados
// ============================================
const ESTACIONES_REALES = [
    { nombre: "Aguascalientes", lat: 21.8818, lon: -102.2915, archivo: "mex_agu_aguascalientes.765710_tmyx.2011-2025.json" },
    { nombre: "Mexicali", lat: 32.6278, lon: -115.4544, archivo: "mex_bcn_mexicali-taboada.intl.ap.760053_tmyx.2011-2025.json" },
    { nombre: "Tijuana", lat: 32.5149, lon: -117.0382, archivo: "mex_bcn_tijuana-rodriguez.intl.ap.760013_tmyx.2011-2025.json" },
    { nombre: "Cabo San Lucas", lat: 22.8905, lon: -109.9167, archivo: "mex_bcs_cabo.san.lucas.intl.ap.767503_tmyx.2011-2025.json" },
    { nombre: "La Paz", lat: 24.1426, lon: -110.3127, archivo: "mex_bcs_la.paz-de.leon.intl.ap.764055_tmyx.2011-2025.json" },
    { nombre: "Campeche", lat: 19.8301, lon: -90.5349, archivo: "mex_cam_campeche-ongay.intl.ap.766950_tmyx.2011-2025.json" },
    { nombre: "Chihuahua", lat: 28.6329, lon: -106.0691, archivo: "mex_chh_chihuahua.762250_tmyx.2011-2025.json" },
    { nombre: "Ciudad Juárez", lat: 31.6903, lon: -106.4245, archivo: "mex_chh_ciudad.juarez-gonzalez.intl.ap.760753_tmyx.2011-2025.json" },
    { nombre: "Tapachula", lat: 14.9046, lon: -92.2677, archivo: "mex_chp_tapachula.769030_tmyx.2011-2025.json" },
    { nombre: "Tuxtla Gutiérrez", lat: 16.7569, lon: -93.1292, archivo: "mex_chp_tuxtla.gutierrez.768430_tmyx.2011-2025.json" },
    { nombre: "Ciudad de México", lat: 19.4326, lon: -99.1332, archivo: "mex_cmx_cuidad.mexico.central.766800_tmyx.2011-2025.json" },
    { nombre: "Monclova", lat: 26.9089, lon: -101.4206, archivo: "mex_coa_monclova.763420_tmyx.2011-2025.json" },
    { nombre: "Saltillo", lat: 25.4215, lon: -100.9731, archivo: "mex_coa_saltillo.763900_tmyx.2011-2025.json" },
    { nombre: "Colima", lat: 19.2452, lon: -103.7240, archivo: "mex_col_colima.766581_tmyx.2011-2025.json" },
    { nombre: "Manzanillo", lat: 19.0527, lon: -104.3161, archivo: "mex_col_manzanillo.766540_tmyx.2011-2025.json" },
    { nombre: "Durango", lat: 24.0277, lon: -104.6531, archivo: "mex_dur_durango.764230_tmyx.2011-2025.json" },
    { nombre: "Acapulco", lat: 16.8531, lon: -99.8236, archivo: "mex_gro_acapulco.768050_tmyx.2011-2025.json" },
    { nombre: "Guanajuato / Bajío", lat: 21.0178, lon: -101.2564, archivo: "mex_gua_guanajuato.765770_tmyx.2011-2025.json" },
    { nombre: "Pachuca", lat: 20.1010, lon: -98.7591, archivo: "mex_hid_pachuca.766320_tmyx.2011-2025.json" },
    { nombre: "Guadalajara", lat: 20.6597, lon: -103.3500, archivo: "mex_jal_guadalajara-chapalita.766120_tmyx.2011-2025.json" },
    { nombre: "Puerto Vallarta", lat: 20.6534, lon: -105.2253, archivo: "mex_jal_puerto.vallarta-ordaz.intl.ap.766013_tmyx.2011-2025.json" },
    { nombre: "Toluca", lat: 19.2826, lon: -99.6556, archivo: "mex_mex_toluca.de.lerdo.766750_tmyx.2011-2025.json" },
    { nombre: "Morelia", lat: 19.7060, lon: -101.1949, archivo: "mex_mic_morelia.766650_tmyx.2011-2025.json" },
    { nombre: "Cuernavaca", lat: 18.9242, lon: -99.2215, archivo: "mex_mor_cuernavaca-matamoros.intl.ap.767260_tmyx.2011-2025.json" },
    { nombre: "Tepic", lat: 21.5040, lon: -104.8946, archivo: "mex_nay_tepic.765560_tmyx.2011-2025.json" },
    { nombre: "Monterrey", lat: 25.6866, lon: -100.3161, archivo: "mex_nle_monterrey.763930_tmyx.2011-2025.json" },
    { nombre: "Oaxaca", lat: 17.0520, lon: -96.7216, archivo: "mex_oax_oaxaca-xoxocotlan.intl.ap.767750_tmyx.2011-2025.json" },
    { nombre: "Salina Cruz", lat: 16.1820, lon: -95.2007, archivo: "mex_oax_salina.cruz.768330_tmyx.2011-2025.json" },
    { nombre: "Puebla", lat: 19.0414, lon: -98.2062, archivo: "mex_pue_puebla.766850_tmyx.2011-2025.json" },
    { nombre: "Querétaro / San Juan del Río", lat: 20.5887, lon: -100.3899, archivo: "mex_que_queretaro.766250_tmyx.2011-2025.json" },
    { nombre: "Cancún", lat: 21.1619, lon: -86.8515, archivo: "mex_roo_cancun.intl.ap.765950_tmyx.2011-2025.json" },
    { nombre: "Chetumal", lat: 18.5001, lon: -88.3053, archivo: "mex_roo_chetumal.intl.ap.767500_tmyx.2011-2025.json" },
    { nombre: "Culiacán", lat: 24.8016, lon: -107.3916, archivo: "mex_sin_culiacan.764120_tmyx.2011-2025.json" },
    { nombre: "Mazatlán", lat: 23.2494, lon: -106.4111, archivo: "mex_sin_mazatlan.764580_tmyx.2011-2025.json" },
    { nombre: "San Luis Potosí", lat: 22.1564, lon: -100.9855, archivo: "mex_slp_san.luis.potosi.765390_tmyx.2011-2025.json" },
    { nombre: "Hermosillo", lat: 29.0729, lon: -110.9559, archivo: "mex_son_hermosillo.761600_tmyx.2011-2025.json" },
    { nombre: "Nogales", lat: 31.3012, lon: -110.9381, archivo: "mex_son_nogales.ap.760801_tmyx.2011-2025.json" },
    { nombre: "Villahermosa", lat: 17.9895, lon: -92.9281, archivo: "mex_tab_villahermosa.767430_tmyx.2011-2025.json" },
    { nombre: "Ciudad Victoria", lat: 23.7369, lon: -99.1373, archivo: "mex_tam_ciudad.victoria.764910_tmyx.2011-2025.json" },
    { nombre: "Matamoros", lat: 25.8690, lon: -97.5027, archivo: "mex_tam_matamoros.city.763990_tmyx.2011-2025.json" },
    { nombre: "Nuevo Laredo", lat: 27.4762, lon: -99.5164, archivo: "mex_tam_nuevo.laredo-quetzalcoatl.intl.ap.762863_tmyx.2011-2025.json" },
    { nombre: "Reynosa", lat: 26.0806, lon: -98.2883, archivo: "mex_tam_reynosa-blanco.intl.ap.763503_tmyx.2011-2025.json" },
    { nombre: "Tampico", lat: 22.2159, lon: -97.8576, archivo: "mex_tam_tampico.765480_tmyx.2011-2025.json" },
    { nombre: "Tlaxcala", lat: 19.3138, lon: -98.2395, archivo: "mex_tla_tlaxcala.766830_tmyx.2011-2025.json" },
    { nombre: "Coatzacoalcos", lat: 18.1408, lon: -94.4646, archivo: "mex_ver_coatzacoalcos.767410_tmyx.2011-2025.json" },
    { nombre: "Minatitlán", lat: 17.9893, lon: -94.5555, archivo: "mex_ver_minatitlan.intl.ap.767383_tmyx.2011-2025.json" },
    { nombre: "Poza Rica", lat: 20.5332, lon: -97.4593, archivo: "mex_ver_poza.rica.ap.765825_tmyx.2011-2025.json" },
    { nombre: "Veracruz", lat: 19.1738, lon: -96.1342, archivo: "mex_ver_veracruz-jara.intl.ap.766913_tmyx.2011-2025.json" },
    { nombre: "Mérida", lat: 20.9674, lon: -89.6237, archivo: "mex_yuc_merida.licenciado.766443_tmyx.2011-2025.json" },
    { nombre: "Zacatecas", lat: 22.7709, lon: -102.5832, archivo: "mex_zac_zacatecas.765260_tmyx.2011-2025.json" }
];

// ============================================
// BUSCADOR GEOGRÁFICO DE NODOS CERCANOS
// Evaluador Euclidiano con filtro de proximidad regional (150 km)
// ============================================
function encontrarEstacionMasCercana(lat, lon, umbralMaximoKM = 150) {
    let estacionOptima = null;
    let distanciaMinima = Infinity;

    ESTACIONES_REALES.forEach(estacion => {
        const dLat = estacion.lat - lat;
        const dLon = estacion.lon - lon;
        const distancia = Math.sqrt(dLat * dLat + dLon * dLon);

        if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            estacionOptima = estacion;
        }
    });

    const distanciaAproximadaKM = distanciaMinima * 111; // 1 grado equivale aprox a 111km
    return (distanciaAproximadaKM <= umbralMaximoKM) ? estacionOptima : null;
}

// ============================================
// ORQUESTADOR CLIMÁTICO PRINCIPAL
// ============================================
export async function fetchHourlyWeather(latitude, longitude, altitude = 0, profile = 'normal') {
    latitude = Number(latitude);
    longitude = Number(longitude);

    const nodoCercano = encontrarEstacionMasCercana(latitude, longitude);

    if (nodoCercano) {
        try {
            const response = await fetch(`./data/climate/${nodoCercano.archivo}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const datosReales = await response.json();

            // 🟢 LOGGER SCADA SOLICITADO: Indica modo real e imprime el nodo asignado
            console.log(`📡 [MOTOR CLIMÁTICO] MODO: DATOS REALES (TMYx Oficial) | ESTACIÓN DE ACOPLE: ${nodoCercano.nombre.toUpperCase()}`);

            return datosReales.map(hora => ({
                temperature: hora.temp,
                humidity: hora.hum,
                ghi: hora.ghi,
                dni: hora.dni,
                dhi: hora.dhi,
                windSpeed: hora.windSpeed,
                cloudCover: hora.ghi > 0 ? clamp((1 - (hora.ghi / 1000)) * 100, 0, 100) : 0
            }));

        } catch (error) {
            // 🟢 LOGGER SCADA SOLICITADO: Caída de archivo, cambia a datos calculados e indica de qué ciudad falló
            console.warn(`🎲 [MOTOR CLIMÁTICO] CRITICAL: Archivo de ${nodoCercano.nombre} inaccesible. MODO: DATOS CALCULADOS (Respaldo Estocástico) | CIUDAD ORIGEN: ${nodoCercano.nombre.toUpperCase()}`);
        }
    } else {
        // 🟢 LOGGER SCADA SOLICITADO: Coordenadas lejanas fuera de la malla de 50 puntos
        console.log(`🌍 [MOTOR CLIMÁTICO] Coordenadas aisladas detectadas. MODO: DATOS CALCULADOS (Simulación Global Hadley-Köppen)`);
    }

    return generarClimaSintetico(latitude, longitude, altitude, profile);
}

// ============================================
// 🛠️ FACTORES AUXILIARES Y DE CONFIGURACIÓN (RESTAURADOS)
// Esto evita el SyntaxError que rompía simulation.js
// ============================================
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function cloudFactor(cloudCover) {
    const factor = 1 - (cloudCover / 100) * 0.75;
    return clamp(factor, 0.1, 1);
}

export function humidityFactor(humidity) {
    const factor = 1 - humidity * 0.001;
    return clamp(factor, 0.7, 1);
}

export function rainFactor(rainMM) {
    if (rainMM <= 0) return 1;
    const factor = 1 - rainMM * 0.02;
    return clamp(factor, 0.7, 1);
}

export function weatherAdjustment({ cloudCover = 0, humidity = 50, rainMM = 0 }) {
    return cloudFactor(cloudCover) * humidityFactor(humidity) * rainFactor(rainMM);
}

export function windCooling(panelTemperature, windSpeed) {
    return panelTemperature - windSpeed * 0.5;
}

// ============================================
// MOTOR ESTOCÁSTICO GLOBAL (EL BACKUP)
// ============================================
function clasificarBioma(latitud, altitud) {
    const lat = Math.abs(latitud);
    const latitudEfectiva = lat + (altitud / 1000) * 10;

    if (latitudEfectiva < 15) {
        return { tipo: 'tropical_humedo', humBase: 80, nubesMax: 85, nubesMin: 30, ampTermica: 6 };
    } else if (latitudEfectiva >= 15 && latitudEfectiva < 35) {
        return { tipo: 'arido_desierto', humBase: 25, nubesMax: 20, nubesMin: 0, ampTermica: 18 };
    } else if (latitudEfectiva >= 35 && latitudEfectiva < 50) {
        return { tipo: 'templado', humBase: 55, nubesMax: 65, nubesMin: 20, ampTermica: 12 };
    } else {
        return { tipo: 'frio_continental', humBase: 65, nubesMax: 80, nubesMin: 40, ampTermica: 22 };
    }
}

function generarClimaSintetico(latitude, longitude, altitude, profile) {
    const bioma = clasificarBioma(latitude, altitude);
    const weather = [];
    const isNorthern = latitude >= 0;
    const daysInYear = 365;

    const altitudeCooling = (altitude / 1000) * 6.5;
    let currentCloudCover = profile === 'nublado' ? 80 : (profile === 'despejado' ? 0 : 20);

    for (let day = 0; day < daysInYear; day++) {
        const seasonPhase = Math.cos(((day - 172) / daysInYear) * Math.PI * 2);
        const hemisphereFactor = isNorthern ? 1 : -1;

        let baseTemp = 24 + (10 * seasonPhase * hemisphereFactor) - altitudeCooling;
        let dailyAmplitude = bioma.ampTermica; 

        if (profile === 'ola_calor') baseTemp += 10;

        let dewPointOffset = (100 - bioma.humBase) / 5; 
        let dewPoint = baseTemp - dewPointOffset + (seasonPhase * hemisphereFactor * 3);
        
        if (profile === 'nublado') dewPoint = baseTemp - 2; 
        if (profile === 'despejado' || profile === 'ola_calor') dewPoint = baseTemp - 15; 

        for (let hour = 0; hour < 24; hour++) {
            const dailyPhase = Math.cos(((hour - 15) / 24) * Math.PI * 2);
            let currentTemp = baseTemp + (dailyAmplitude * dailyPhase);
            currentTemp = Math.max(-15, Math.min(55, currentTemp)); 

            const alpha = 0.85; 
            let targetMean = bioma.humBase * 0.5;

            if (profile === 'despejado' || profile === 'ola_calor') targetMean = 0;
            else if (profile === 'nublado') targetMean = 85;
            else if (seasonPhase * hemisphereFactor > 0.3) targetMean = bioma.nubesMax;
            else if (seasonPhase * hemisphereFactor < -0.3) targetMean = bioma.nubesMin;

            let noise = (Math.random() * 30 - 15); 
            currentCloudCover = (alpha * currentCloudCover) + ((1 - alpha) * targetMean) + noise;
            currentCloudCover = Math.max(0, Math.min(100, currentCloudCover));
            
            if (profile === 'despejado' || profile === 'ola_calor') currentCloudCover = 0;

            const a = 17.27;
            const b = 237.3;
            let e_actual = 6.11 * Math.exp((a * dewPoint) / (b + dewPoint));
            let e_sat = 6.11 * Math.exp((a * currentTemp) / (b + currentTemp));
            
            let humidity = (e_actual / e_sat) * 100;
            humidity = Math.max(10, Math.min(100, humidity));

            let rainMM = (currentCloudCover > 85 && humidity > 75) ? (currentCloudCover - 85) * 0.15 * Math.random() : 0;
            let windBase = profile === 'ola_calor' ? 0.5 : (dailyAmplitude > 12 ? 3 : 1.5);
            let currentWind = windBase + (Math.random() * 2) + (dailyPhase > 0 ? 1.5 : 0);

            weather.push({
                temperature: currentTemp,
                humidity: humidity,
                cloudCover: currentCloudCover,
                windSpeed: currentWind,
                rainMM: rainMM,
                ghi: null, 
                dni: null,
                dhi: null
            });
        }
    }
    return weather;
}