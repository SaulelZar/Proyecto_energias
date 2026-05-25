// ============================================
// weather.js
// Modelos meteorológicos
// ============================================



// ============================================
// FACTOR DE NUBOSIDAD
// ============================================

export function cloudFactor(cloudCover) {

    // cloudCover: 0 - 100 %

    return 1 - (cloudCover / 100) * 0.75;
}



// ============================================
// CORRECCION POR HUMEDAD
// ============================================

export function humidityFactor(humidity) {

    // humedad relativa %

    return 1 - humidity * 0.001;
}



// ============================================
// ENFRIAMIENTO POR VIENTO
// ============================================

export function windCooling(

    panelTemperature,

    windSpeed

) {

    return panelTemperature -
        windSpeed * 0.5;
}



// ============================================
// PERDIDAS POR LLUVIA
// ============================================

export function rainFactor(rainMM) {

    if (rainMM <= 0) {

        return 1;
    }

    return Math.max(
        0.7,
        1 - rainMM * 0.02
    );
}



// ============================================
// FACTOR CLIMATICO TOTAL
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
// CLIMA HORARIO
// ============================================

export async function fetchHourlyWeather(

    latitude,

    longitude

) {

    const url =

`https://api.open-meteo.com/v1/forecast
?latitude=${latitude}
&longitude=${longitude}
&hourly=
temperature_2m,
relative_humidity_2m,
cloud_cover,
wind_speed_10m
&forecast_days=1`;


    const response =
        await fetch(url);

    const data =
        await response.json();


    return data.hourly.time.map((time, index) => ({

        time,

        temperature:
            data.hourly.temperature_2m[index],

        humidity:
            data.hourly.relative_humidity_2m[index],

        cloudCover:
            data.hourly.cloud_cover[index],

        windSpeed:
            data.hourly.wind_speed_10m[index]
    }));
}