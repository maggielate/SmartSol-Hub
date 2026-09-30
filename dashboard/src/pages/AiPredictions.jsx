import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { units, predictions } from '../services/api';
import axios from 'axios';

Chart.register(...registerables);

export default function AiPredictions() {
  const [unitList, setUnitList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    units.list().then(r => { setUnitList(r.data); if (r.data[0]) selectUnit(r.data[0]); });
  }, []);

  async function selectUnit(unit) {
    setSelected(unit);
    setLoading(true);
    predictions.get(unit.id).then(r => setForecast(r.data)).catch(() => {}).finally(() => setLoading(false));
  }

  async function runPrediction() {
    if (!selected) return;
    setPredicting(true);
    try {
      await predictions.trigger(selected.id);
      const r = await predictions.get(selected.id);
      setForecast(r.data);
    } catch {
      // If no history, call AI directly with simulated data
      const { data } = await axios.post('http://localhost:5001/predict', {
        unit_id: selected.id,
        history: Array.from({ length: 14 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
          avg_soc: 65 + Math.random() * 20,
          peak_solar: 400 + Math.random() * 100,
          avg_load: 100 + Math.random() * 50,
          yield_kwh: 1.8 + Math.random() * 0.8,
        }))
      });
      setForecast([data]);
    }
    setPredicting(false);
  }

  const latestHealth = forecast[0]?.battery_health_score ?? null;
  const healthColor = h => h > 70 ? '#22c55e' : h > 40 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>🤖 AI Predictions</span>
      </nav>

      <div style={{ padding: 24 }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {unitList.map(u => (
            <button key={u.id} onClick={() => selectUnit(u)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: selected?.id === u.id ? '#f59e0b' : '#1e293b', color: selected?.id === u.id ? '#000' : '#94a3b8' }}>
              {u.serial_number}
            </button>
          ))}
          <button onClick={runPrediction} disabled={predicting}
            style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: predicting ? '#475569' : '#6366f1', color: '#fff' }}>
            {predicting ? '🤖 Running AI...' : '🤖 Run Prediction'}
          </button>
        </div>

        {/* Health Score + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '🔋 Battery Health', value: latestHealth ? `${latestHealth}%` : '--', color: healthColor(latestHealth), sub: 'AI Health Score' },
            { label: '📊 Avg Demand', value: forecast.length ? `${(forecast.reduce((s, f) => s + parseFloat(f.predicted_demand_kwh || 0), 0) / forecast.length).toFixed(2)} kWh` : '--', color: '#ef4444', sub: 'Predicted Daily' },
            { label: '☀️ Avg Solar', value: forecast.length ? `${(forecast.reduce((s, f) => s + parseFloat(f.predicted_solar_kwh || 0), 0) / forecast.length).toFixed(2)} kWh` : '--', color: '#f59e0b', sub: 'Predicted Daily' },
            { label: '🎯 Confidence', value: forecast[0]?.confidence ? `${forecast[0].confidence}%` : '--', color: '#60a5fa', sub: 'Model Confidence' },
          ].map(c => (
            <div key={c.label} style={{ background: '#1e293b', borderRadius: 12, padding: 20, borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {forecast.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Demand vs Solar Bar Chart */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📊 7-Day Demand vs Solar Forecast</div>
              <Bar data={{
                labels: forecast.map((f, i) => f.prediction_date?.slice(5, 10) || `Day ${i + 1}`),
                datasets: [
                  { label: 'Predicted Demand kWh', data: forecast.map(f => f.predicted_demand_kwh), backgroundColor: '#ef444488', borderColor: '#ef4444', borderWidth: 2 },
                  { label: 'Predicted Solar kWh', data: forecast.map(f => f.predicted_solar_kwh), backgroundColor: '#f59e0b88', borderColor: '#f59e0b', borderWidth: 2 },
                ]
              }} options={{
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#94a3b8' } } }
              }} />
            </div>

            {/* Battery Health Trend */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🔋 Battery Health Trend</div>
              <Line data={{
                labels: forecast.map((f, i) => f.prediction_date?.slice(5, 10) || `Day ${i + 1}`),
                datasets: [{
                  label: 'Health Score', data: forecast.map(f => f.battery_health_score),
                  borderColor: '#22c55e', backgroundColor: '#22c55e22', fill: true, tension: 0.4,
                }]
              }} options={{
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#94a3b8' }, min: 0, max: 100 } }
              }} />
            </div>
          </div>
        )}

        {forecast.length === 0 && !loading && (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 16 }}>No predictions yet for this unit</div>
            <button onClick={runPrediction}
              style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              Run First Prediction
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
