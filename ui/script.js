let dataPoints = [];
let dataPointCount = 0;
const dataPointCountElement = document.getElementById('dataPointCount');

document.addEventListener('DOMContentLoaded', () => {
    const csvUploadBtn = document.getElementById('csvUploadBtn');
    const csvFile = document.getElementById('csvFile');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    const manualEntryForm = document.getElementById('manualEntryForm');
    const dataForm = document.getElementById('dataForm');
    const predictBtn = document.getElementById('predictBtn');
    const resultsContainer = document.getElementById('resultsContainer');

    csvUploadBtn.addEventListener('click', () => csvFile.click());
    csvFile.addEventListener('change', handleCSVUpload);
    manualEntryBtn.addEventListener('click', () => {
        manualEntryForm.style.display = manualEntryForm.style.display === 'none' ? 'block' : 'none';
    });
    dataForm.addEventListener('submit', handleManualEntry);
    predictBtn.addEventListener('click', predictAnomalies);

    const inputs = document.querySelectorAll('#dataForm input[type="number"]');
    const addDataPointBtn = document.getElementById('addDataPointBtn');

    inputs.forEach(input => {
        input.addEventListener('input', checkFormValidity);
    });

    function checkFormValidity() {
        const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
        addDataPointBtn.disabled = !allFilled;
    }
});

function updateDataPointCount() {
    dataPointCount = dataPoints.length;
    dataPointCountElement.textContent = dataPointCount;
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        dataPoints = lines.slice(1).map(line => {
            const values = line.split(',');
            return values.map(Number);
        }).filter(point => point.length === 5 && !point.some(isNaN));
        updateDataPointCount();
        updateChart();
    };
    reader.readAsText(file);
}

function handleManualEntry(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const dataPoint = Array.from(formData.values()).map(Number);
    dataPoints.push(dataPoint);
    updateDataPointCount();
    event.target.reset();
    updateChart();
}

function predictAnomalies() {
    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: dataPoints }),
    })
    .then(response => response.json())
    .then(data => {
        displayResults(data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function displayResults(results) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';
    results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = result.is_anomaly ? 'anomaly' : 'normal';
        resultDiv.innerHTML = `
            <h3>${result.is_anomaly ? 'Anomaly' : 'Normal'} Data Point</h3>
            <p>Filler %: ${result.filler_percentage.toFixed(2)}</p>
            <p>Impact Energy: ${result.impact_energy.toFixed(2)}</p>
            <p>Absorbed Energy: ${result.absorbed_energy.toFixed(2)}</p>
            <p>COR: ${result.cor.toFixed(2)}</p>
            <p>ELP: ${result.elp.toFixed(2)}</p>
            ${result.is_anomaly ? `<p>Reasons: ${result.anomaly_reasons.join(', ')}</p>` : ''}
        `;
        resultsContainer.appendChild(resultDiv);
    });
}

function updateChart() {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ''; // Clear existing charts

    const variables = ['Absorbed Energy', 'COR'];
    
    variables.forEach((variable, index) => {
        const canvas = document.createElement('canvas');
        canvas.id = `chart${index}`;
        chartContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `Filler % vs ${variable}`,
                    data: dataPoints.map(point => ({x: point[0], y: point[index + 2]})),
                    backgroundColor: getColor(index),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Filler Percentage'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: variable
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Filler % vs ${variable}`
                    }
                }
            }
        });
    });
}

function getColor(index) {
    const colors = [
        'rgba(231, 76, 60, 0.6)',  // Red for Absorbed Energy
        'rgba(46, 204, 113, 0.6)'  // Green for COR
    ];
    return colors[index];
}