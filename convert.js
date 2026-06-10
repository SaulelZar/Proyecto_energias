const fs = require('fs');
const path = require('path');

console.log("--- INICIANDO DEPURACIÓN DEL CONVERTIDOR ---");

// Usamos path absoluto para evitar confusiones de ruta
const inputDir = path.resolve('./raw_epw');
const outputDir = path.resolve('./data/climate');

console.log("1. Buscando archivos en:", inputDir);

// Verificar si existe la carpeta
if (!fs.existsSync(inputDir)) {
    console.error("❌ ERROR CRÍTICO: La carpeta 'raw_epw' no existe en la ruta actual.");
    console.error("Asegúrate de estar ejecutando 'node convert.js' dentro de la carpeta raíz donde está 'raw_epw'.");
    process.exit(1);
}

// Listar todo lo que hay en la carpeta para ver qué ve Node
const allFiles = fs.readdirSync(inputDir);
console.log("2. Contenido de la carpeta 'raw_epw':", allFiles);

// Filtrar solo los .epw (ignorando mayúsculas/minúsculas)
const epwFiles = allFiles.filter(f => f.toLowerCase().endsWith('.epw'));
console.log("3. Archivos filtrados (.epw encontrados):", epwFiles.length);

if (epwFiles.length === 0) {
    console.error("❌ ERROR: No se detectaron archivos .epw. ¿Están dentro de la carpeta 'raw_epw'?");
    process.exit(1);
}

// Crear carpeta de salida
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log("4. Carpeta de salida creada correctamente.");
}

// Procesar
epwFiles.forEach(file => {
    console.log(`🚀 Procesando: ${file}...`);
    try {
        const filePath = path.join(inputDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        const dataLines = lines.slice(8).filter(line => line.trim() !== '');
        
        const weatherData = dataLines.map(line => {
            const p = line.split(',');
            if (p.length < 22) return null;
            return {
                temp: parseFloat(p[6]),
                hum: parseFloat(p[8]),
                ghi: parseFloat(p[13]),
                dni: parseFloat(p[14]),
                dhi: parseFloat(p[15]),
                windSpeed: parseFloat(p[21])
            };
        }).filter(item => item !== null);

        const outName = file.replace(/\.epw/i, '.json').toLowerCase();
        fs.writeFileSync(path.join(outputDir, outName), JSON.stringify(weatherData));
        console.log(`✅ ÉXITO: ${outName} (${weatherData.length} registros guardados)`);
        
    } catch (err) {
        console.error(`❌ Error procesando ${file}:`, err.message);
    }
});

console.log("--- PROCESO FINALIZADO ---");