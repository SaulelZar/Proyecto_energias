// ============================================
// csv.js
// Manejo de archivos CSV (Con Normalización Segura)
// ============================================

export function readCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const rawData = parseCSV(text);

                // 🟢 TRADUCTOR UNIVERSAL (POST-PROCESAMIENTO)
                const normalizedData = rawData.map(row => {
                    let valor = 0;
                    const keys = Object.keys(row);
                    
                    // 1. Buscar columna por nombre común
                    const kwKey = keys.find(k => {
                        const lower = k.toLowerCase();
                        return lower.includes('kw') || lower.includes('consumo') || lower.includes('demanda') || lower.includes('power');
                    });

                    if (kwKey && row[kwKey] !== null) {
                        valor = row[kwKey];
                    } else {
                        // 2. Si no hay nombre claro, tomar el primer valor numérico
                        const primerNumero = Object.values(row).find(v => typeof v === 'number' && !isNaN(v));
                        if (primerNumero !== undefined) valor = primerNumero;
                    }

                    return { ...row, consumoKW: Math.max(0, Number(valor) || 0) };
                });

                resolve(normalizedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Error leyendo CSV'));
        reader.readAsText(file);
    });
}

// ============================================
// PARSE CSV
// ============================================
export function parseCSV(text, delimiter = ',') {
    text = text.replace(/^\uFEFF/, ''); // Limpieza UTF-8 BOM

    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) throw new Error('CSV vacío');

    const headers = splitCSVLine(lines[0], delimiter);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i], delimiter);
        const row = {};

        headers.forEach((header, index) => {
            const rawValue = values[index];
            if (rawValue === undefined || rawValue === '') {
                row[header] = null;
                return;
            }

            // Soporte para comas decimales (europeo a americano)
            const normalized = String(rawValue).replace(',', '.');
            const numeric = Number(normalized);
            row[header] = isNaN(numeric) ? rawValue : numeric;
        });
        rows.push(row);
    }
    return rows;
}

// ============================================
// SPLIT CSV LINE (Soporte básico para comillas)
// ============================================
export function splitCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === delimiter && !insideQuotes) {
            result.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    result.push(current.trim());
    return result;
}

// ============================================
// PERFIL DE CONSUMO SIMPLE
// ============================================
export function consumptionProfile(csvData, column = 'consumption') {
    if (!csvData || csvData.length === 0) throw new Error('CSV sin datos');
    if (!(column in csvData[0])) throw new Error(`Columna "${column}" no encontrada`);

    return csvData.map(row => {
        const value = Number(row[column]);
        return isNaN(value) ? 0 : value;
    });
}

// ============================================
// PERFIL DE CONSUMO 15-MINUTAL
// ============================================
export function intervalConsumptionProfile(csvData, column = 'consumoKW') {
    if (!csvData.length) return [];
    if (!(column in csvData[0])) throw new Error(`Columna "${column}" no encontrada`);

    const profile = csvData.map(row => {
        const value = Number(row[column]);
        return isNaN(value) ? 0 : value;
    });

    if (profile.length !== 35040) {
        console.warn(`Perfil anual esperado: 35040 intervalos. Recibidos: ${profile.length}`);
    }
    return profile;
}

// ============================================
// GENERADOR DE PERFIL SINTÉTICO (Adaptado de GenReg.js)
// Genera 35,040 registros en memoria basados en consumo mensual
// ============================================
export function generarPerfilSintetico(consumoMensualKWh, año = 2026) {
    const consumoAnualDeseado = consumoMensualKWh * 12;
    const registros = [];
    
    const inicio = new Date(Date.UTC(año, 0, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(año, 11, 31, 23, 45, 0));
    
    let actual = new Date(inicio);
    let sumaTotalKW_Intervalo = 0;

    // 1. DIBUJAR LA CURVA BASE (Con tu heurística estocástica)
    while (actual <= fin) {
        const mes = actual.getUTCMonth() + 1;
        const hora = actual.getUTCHours();
        const dia = actual.getUTCDay();
        const minuto = actual.getUTCMinutes();

        const esVerano = [6, 7, 8, 9].includes(mes);
        const esFinSemana = (dia === 0 || dia === 6);

        // Turnos
        let factorHorario = 0.4;
        if (hora >= 8 && hora < 18) factorHorario = 1.0;
        else if (hora >= 18 && hora < 22) factorHorario = 0.7;

        // Diferenciadores Industriales
        if (esFinSemana) factorHorario *= 0.3;
        if (esVerano) factorHorario *= 1.2;
        else if ([12, 1, 2].includes(mes)) factorHorario *= 0.9;

        // Ruido del 5%
        const kwConRuido = factorHorario * (1 + (Math.random() * 0.05 - 0.025));

        registros.push({
            year: año, month: mes, day: actual.getUTCDate(),
            hour: hora, minutes: minuto,
            kwBruto: kwConRuido
        });

        sumaTotalKW_Intervalo += kwConRuido;
        actual.setMinutes(actual.getMinutes() + 15);
    }

    // 2. ESCALADOR MATEMÁTICO (Ajustar a lo que pidió el usuario)
    // Energía = Potencia * Tiempo (0.25 h por intervalo)
    const energiaBaseAnual = sumaTotalKW_Intervalo * 0.25; 
    const factorEscala = consumoAnualDeseado / energiaBaseAnual;

    // 3. RETORNAR EL ARREGLO NORMALIZADO (Simulando que se leyó de un CSV)
    return registros.map(r => ({
        year: r.year,
        month: r.month,
        day: r.day,
        hour: r.hour,
        minutes: r.minutes,
        consumoKW: r.kwBruto * factorEscala // Aplicamos el factor para cuadrar los kWh exactos
    }));
}