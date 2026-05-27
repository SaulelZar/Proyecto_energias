const fs = require('fs');

// ============================================
// GENERAR PERFIL DE DEMANDA (CORREGIDO)
// ============================================

function generarPerfilDemanda(config) {

    const {
        demandaMaxima,
        factorPlanta,
        factorPotencia,
        año
    } = config;

    const registros = [];

    const inicio = new Date(Date.UTC(año, 0, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(año, 11, 31, 23, 45, 0));

    let actual = new Date(inicio);

    while (actual <= fin) {

        const mes = actual.getUTCMonth() + 1;
        const hora = actual.getUTCHours();
        const dia = actual.getUTCDay();
        const minuto = actual.getUTCMinutes();

        const esVerano = [6, 7, 8, 9].includes(mes);
        const esFinSemana = (dia === 0 || dia === 6);

        // ====================================
        // PERFIL HORARIO
        // ====================================

        let factorHorario = 0.5;

        if (hora >= 8 && hora < 18) {
            factorHorario = 1.0;
        } else if (hora >= 18 && hora < 22) {
            factorHorario = 0.8;
        } else if (hora >= 6 && hora < 8) {
            factorHorario = 0.7;
        }

        // ====================================
        // FACTORES
        // ====================================

        const factorEstacional = esVerano ? 1.15 : 1.0;
        const factorSemana = esFinSemana ? 0.7 : 1.0;

        let kw =
            demandaMaxima *
            factorPlanta *
            factorHorario *
            factorEstacional *
            factorSemana;

        kw *= (0.95 + Math.random() * 0.1);
        kw = Math.min(kw, demandaMaxima);

        const kva = kw / factorPotencia;

        // ====================================
        // REGISTRO LIMPIO (IMPORTANTE)
        // ====================================

        registros.push({
            timestamp: actual.toISOString(),

            year: año,
            month: mes,
            day: actual.getUTCDate(),
            hour: hora,
            minutes: minuto,

            kw: Number(kw.toFixed(3)),
            kva: Number(kva.toFixed(3)),

            fp: factorPotencia
        });

        actual.setMinutes(actual.getMinutes() + 15);
    }

    return registros;
}

// ============================================
// EXPORTAR CSV (CORREGIDO)
// ============================================

function exportarCSV(datos, nombreArchivo) {

    const encabezados = [
        "timestamp",
        "year",
        "month",
        "day",
        "hour",
        "minutes",
        "kw",
        "kva",
        "factor_potencia"
    ];

    const filas = datos.map(d =>
        [
            d.timestamp,
            d.year,
            d.month,
            d.day,
            d.hour,
            d.minutes,
            d.kw,
            d.kva,
            d.fp
        ].join(',')
    );

    const csv = [
        encabezados.join(','),
        ...filas
    ].join('\n');

    fs.writeFileSync(nombreArchivo, csv);

    console.log(`CSV generado correctamente: ${nombreArchivo}`);
}

// ============================================
// EJECUCIÓN
// ============================================

const perfil = generarPerfilDemanda({
    demandaMaxima: 50,
    factorPlanta: 0.65,
    factorPotencia: 0.90,
    año: 2026
});

exportarCSV(perfil, './output/perfil_industrial.csv');