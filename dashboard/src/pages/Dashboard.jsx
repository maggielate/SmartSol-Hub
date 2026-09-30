import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { units, alerts as alertsAPI, predictions, telemetry as telemetryAPI } from '../services/api';

Chart.register(...registerables);

const socket = io('http://localhost:3002');

export default function Dashboard() {
  const [unitList, setUnitList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState({});
  const [alertList, setAlertList] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    units.list().then(r => {
      setUnitList(r.data);
      if (r.data[0]) selectUnit(r.data[0]);
    });
    alertsAPI.list().then(r => setAlertList(r.data));
  }, []);

  async function selectUnit(unit) {
    setSelected(unit);
    setLive(unit);
    socket.emit('subscribe_unit', unit.id);
    predictions.get(unit.id).then(r => setForecast(r.data)).catch(() => {});
    telemetryAPI.history(unit.id, 24).then(r => setHistory(r.data)).catch(() => {});
  }

  useEffect(() => {
    socket.on('telemetry', data => {
      if (selected && data.unitId === selected.id) setLive(prev => ({ ...prev, ...data }));
    });
    return () => socket.off('telemetry');
  }, [selected]);

  const socColor = soc => soc > 50 ? '#22c55e' : soc > 20 ? '#f59e0b' : '#ef4444';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>

      {/* Top Nav */}
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderBottom: '1px solid #334155' }}>
        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>⚡ SmartSol Hub</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { to: '/',        label: '📊 Dashboard' },
            { to: '/payg',    label: '☀️ Pay-As-You-Go' },
            { to: '/mobile',  label: '📱 Mobile App' },
            { to: '/ussd',    label: '📟 USSD' },
            { to: '/iot',     label: '🌐 IoT Monitor' },
            { to: '/battery', label: '🔋 Battery' },
            { to: '/ai',      label: '🤖 AI Predictions' },
            { to: '/map',     label: '📍 GPS Map' },
          ].map(n => (
            <Link key={n.to} to={n.to} style={{ color: '#94a3b8', textDecoration: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 13, background: '#334155' }}>
              {n.label}
            </Link>
          ))}

        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar - Units */}
        <aside style={{ width: 200, background: '#1e293b', padding: 16, borderRight: '1px solid #334155' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Solar Units</div>
          {unitList.map(u => (
            <div key={u.id} onClick={() => selectUnit(u)}
              style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                background: selected?.id === u.id ? '#334155' : 'transparent',
                borderLeft: `3px solid ${selected?.id === u.id ? '#f59e0b' : 'transparent'}` }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.serial_number}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{u.unit_type}</div>
              <div style={{ fontSize: 11, color: u.is_active ? '#22c55e' : '#ef4444', marginTop: 2 }}>
                {u.is_active ? '● Online' : '● Offline'}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: '🔋 Battery SoC', value: `${live.battery_soc ?? '--'}%`, color: socColor(live.battery_soc) },
              { label: '☀️ Solar Power', value: `${live.solar_power_w ?? '--'} W`, color: '#f59e0b' },
              { label: '🔌 Load Power', value: `${live.load_power_w ?? '--'} W`, color: '#60a5fa' },
              { label: '⚡ Voltage', value: `${live.battery_voltage ?? '--'} V`, color: '#a78bfa' },
            ].map(card => (
              <div key={card.label} style={{ background: '#1e293b', borderRadius: 12, padding: 20, borderTop: `3px solid ${card.color}` }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* IoT Live Monitor + Battery Gauge */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Battery Gauge */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🔋 Battery Health</div>
              <div style={{ maxWidth: 200, margin: '0 auto' }}>
                <Doughnut data={{
                  datasets: [{ data: [live.battery_soc ?? 0, 100 - (live.battery_soc ?? 0)],
                    backgroundColor: [socColor(live.battery_soc), '#1e3a5f'], borderWidth: 0 }]
                }} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: socColor(live.battery_soc) }}>{live.battery_soc ?? '--'}%</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Temp: {live.battery_temp ?? '--'}°C · {live.grid_status ?? 'off_grid'}</div>
              </div>
            </div>

            {/* IoT Live Data */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🌐 IoT Live Monitor</div>
              {[
                { label: 'Battery Voltage', value: `${live.battery_voltage ?? '--'} V`, icon: '⚡' },
                { label: 'Battery Temp', value: `${live.battery_temp ?? '--'} °C`, icon: '🌡️' },
                { label: 'Solar Power', value: `${live.solar_power_w ?? '--'} W`, icon: '☀️' },
                { label: 'Load Power', value: `${live.load_power_w ?? '--'} W`, icon: '🔌' },
                { label: 'Daily Yield', value: `${live.daily_yield_kwh ?? '--'} kWh`, icon: '📊' },
                { label: 'Last Seen', value: live.last_seen ? new Date(live.last_seen).toLocaleTimeString() : '--', icon: '🕐' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{row.icon} {row.label}</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Chart */}
          {history.length > 0 && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📈 24h Telemetry History</div>
              <Line data={{
                labels: history.map(h => new Date(h.recorded_at).toLocaleTimeString()),
                datasets: [
                  { label: 'Battery SoC %', data: history.map(h => h.battery_soc), borderColor: '#22c55e', tension: 0.4, fill: false, yAxisID: 'y' },
                  { label: 'Solar W', data: history.map(h => h.solar_power_w), borderColor: '#f59e0b', tension: 0.4, fill: false, yAxisID: 'y1' },
                  { label: 'Load W', data: history.map(h => h.load_power_w), borderColor: '#60a5fa', tension: 0.4, fill: false, yAxisID: 'y1' },
                ]
              }} options={{
                plugins: { legend: { labels: { color: '#94a3b8', fontSize: 11 } } },
                scales: {
                  x: { ticks: { color: '#64748b', maxTicksLimit: 8 } },
                  y: { ticks: { color: '#22c55e' }, position: 'left', title: { display: true, text: 'SoC %', color: '#22c55e' } },
                  y1: { ticks: { color: '#f59e0b' }, position: 'right', title: { display: true, text: 'Watts', color: '#f59e0b' } },
                }
              }} />
            </div>
          )}

          {/* AI Forecast */}
          {forecast.length > 0 && (
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🤖 AI 7-Day Forecast</div>
              <Line data={{
                labels: forecast.map(f => f.prediction_date?.slice(5, 10)),
                datasets: [
                  { label: 'Predicted Demand kWh', data: forecast.map(f => f.predicted_demand_kwh), borderColor: '#ef4444', tension: 0.4, fill: false },
                  { label: 'Predicted Solar kWh', data: forecast.map(f => f.predicted_solar_kwh), borderColor: '#f59e0b', tension: 0.4, fill: false },
                ]
              }} options={{ plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#94a3b8' } } } }} />
            </div>
          )}

          {/* Alerts */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🔔 Active Alerts ({alertList.length})</div>
            {alertList.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>No active alerts ✅</p>}
            {alertList.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', marginBottom: 8, borderRadius: 8,
                background: a.severity === 'critical' ? '#1a0505' : '#1a0f00',
                borderLeft: `3px solid ${a.severity === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
                <div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, marginRight: 8,
                    background: a.severity === 'critical' ? '#ef4444' : '#f59e0b', color: '#000', fontWeight: 700 }}>
                    {a.severity?.toUpperCase()}
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: 13 }}>{a.message}</span>
                </div>
                <button onClick={() => alertsAPI.resolve(a.id).then(() => setAlertList(prev => prev.filter(x => x.id !== a.id)))}
                  style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
