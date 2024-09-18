let dataPoints = [];
let dataPointCount = 0;
const dataPointCountElement = document.getElementById('dataPointCount');

const chartSection = document.querySelector('.chart-section');

document.addEventListener('DOMContentLoaded', () => {
    const csvUploadBtn = document.getElementById('csvUploadBtn');
    const csvFile = document.getElementById('csvFile');
    const manualEntryForm = document.getElementById('manualEntryForm');
    const addDataPointBtn = document.getElementById('addDataPointBtn');

    const inputToggle = document.getElementById('inputToggle');

    csvUploadBtn.addEventListener('click', () => csvFile.click());
    csvFile.addEventListener('change', handleCSVUpload);
    
    inputToggle.addEventListener('change', () => {
        if (inputToggle.checked) {
            csvUploadBtn.style.display = 'none';
            manualEntryForm.style.display = 'block';
            if (window.innerWidth > 768) {
                chartSection.classList.add('manual-entry-active');
            }
        } else {
            csvUploadBtn.style.display = 'block';
            manualEntryForm.style.display = 'none';
            chartSection.classList.remove('manual-entry-active');
        }
    });

    const dataForm = document.getElementById('dataForm');
    const predictBtn = document.getElementById('predictBtn');
    csvUploadBtn.addEventListener('click', () => csvFile.click());
    csvFile.addEventListener('change', handleCSVUpload);
    dataForm.addEventListener('submit', handleManualEntry);
    predictBtn.addEventListener('click', predictAnomalies);

    const inputs = document.querySelectorAll('#dataForm input[type="number"]');

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
        
        if (lines.length < 2) {
            showCSVError("The CSV file is empty or has insufficient data.");
            return;
        }

        const header = lines[0].split(',');
        if (header.length !== 2) {
            showCSVError("The CSV file does not have the correct number of columns.");
            return;
        }

        dataPoints = lines.slice(1).map(line => {
            const values = line.split(',');
            return values.map(Number);
        }).filter(point => point.length === 2 && !point.some(isNaN));

        if (dataPoints.length === 0) {
            showCSVError("No valid data points found in the CSV file.");
            return;
        }

        updateDataPointCount();
        updateChart();
    };
    reader.readAsText(file);
}

function showCSVError(message) {
    const errorMessage = `
        <div class="error-message">
            <p>${message}</p>
            <p>The CSV should have the following format:</p>
            <pre>
Filler Percentage,Impact Energy
10.5,100.2
15.2,110.5
...
            </pre>
        </div>
    `;
    
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = errorMessage;
    resultsContainer.style.display = 'block';
    
    document.getElementById('csvFile').value = '';
}

function handleManualEntry(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const dataPoint = Array.from(formData.values()).map(Number);
    dataPoints.push(dataPoint);
    updateDataPointCount();
    updateChart();
    event.target.reset();
}

function predictAnomalies() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsContainer = document.getElementById('resultsContainer');
    
    loadingSpinner.style.display = 'block';
    resultsContainer.style.display = 'none';

    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: dataPoints }),
    })
    .then(response => response.json())
    .then(data => {
        loadingSpinner.style.display = 'none';
        resultsContainer.style.display = 'block';
        displayResults(data);
    })
    .catch((error) => {
        console.error('Error:', error);
        loadingSpinner.style.display = 'none';
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<p>An error occurred while predicting anomalies. Please try again.</p>';
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

    const variables = ['Impact Energy'];
    
    variables.forEach((variable, index) => {
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        const canvas = document.createElement('canvas');
        canvas.id = `chart${index}`;
        chartWrapper.appendChild(canvas);
        chartContainer.appendChild(chartWrapper);

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `Filler % vs ${variable}`,
                data: dataPoints.map(point => ({x: point[0], y: point[index + 1]})),
                backgroundColor: getColor(index),
                pointRadius: 6, // Increase point size
                pointHoverRadius: 8, // Increase hover point size
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
                        text: 'Filler Percentage',
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: 'white',
                        font: {
                            size: 14 // Increase font size for x-axis labels
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: variable,
                        color: 'white',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: 'white',
                        font: {
                            size: 14 // Increase font size for y-axis labels
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Filler % vs ${variable}`,
                    color: 'white',
                    font: {
                        size: 18, // Increase title font size
                        weight: 'bold'
                    }
                },
                tooltip: {
                    titleFont: {
                        size: 16 // Increase tooltip title font size
                    },
                    bodyFont: {
                        size: 14 // Increase tooltip body font size
                    }
                }
            }
        }
    });
    });
}

function getColor(index) {
    const colors = [
        'rgba(46, 204, 113, 0.6)',  // Green for COR
        'rgba(231, 76, 60, 0.6)',  // Red for Absorbed Energy
    ];
    return colors[index];
}


window.addEventListener('resize', () => {
    if (inputToggle.checked) {
        if (window.innerWidth > 768) {
            chartSection.classList.add('manual-entry-active');
        } else {
            chartSection.classList.remove('manual-entry-active');
        }
    }
});