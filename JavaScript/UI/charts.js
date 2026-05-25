// ============================================
// charts.js
// Graficación del sistema
// ============================================




// ============================================
// REGISTRO DE CHARTS
// ============================================

const chartRegistry = {};




// ============================================
// DESTRUIR CHART PREVIO
// ============================================

function destroyChart(

    canvasId

) {

    if (chartRegistry[canvasId]) {

        chartRegistry[canvasId]
            .destroy();
    }
}




// ============================================
// CREAR CHART BASE
// ============================================

function createLineChart({

    canvasId,

    labels,

    datasets,

    yMin = null,

    yMax = null

}) {

    destroyChart(canvasId);


    const ctx =

        document
            .getElementById(canvasId)
            .getContext('2d');


    const chart =

        new Chart(ctx, {

            type: 'line',

            data: {

                labels,

                datasets
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    mode: 'index',

                    intersect: false
                },

                plugins: {

                    legend: {

                        display: true
                    }
                },

                scales: {

                    y: {

                        beginAtZero: true,

                        min: yMin,

                        max: yMax
                    }
                }
            }
        });


    chartRegistry[canvasId] =
        chart;


    return chart;
}




// ============================================
// GRAFICA DE POTENCIA
// ============================================

export function createPowerChart(

    canvasId,

    simulation

) {

    const labels =

        simulation.hourly.map(

            h => `${h.hour}:00`
        );


    const power =

        simulation.hourly.map(
            h => h.power
        );


    return createLineChart({

        canvasId,

        labels,

        datasets: [

            {

                label:
                    'Potencia Solar (W)',

                data: power,

                borderWidth: 2,

                tension: 0.3
            }
        ]
    });
}




// ============================================
// GRAFICA DE IRRADIANCIA
// ============================================

export function createIrradianceChart(

    canvasId,

    simulation

) {

    const labels =

        simulation.hourly.map(

            h => `${h.hour}:00`
        );


    const poa =

        simulation.hourly.map(
            h => h.poa
        );


    const dni =

        simulation.hourly.map(
            h => h.dni || 0
        );


    const ghi =

        simulation.hourly.map(
            h => h.ghi || 0
        );


    return createLineChart({

        canvasId,

        labels,

        datasets: [

            {

                label:
                    'POA (W/m²)',

                data: poa,

                borderWidth: 2,

                tension: 0.3
            },

            {

                label:
                    'DNI (W/m²)',

                data: dni,

                borderWidth: 1,

                tension: 0.3
            },

            {

                label:
                    'GHI (W/m²)',

                data: ghi,

                borderWidth: 1,

                tension: 0.3
            }
        ]
    });
}




// ============================================
// GRAFICA DE BATERIA
// ============================================

export function createBatteryChart(

    canvasId,

    energyResults

) {

    const labels =

        energyResults.map(

            h => `${h.hour}:00`
        );


    const soc =

        energyResults.map(

            h => h.batterySOC * 100
        );


    return createLineChart({

        canvasId,

        labels,

        datasets: [

            {

                label:
                    'Battery SOC (%)',

                data: soc,

                borderWidth: 2,

                tension: 0.3
            }
        ],

        yMin: 0,

        yMax: 100
    });
}




// ============================================
// GRAFICA DE TEMPERATURA
// ============================================

export function createTemperatureChart(

    canvasId,

    simulation

) {

    const labels =

        simulation.hourly.map(

            h => `${h.hour}:00`
        );


    const temperatures =

        simulation.hourly.map(

            h => h.panelTemp
        );


    return createLineChart({

        canvasId,

        labels,

        datasets: [

            {

                label:
                    'Panel Temperature (°C)',

                data: temperatures,

                borderWidth: 2,

                tension: 0.3
            }
        ]
    });
}