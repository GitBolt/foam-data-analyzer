from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors
from scipy.interpolate import interp1d
import joblib
import os

app = Flask(__name__, static_url_path='')


@app.route('/')
def root():
    return send_from_directory('../ui', 'index.html')

@app.route('/styles.css')
def styles():
    return send_from_directory('../ui', 'styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('../ui', 'script.js')

data = pd.read_csv(os.getcwd() + '/api/enhanced_data.csv')
features = ['filler_percentage', 'impact_energy', 'absorbed_energy', 'cor', 'elp']

# Initialize models
scaler = StandardScaler()
nn_model = NearestNeighbors(n_neighbors=5, metric='euclidean')

@app.route('/train', methods=['POST'])
def train_models():
    global scaler, nn_model, data
    
    X = data[features]
    X_scaled = scaler.fit_transform(X)
    nn_model.fit(X_scaled)
    
    joblib.dump(scaler,os.getcwd() + '/api/scaler.joblib')
    joblib.dump(nn_model, os.getcwd() + '/api/nn_model.joblib')
    joblib.dump(data, os.getcwd() + '/api/training_data.joblib')
    
    return jsonify({"message": "Models trained successfully"})

@app.route('/predict', methods=['POST'])
def predict():
    scaler = joblib.load(os.getcwd() + '/api/scaler.joblib')
    nn_model = joblib.load(os.getcwd() + '/api/nn_model.joblib')
    training_data = joblib.load(os.getcwd() + '/api/training_data.joblib')
    
    input_data = request.json['data']
    X_new = pd.DataFrame(input_data, columns=features)
    
    X_new_scaled = scaler.transform(X_new)
    distances, indices = nn_model.kneighbors(X_new_scaled)
    
    results = []
    for i, row in X_new.iterrows():
        is_anomaly, reasons = check_anomaly(row, training_data)
        
        results.append({
            "id": i,
            "filler_percentage": float(row['filler_percentage']),
            "impact_energy": float(row['impact_energy']),
            "absorbed_energy": float(row['absorbed_energy']),
            "cor": float(row['cor']),
            "elp": float(row['elp']),
            "is_anomaly": is_anomaly,
            "anomaly_reasons": reasons
        })
    
    return jsonify(results)

def interpolate_property(data, filler, impact, property):
    unique_fillers = sorted(data['filler_percentage'].unique())
    unique_impacts = sorted(data['impact_energy'].unique())
    
    values = []
    for uf in unique_fillers:
        subset = data[data['filler_percentage'] == uf]
        if len(subset) > 1:
            f = interp1d(subset['impact_energy'], subset[property], kind='linear', fill_value='extrapolate')
            values.append(f(impact))
    
    if len(values) > 1:
        f = interp1d(unique_fillers, values, kind='linear', fill_value='extrapolate')
        return f(filler)
    else:
        return values[0]

def check_anomaly(row, training_data):
    reasons = []
    
    # Logical checks
    if row['absorbed_energy'] > row['impact_energy']:
        reasons.append("Absorbed energy cannot be greater than impact energy")
    
    if row['cor'] < 0 or row['cor'] > 1:
        reasons.append("Coefficient of restitution must be between 0 and 1")
    
    if row['elp'] < 0 or row['elp'] > 20:
        reasons.append("ELP value is outside expected range")
    
    if row['filler_percentage'] < 0 or row['filler_percentage'] > 100:
        reasons.append("Filler percentage must be between 0 and 100")
    
    if row['impact_energy'] < 1:
        reasons.append("Impact energy is unreasonably low")
    
    # Interpolate expected values
    expected_absorbed = interpolate_property(training_data, row['filler_percentage'], row['impact_energy'], 'absorbed_energy')
    expected_cor = interpolate_property(training_data, row['filler_percentage'], row['impact_energy'], 'cor')
    expected_elp = interpolate_property(training_data, row['filler_percentage'], row['impact_energy'], 'elp')
    
    # Compare with interpolated values
    if abs(row['absorbed_energy'] - expected_absorbed) / expected_absorbed > 0.2:
        reasons.append(f"Absorbed energy ({row['absorbed_energy']:.2f}) is significantly different from expected value ({expected_absorbed:.2f})")
    
    if abs(row['cor'] - expected_cor) / expected_cor > 0.1:
        reasons.append(f"COR ({row['cor']:.2f}) is significantly different from expected value ({expected_cor:.2f})")
    
    if abs(row['elp'] - expected_elp) / expected_elp > 0.2:
        reasons.append(f"ELP ({row['elp']:.2f}) is significantly different from expected value ({expected_elp:.2f})")
    
    # Check for unexpected relationships
    absorbed_energy_ratio = row['absorbed_energy'] / row['impact_energy']
    expected_ratio_range = (training_data['absorbed_energy'] / training_data['impact_energy']).agg(['min', 'max'])
    if absorbed_energy_ratio < expected_ratio_range['min'] * 0.8 or absorbed_energy_ratio > expected_ratio_range['max'] * 1.2:
        reasons.append("Unexpected relationship between impact energy and absorbed energy")
    
    return len(reasons) > 0, reasons

if __name__ == '__main__':
    app.run(debug=True)