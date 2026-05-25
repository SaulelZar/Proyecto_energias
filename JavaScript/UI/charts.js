// ============================================
// charts.js
// Graficación del sistema
// ============================================



// ============================================
// GRAFICA DE POTENCIA SOLAR
// ============================================

export function createPowerChart(

    canvasId,

    simulation

) {

    const ctx =
        document
        .getElementById(canvasId)
        .getContext('2d');


    const labels =
        simulation.hourly.map(
            h => `${h.hour}:00`
        );


    const power =
        simulation.hourly.map(
            h => h.power
        );


    return new Chart(ctx, {

        type: 'line',

        data: {

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
        },

        options: {

            responsive: true,

            plugins: {

                legend: {

                    display: true
                }
            },

            scales: {

                y: {

                    beginAtZero: true
                }
            }
        }
    });
}




// ============================================
// GRAFICA DE IRRADIANCIA
// ============================================

export function createIrradianceChart(

    canvasId,

    simulation

) {

    const ctx =
        document
        .getElementById(canvasId)
        .getContext('2d');


    const labels =
        simulation.hourly.map(
            h => `${h.hour}:00`
        );


    const poa =
        simulation.hourly.map(
            h => h.poa
        );


    return new Chart(ctx, {

        type: 'line',

        data: {

            labels,

            datasets: [

                {

                    label:
                        'POA Irradiance (W/m²)',

                    data: poa,

                    borderWidth: 2,

                    tension: 0.3
                }
            ]
        },

        options: {

            responsive: true
        }
    });
}




// ============================================
// GRAFICA DE BATERIA
// ============================================

export function createBatteryChart(

    canvasId,

    energyResults

) {

    const ctx =
        document
        .getElementById(canvasId)
        .getContext('2d');


    const labels =
        energyResults.map(
            h => `${h.hour}:00`
        );


    const soc =
        energyResults.map(
            h => h.batterySOC * 100
        );


    return new Chart(ctx, {

        type: 'line',

        data: {

            labels,

            datasets: [

                {

                    label:
                        'Battery SOC (%)',

                    data: soc,

                    borderWidth: 2,

                    tension: 0.3
                }
            ]
        },

        options: {

            responsive: true,

            scales: {

                y: {

                    min: 0,

                    max: 100
                }
            }
        }
    });
}