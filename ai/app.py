from flask import Flask, request, jsonify
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    history = data.get('history', [])

    if len(history) < 7:
        return jsonify({'error': 'Need at least 7 days of history'}), 400

    demand_kwh = predict_demand(history)
    solar_kwh = predict_solar(history)
    battery_health = score_battery_health(history)
    confidence = min(len(history) / 30 * 100, 95)

    return jsonify({
        'demand_kwh': round(demand_kwh, 3),
        'solar_kwh': round(solar_kwh, 3),
        'battery_health': round(battery_health, 1),
        'confidence': round(confidence, 1)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

def predict_demand(history):
    loads = [float(d.get('avg_load', 0) or 0) for d in history]
    if not loads:
        return 0
    # Simple weighted moving average (recent days weighted more)
    weights = np.exp(np.linspace(0, 1, len(loads)))
    weights /= weights.sum()
    return float(np.dot(weights, loads)) * 24 / 1000  # W -> kWh/day

def predict_solar(history):
    yields = [float(d.get('yield_kwh', 0) or 0) for d in history]
    if not yields:
        return 0
    # 7-day rolling average
    recent = yields[-7:]
    return float(np.mean(recent))

def score_battery_health(history):
    """
    Battery health score 0-100 based on:
    - Average SoC stability (deep discharges reduce health)
    - SoC variance (erratic cycling = degradation)
    """
    socs = [float(d.get('avg_soc', 50) or 50) for d in history]
    if not socs:
        return 100.0

    avg_soc = np.mean(socs)
    soc_variance = np.std(socs)

    # Penalize low average SoC and high variance
    health = 100.0
    if avg_soc < 30:
        health -= (30 - avg_soc) * 1.5
    if soc_variance > 20:
        health -= (soc_variance - 20) * 0.5

    return max(0.0, min(100.0, health))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
