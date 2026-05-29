// ============================================
// geometry.js
// Geometría y posición solar
// ============================================



// ============================================
// CONSTANTES
// ============================================

export const DEG2RAD =
    Math.PI / 180;

export const RAD2DEG =
    180 / Math.PI;




// ============================================
// UTILIDADES
// ============================================

export function clamp(

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
// CONVERSIONES
// ============================================

export function deg2rad(degrees) {

    return degrees * DEG2RAD;
}


export function rad2deg(radians) {

    return radians * RAD2DEG;
}




// ============================================
// DIA DEL AÑO
// ============================================

export function getDayOfYear(date) {

    const start =
        new Date(
            date.getFullYear(),
            0,
            0
        );

    const diff =
        date - start;

    const oneDay =
        1000 * 60 * 60 * 24;

    return Math.floor(
        diff / oneDay
    );
}




// ============================================
// DECLINACION SOLAR
// ============================================

export function solarDeclination(

    dayOfYear

) {

    return (

        23.45 *

        Math.sin(

            deg2rad(

                (360 / 365) *
                (284 + dayOfYear)
            )
        )
    );
}




// ============================================
// ECUACION DEL TIEMPO
// ============================================

export function equationOfTime(

    dayOfYear

) {

    const B = deg2rad(

        (360 / 365) *
        (dayOfYear - 81)
    );


    return (

        9.87 * Math.sin(2 * B)

        -

        7.53 * Math.cos(B)

        -

        1.5 * Math.sin(B)
    );
}




// ============================================
// TIEMPO SOLAR LOCAL
// ============================================

export function localSolarTime(

    localTime,

    longitude,

    standardMeridian,

    equationTime

) {

    return (

        localTime +

        (
            4 *
            (longitude - standardMeridian)

            +

            equationTime
        ) / 60
    );
}




// ============================================
// ANGULO HORARIO
// ============================================

export function hourAngle(

    localSolarTime

) {

    return 15 *
        (localSolarTime - 12);
}




// ============================================
// ANGULO ZENITH
// ============================================

export function solarZenith(

    latitude,

    declination,

    hourAngleDeg

) {

    const latRad =
        deg2rad(latitude);

    const decRad =
        deg2rad(declination);

    const hraRad =
        deg2rad(hourAngleDeg);


    let cosThetaZ =

        Math.sin(latRad) *

        Math.sin(decRad)

        +

        Math.cos(latRad) *

        Math.cos(decRad) *

        Math.cos(hraRad);


    // ========================================
    // ESTABILIDAD NUMERICA
    // ========================================

    cosThetaZ =
        clamp(
            cosThetaZ,
            -1,
            1
        );


    return rad2deg(

        Math.acos(cosThetaZ)
    );
}




// ============================================
// ELEVACION SOLAR
// ============================================

export function solarElevation(

    zenith

) {

    return 90 - zenith;
}




// ============================================
// AZIMUTH SOLAR
// Convención:
// 0° = Norte
// 90° = Este
// 180° = Sur
// 270° = Oeste
// ============================================

export function solarAzimuth(

    latitude,

    declination,

    hourAngleDeg,

    zenith

) {

    // ========================================
    // SOL CENITAL
    // ========================================

    if (zenith <= 0.0001) {

        return 180;
    }


    const latRad =
        deg2rad(latitude);

    const decRad =
        deg2rad(declination);

    const hraRad =
        deg2rad(hourAngleDeg);

    const zenithRad =
        deg2rad(zenith);


    const sinZenith =
        Math.sin(zenithRad);


    // ========================================
    // EVITAR DIVISIONES PELIGROSAS
    // ========================================

    if (Math.abs(sinZenith) < 1e-10) {

        return 180;
    }


    let cosAzimuth =

        (

            Math.sin(decRad)

            -

            Math.sin(latRad) *
            Math.cos(zenithRad)

        )

        /

        (

            Math.cos(latRad) *
            sinZenith
        );


    // ========================================
    // ESTABILIDAD NUMERICA
    // ========================================

    cosAzimuth =
        clamp(
            cosAzimuth,
            -1,
            1
        );


    let azimuth = rad2deg(

        Math.acos(cosAzimuth)
    );


    // ========================================
    // AJUSTE MAÑANA/TARDE
    // ========================================

    if (hourAngleDeg > 0) {

        azimuth =
            360 - azimuth;
    }


    return azimuth;
}




// ============================================
// POSICION SOLAR COMPLETA
// ============================================

export function solarPosition(

    date,

    latitude,

    longitude,

    standardMeridian

) {

    // ========================================
    // HORA LOCAL DECIMAL
    // ========================================

    const localTime =

        date.getHours()

        +

        date.getMinutes() / 60

        +

        date.getSeconds() / 3600;


    // ========================================
    // DIA DEL AÑO
    // ========================================

    const day =
        getDayOfYear(date);


    // ========================================
    // DECLINACION
    // ========================================

    const declination =
        solarDeclination(day);


    // ========================================
    // ECUACION DEL TIEMPO
    // ========================================

    const eot =
        equationOfTime(day);


    // ========================================
    // TIEMPO SOLAR
    // ========================================

    const solarTime =

        localSolarTime(

            localTime,

            longitude,

            standardMeridian,

            eot
        );


    // ========================================
    // ANGULO HORARIO
    // ========================================

    const hra =
        hourAngle(solarTime);


    // ========================================
    // ZENITH
    // ========================================

    const zenith =

        solarZenith(

            latitude,

            declination,

            hra
        );


    // ========================================
    // ELEVACION
    // ========================================

    const elevation =
        solarElevation(zenith);


    // ========================================
    // AZIMUTH
    // ========================================

    const azimuth =

        solarAzimuth(

            latitude,

            declination,

            hra,

            zenith
        );


    return {

        dayOfYear: day,

        declination,

        equationOfTime: eot,

        solarTime,

        hourAngle: hra,

        zenith,

        elevation,

        azimuth
    };
}