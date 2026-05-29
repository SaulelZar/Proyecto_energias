// ============================================
// weather.js
// Modelos meteorológicos
// ============================================




// ============================================
// CLAMP
// ============================================

function clamp(

    value,

    min,

    max

) {

    return Math.min(
        max,
        Math.max(min, value)
    );
}




// ============================================
// FACTOR DE NUBOSIDAD
// ============================================

export function cloudFactor(

    cloudCover

) {

    // cloudCover: 0 - 100 %

    const factor =

        1 -

        (cloudCover / 100) *
        0.75;


    return clamp(
        factor,
        0.1,
        1
    );
}




// ============================================
// FACTOR DE HUMEDAD
// ============================================

export function humidityFactor(

    humidity

) {

    const factor =

        1 -
        humidity * 0.001;


    return clamp(
        factor,
        0.7,
        1
    );
}




// ============================================
// ENFRIAMIENTO POR VIENTO
// ============================================

export function windCooling(

    panelTemperature,

    windSpeed

) {

    return (

        panelTemperature -

        windSpeed * 0.5
    );
}




// ============================================
// FACTOR DE LLUVIA
// ============================================

export function rainFactor(

    rainMM

) {

    if (rainMM <= 0) {

        return 1;
    }


    const factor =

        1 -
        rainMM * 0.02;


    return clamp(
        factor,
        0.7,
        1
    );
}




// ============================================
// AJUSTE CLIMATICO TOTAL
// ============================================

export function weatherAdjustment({

    cloudCover = 0,

    humidity = 50,

    rainMM = 0

}) {

    return (

        cloudFactor(cloudCover)

        *

        humidityFactor(humidity)

        *

        rainFactor(rainMM)
    );
}




// ============================================
// NORMALIZAR DATOS METEOROLOGICOS
// ============================================

export function normalizeWeatherData(

    weatherData = {}

) {

    return {

        temperature:

            Number(
                weatherData.temperature
            ) || 25,

        humidity:

            Number(
                weatherData.humidity
            ) || 50,

        cloudCover:

            Number(
                weatherData.cloudCover
            ) || 0,

        windSpeed:

            Number(
                weatherData.windSpeed
            ) || 0,

        rainMM:

            Number(
                weatherData.rainMM
            ) || 0
    };
}




// ============================================
// CLIMA HORARIO
// ============================================

// ============================================
// AÑO METEOROLÓGICO TÍPICO Y ESCENARIOS
// (Reemplazar en weather.js)
// ============================================

export async function fetchHourlyWeather(latitude, longitude, profile = 'normal') {
    console.log(`Generando clima sintético. Perfil activado: ${profile}`);

    const weather = [];
    const isNorthern = latitude >= 0;
    const daysInYear = 365;

    for (let day = 0; day < daysInYear; day++) {
        const seasonPhase = Math.cos(((day - 172) / daysInYear) * Math.PI * 2);
        const hemisphereFactor = isNorthern ? 1 : -1;

        let baseTemp = 24 + (10 * seasonPhase * hemisphereFactor);
        let cloudBase = 10;
        let rainBase = 0;

        // Comportamiento base orgánico
        if (seasonPhase * hemisphereFactor > 0.3) {
            cloudBase = 45;
        } else if (seasonPhase * hemisphereFactor < -0.3) {
            cloudBase = 5;
        }

        // 🟢 INYECCIÓN DE CASOS FRONTERA
        if (profile === 'despejado') {
            cloudBase = 0;
            rainBase = 0;
        } else if (profile === 'nublado') {
            cloudBase = 90; // Satura el cielo, destruye la irradiancia directa (DNI)
            rainBase = 2;   // Factor de atenuación por lluvia
        } else if (profile === 'ola_calor') {
            baseTemp += 15; // Desplaza la matriz térmica 15°C hacia arriba
            cloudBase = 0;  // Cielo despejado para maximizar la absorción de calor
        }

        for (let hour = 0; hour < 24; hour++) {
            const dailyPhase = Math.cos(((hour - 15) / 24) * Math.PI * 2);
            let currentTemp = baseTemp + (7 * dailyPhase);

            // Ruido ambiental (si es despejado, forzamos cero ruido)
            let cloudNoise = profile === 'despejado' ? 0 : (Math.random() * 15) - 7.5;
            let currentClouds = Math.max(0, Math.min(100, cloudBase + cloudNoise));

            // Viento de enfriamiento: En ola de calor el aire se estanca
            let currentWind = profile === 'ola_calor' ? 0.5 : 2 + (Math.random() * 3);

            weather.push({
                temperature: Math.max(0, Math.min(60, currentTemp)),
                humidity: profile === 'nublado' ? 95 : 50 + (currentClouds * 0.3),
                cloudCover: currentClouds,
                windSpeed: currentWind,
                rainMM: profile === 'nublado' ? rainBase + Math.random() : 0
            });
        }
    }

    return weather;
}