const fs = require('fs');

function generarPerfilDemanda(config) {
    const { demandaMaxima, factorPlanta, factorPotencia, año } = config;
    const registros = [];

    const inicio = new Date(Date.UTC(año, 0, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(año, 11, 31, 23, 45, 0));

    let actual = new Date(inicio);

    while (actual <= fin) {
        const mes = actual.getUTCMonth() + 1;
        const hora = actual.getUTCHours();
        const dia = actual.getUTCDay();
        const minuto = actual.getUTCMinutes();

        const esVerano = [6, 7, 8, 9].includes(mes); // Junio a Septiembre
        const esFinSemana = (dia === 0 || dia === 6); // Domingo(0) o Sábado(6)

        // ====================================
        // CURVA BASE (Turnos)
        // ====================================
        let factorHorario = 0.4; // Consumo base nocturno

        if (hora >= 8 && hora < 18) {
            factorHorario = 1.0; // Turno principal (100%)
        } else if (hora >= 18 && hora < 22) {
            factorHorario = 0.7; // Turno tarde (70%)
        }

        // ====================================
        // 🟢 DIFERENCIADORES SOLICITADOS
        // ====================================
        
        // 1. Efecto de Fin de Semana (Planta en mantenimiento/guardia)
        if (esFinSemana) {
            factorHorario *= 0.3; // Cae al 30% de la capacidad
        }

        // 2. Efecto Estacional (Aires acondicionados / Chiller en Verano)
        if (esVerano) {
            factorHorario *= 1.2; // Aumenta 20%
        } else if ([12, 1, 2].includes(mes)) {
            factorHorario *= 0.9; // Invierno (menor carga térmica)
        }

        const kw = demandaMaxima * factorPlanta * factorHorario;
        // Simulamos fluctuaciones aleatorias menores (ruido industrial del 5%)
        const kwConRuido = kw * (1 + (Math.random() * 0.05 - 0.025)); 
        
        const kva = kwConRuido / factorPotencia;

        registros.push({
            timestamp: actual.toISOString(),
            year: año, month: mes, day: actual.getUTCDate(),
            hour: hora, minutes: minuto,
            kw: Number(kwConRuido.toFixed(3)),
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