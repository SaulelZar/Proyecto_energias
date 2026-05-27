// ============================================
// csv.js
// Manejo de archivos CSV
// ============================================




// ============================================
// LEER ARCHIVO CSV
// ============================================

export function readCSV(

    file

) {

    return new Promise(

        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload = (

                event

            ) => {

                try {

                    const text =

                        event.target.result;


                    const data =

                        parseCSV(text);


                    resolve(data);

                } catch (error) {

                    reject(error);
                }
            };


            reader.onerror = () => {

                reject(

                    new Error(
                        'Error leyendo CSV'
                    )
                );
            };


            reader.readAsText(file);
        }
    );
}




// ============================================
// PARSE CSV
// ============================================

export function parseCSV(

    text,

    delimiter = ','

) {

    // ========================================
    // LIMPIEZA UTF-8 BOM
    // ========================================

    text = text.replace(
        /^\uFEFF/,
        ''
    );


    // ========================================
    // LINEAS VALIDAS
    // ========================================

    const lines =

        text

            .split('\n')

            .map(
                line => line.trim()
            )

            .filter(
                line => line.length > 0
            );


    if (lines.length === 0) {

        throw new Error(
            'CSV vacío'
        );
    }


    // ========================================
    // HEADERS
    // ========================================

    const headers =

        splitCSVLine(

            lines[0],

            delimiter
        );


    // ========================================
    // ROWS
    // ========================================

    const rows = [];


    for (

        let i = 1;

        i < lines.length;

        i++

    ) {

        const values =

            splitCSVLine(

                lines[i],

                delimiter
            );


        const row = {};


        headers.forEach(

            (header, index) => {

                const rawValue =
                    values[index];


                if (

                    rawValue === undefined ||

                    rawValue === ''

                ) {

                    row[header] =
                        null;

                    return;
                }


                // ====================================
                // SOPORTE PARA COMAS DECIMALES
                // ====================================

                const normalized =

                    String(rawValue)
                        .replace(',', '.');


                const numeric =
                    Number(normalized);


                row[header] =

                    isNaN(numeric)

                    ? rawValue

                    : numeric;
            }
        );


        rows.push(row);
    }


    return rows;
}




// ============================================
// SPLIT CSV LINE
// SOPORTE BASICO PARA COMILLAS
// ============================================

export function splitCSVLine(

    line,

    delimiter = ','

) {

    const result = [];

    let current = '';

    let insideQuotes = false;


    for (

        let i = 0;

        i < line.length;

        i++

    ) {

        const char =
            line[i];


        if (char === '"') {

            insideQuotes =
                !insideQuotes;

            continue;
        }


        if (

            char === delimiter &&

            !insideQuotes

        ) {

            result.push(
                current.trim()
            );

            current = '';

            continue;
        }


        current += char;
    }


    result.push(
        current.trim()
    );


    return result;
}




// ============================================
// PERFIL DE CONSUMO SIMPLE
// ============================================

export function consumptionProfile(

    csvData,

    column = 'consumption'

) {

    if (

        !csvData ||

        csvData.length === 0

    ) {

        throw new Error(
            'CSV sin datos'
        );
    }


    if (

        !(column in csvData[0])

    ) {

        throw new Error(

            `Columna "${column}" no encontrada`
        );
    }


    return csvData.map(

        row => {

            const value =
                Number(row[column]);


            return isNaN(value)
                ? 0
                : value;
        }
    );
}


// ============================================
// PERFIL DE CONSUMO 15-MINUTAL (Reemplazar solo esta función en csv.js)
// ============================================

export function intervalConsumptionProfile(
    csvData,
    column = 'Demanda_kW'
) {
    if (!csvData.length) return [];

    if (!(column in csvData[0])) {
        throw new Error(`Columna "${column}" no encontrada`);
    }

    const profile = csvData.map(row => {
        const value = Number(row[column]);
        if (isNaN(value)) return 0;
        
        // 🟢 FIX: Mantenemos la pureza del dato en kW.
        // La conversión a kWh se hará directamente en el nodo de balance (energySystem.js).
        return value; 
    });

    if (profile.length !== 35040) {
        console.warn(`Perfil anual esperado: 35040 intervalos. Recibidos: ${profile.length}`);
    }

    return profile;
}