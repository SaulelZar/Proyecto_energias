// ============================================
// geometry.js
// Geometría y posición solar
// ============================================


// ============================================
// CONSTANTESS
// ============================================

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;


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
// DIA JULIANO SIMPLIFICADO
// ============================================

export function getDayOfYear(date) {

    const start = new Date(date.getFullYear(), 0, 0);

    const diff = date - start;

    const oneDay = 1000 * 60 * 60 * 24;

    return Math.floor(diff / oneDay);
}


// ============================================
// DECLINACION SOLAR
// ============================================

export function solarDeclination(dayOfYear) {

    return 23.45 *
        Math.sin(
            deg2rad(
                (360 / 365) * (284 + dayOfYear)
            )
        );
}


// ============================================
// ECUACION DEL TIEMPO
// ============================================

export function equationOfTime(dayOfYear) {

    const B = deg2rad(
        (360 / 365) * (dayOfYear - 81)
    );

    return 9.87 * Math.sin(2 * B)
        - 7.53 * Math.cos(B)
        - 1.5 * Math.sin(B);
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

    return localTime +
        (
            4 * (longitude - standardMeridian)
            + equationTime
        ) / 60;
}


// ============================================
// ANGULO HORARIO
// ============================================

export function hourAngle(localSolarTime) {

    return 15 * (localSolarTime - 12);
}


// ============================================
// ANGULO ZENITH
// ============================================

export function solarZenith(
    latitude,
    declination,
    hourAngleDeg
) {

    const latRad = deg2rad(latitude);
    const decRad = deg2rad(declination);
    const hraRad = deg2rad(hourAngleDeg);

    const cosThetaZ =
        Math.sin(latRad) * Math.sin(decRad)
        +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(hraRad);

    return rad2deg(
        Math.acos(cosThetaZ)
    );
}


// ============================================
// ELEVACION SOLAR
// ============================================

export function solarElevation(zenith) {

    return 90 - zenith;
}

// ============================================
// AZIMUTH SOLAR
// ============================================

export function solarAzimuth(
    latitude,
    declination,
    hourAngleDeg,
    zenith
) {

    const latRad = deg2rad(latitude);
    const decRad = deg2rad(declination);
    const hraRad = deg2rad(hourAngleDeg);
    const zenithRad = deg2rad(zenith);

    const sinAzimuth =
        (
            Math.cos(decRad) *
            Math.sin(hraRad)
        ) / Math.sin(zenithRad);

    const cosAzimuth =
        (
            Math.sin(decRad)
            -
            Math.sin(latRad) *
            Math.cos(zenithRad)
        )
        /
        (
            Math.cos(latRad) *
            Math.sin(zenithRad)
        );

    let azimuth = rad2deg(
        Math.atan2(sinAzimuth, cosAzimuth)
    );

    azimuth = (azimuth + 360) % 360;

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

    // Hora decimal local
    const localTime =
        date.getHours()
        +
        date.getMinutes() / 60
        +
        date.getSeconds() / 3600;

    // Día del año
    const day = getDayOfYear(date);

    // Declinación
    const declination =
        solarDeclination(day);

    // Equation of time
    const eot =
        equationOfTime(day);

    // Tiempo solar
    const solarTime =
        localSolarTime(
            localTime,
            longitude,
            standardMeridian,
            eot
        );

    // Hour angle
    const hra =
        hourAngle(solarTime);

    // Zenith
    const zenith =
        solarZenith(
            latitude,
            declination,
            hra
        );

    // Elevación
    const elevation =
        solarElevation(zenith);

    // Azimuth
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