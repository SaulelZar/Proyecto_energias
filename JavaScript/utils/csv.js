// ============================================
// csv.js
// Manejo de archivos CSV
// ============================================



// ============================================
// LEER ARCHIVO CSV
// ============================================

export function readCSV(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();


        reader.onload = (event) => {

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
    });
}




// ============================================
// PARSER CSV
// ============================================

export function parseCSV(text) {

    const lines =
        text.trim().split('\n');


    const headers =
        lines[0]
        .split(',')
        .map(h => h.trim());


    const rows = [];


    for (let i = 1; i < lines.length; i++) {

        const values =
            lines[i]
            .split(',')
            .map(v => v.trim());


        const row = {};


        headers.forEach((header, index) => {

            const value = values[index];


            // Intentar convertir a número
            const numeric =
                Number(value);


            row[header] =
                isNaN(numeric)
                ? value
                : numeric;
        });


        rows.push(row);
    }


    return rows;
}

// ============================================
// PERFIL DE CONSUMO
// ============================================

export function consumptionProfile(

    csvData,

    column = 'consumption'

) {

    return csvData.map(
        row => row[column]
    );
}