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

            weatherData.temperature ?? 25,

        humidity:

            weatherData.humidity ?? 50,

        cloudCover:

            weatherData.cloudCover ?? 0,

        windSpeed:

            weatherData.windSpeed ?? 0,

        rainMM:

            weatherData.rainMM ?? 0
    };
}




// ============================================
// CLIMA HORARIO
// ============================================

export async function fetchHourlyWeather(

    latitude,

    longitude

) {

    try {

        const url =

            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation&forecast_days=1`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                'Weather API error'
            );
        }


        const data =
            await response.json();


        return data.hourly.time.map(

            (time, index) => ({

                time,

                temperature:

                    data.hourly
                    .temperature_2m[index],

                humidity:

                    data.hourly
                    .relative_humidity_2m[index],

                cloudCover:

                    data.hourly
                    .cloud_cover[index],

                windSpeed:

                    data.hourly
                    .wind_speed_10m[index],

                rainMM:

                    data.hourly
                    .precipitation[index]
            })
        );

    } catch (error) {

        console.error(

            'Weather fetch failed:',

            error
        );


        // ====================================
        // FALLBACK
        // ====================================

        return Array.from(

            { length: 24 },

            (_, hour) => ({

                hour,

                temperature: 25,

                humidity: 50,

                cloudCover: 0,

                windSpeed: 0,

                rainMM: 0
            })
        );
    }
}