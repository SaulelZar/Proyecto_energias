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