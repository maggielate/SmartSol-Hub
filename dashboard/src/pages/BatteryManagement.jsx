import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { units, telemetry, alerts as alertsAPI } from '../services/api';

Chart.register(...registerables);

export default function BatteryManagement() {
  const [unitList, setUnitList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState({});
  const [history, setHistory] = useState([]);
  const [alertList, setAlertList] = useState([]);

  useEffect(() => {
    units.list().then(r => { setUnitList(r.data); if (r.data[0]) selectUnit(r.data[0]); });
    alertsAPI.list().then(r => setAlertList(r.data));
  }, []);

  async function selectUnit(unit) {
    setSelected(unit);
    setLive(unit);
    telemetry.history(unit.id, 48).then(r => setHistory(r.data)).catch(() => {});
  }

  const soc = parseFloat(live.battery_soc ?? 0);
  const temp = parseFloat(live.battery_temp ?? 0);
  const socColor = s => s > 50 ? '#22c55e' : s > 20 ? '#f59e0b' : '#ef4444';
  const healthScore = Math.max(0, 100 - (soc < 30 ? (30 - soc) * 1.5 : 0) - (temp > 45 ? (temp - 45) * 2 : 0)).toFixed(0);
  const healthColor = h => h > 70 ? '#22c55e' : h > 40 ? '#f59e0b' : '#ef4444';

  const batteryAlerts = alertList.filter(a => ['low_battery', 'critical_battery', 'high_temp'].includes(a.alert_type));

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>🔋 Smart Battery Management</span>
      </nav>

      <div style={{ padding: 24 }}>
        {/* Unit Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {unitList.map(u => (
            <button key={u.id} onClick={() => selectUnit(u)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: selected?.id === u.id ? '#f59e0b' : '#1e293b', color: selected?.id === u.id ? '#000' : '#94a3b8' }}>
              {u.serial_number}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

          {/* Battery Status Panel */}
          <div>
            {/* SoC Gauge */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>🔋 State of Charge</div>
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={socColor(soc)} strokeWidth="3"
                    strokeDasharray={`${soc} ${100 - soc}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: socColor(soc) }}>{soc}%</div>
                </div>
              </div>
              <div style={{ background: '#334155', borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${soc}%`, background: socColor(soc), borderRadius: 8, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {soc > 50 ? '✅ Healthy' : soc > 20 ? '⚠️ Low — consider recharging' : '🚨 Critical — immediate action needed'}
              </div>
            </div>

            {/* Battery Metrics */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📊 Battery Metrics</div>
              {[
                { label: 'Voltage', value: `${live.battery_voltage ?? '--'} V`, color: '#a78bfa' },
                { label: 'Temperature', value: `${live.battery_temp ?? '--'} °C`, color: temp > 45 ? '#ef4444' : '#22c55e' },
                { label: 'Health Score', value: `${healthScore}/100`, color: healthColor(healthScore) },
                { label: 'Capacity', value: `${selected?.battery_capacity_kwh ?? '--'} kWh`, color: '#60a5fa' },
                { label: 'Panel', value: `${selected?.solar_panel_watt ?? '--'} W`, color: '#f59e0b' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{m.label}</span>
                  <span style={{ color: m.color, fontWeight: 700, fontSize: 13 }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Battery Alerts */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🔔 Battery Alerts</div>
              {batteryAlerts.length === 0
                ? <div style={{ color: '#22c55e', fontSize: 13 }}>✅ No battery alerts</div>
                : batteryAlerts.map(a => (
                  <div key={a.id} style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 6, fontSize: 12,
                    background: a.severity === 'critical' ? '#1a0505' : '#1a0f00',
                    borderLeft: `3px solid ${a.severity === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
                    {a.message}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Charts */}
          <div>
            {history.length > 0 && (
              <>
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>📈 Battery SoC History (48h)</div>
                  <Line data={{
                    labels: history.map(h => new Date(h.recorded_at).toLocaleTimeString()),
                    datasets: [{
                      label: 'Battery SoC %', data: history.map(h => h.battery_soc),
                      borderColor: '#22c55e', backgroundColor: '#22c55e22', fill: true, tension: 0.4,
                    }]
                  }} options={{
                    plugins: { legend: { labels: { color: '#94a3b8' } } },
                    scales: { x: { ticks: { color: '#64748b', maxTicksLimit: 8 } }, y: { ticks: { color: '#94a3b8' }, min: 0, max: 100 } }
                  }} />
                </div>

                <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>🌡️ Battery Temperature History (48h)</div>
                  <Line data={{
                    labels: history.map(h => new Date(h.recorded_at).toLocaleTimeString()),
                    datasets: [{
                      label: 'Temp °C', data: history.map(h => h.battery_temp),
                      borderColor: '#f59e0b', backgroundColor: '#f59e0b22', fill: true, tension: 0.4,
                    }]
                  }} options={{
                    plugins: { legend: { labels: { color: '#94a3b8' } } },
                    scales: { x: { ticks: { color: '#64748b', maxTicksLimit: 8 } }, y: { ticks: { color: '#94a3b8' } } }
                  }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
