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


                const numeric =
                    Number(rawValue);


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
// PERFIL DE CONSUMO
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