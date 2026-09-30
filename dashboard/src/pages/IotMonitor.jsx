import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { units, telemetry } from '../services/api';

const socket = io('http://localhost:3002');

export default function IotMonitor() {
  const [unitList, setUnitList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stream, setStream] = useState([]);
  const [live, setLive] = useState({});

  useEffect(() => {
    units.list().then(r => {
      setUnitList(r.data);
      if (r.data[0]) selectUnit(r.data[0]);
    });
  }, []);

  async function selectUnit(unit) {
    setSelected(unit);
    setLive(unit);
    socket.emit('subscribe_unit', unit.id);
    telemetry.history(unit.id, 1).then(r => setStream(r.data.slice(-20).reverse())).catch(() => {});
  }

  useEffect(() => {
    socket.on('telemetry', data => {
      if (selected && data.unitId === selected.id) {
        setLive(prev => ({ ...prev, ...data }));
        setStream(prev => [{ ...data, recorded_at: new Date().toISOString() }, ...prev.slice(0, 19)]);
      }
    });
    return () => socket.off('telemetry');
  }, [selected]);

  const socColor = soc => soc > 50 ? '#22c55e' : soc > 20 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Back to Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>🌐 IoT Monitor</span>
      </nav>

      <div style={{ padding: 24 }}>
        {/* Unit selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {unitList.map(u => (
            <button key={u.id} onClick={() => selectUnit(u)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                background: selected?.id === u.id ? '#f59e0b' : '#1e293b', color: selected?.id === u.id ? '#000' : '#94a3b8' }}>
              {u.serial_number}
            </button>
          ))}
        </div>

        {/* Live Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: '🔋 Battery SoC', value: `${live.battery_soc ?? '--'}%`, color: socColor(live.battery_soc), sub: 'State of Charge' },
            { label: '⚡ Voltage', value: `${live.battery_voltage ?? '--'} V`, color: '#a78bfa', sub: 'Battery Voltage' },
            { label: '🌡️ Temperature', value: `${live.battery_temp ?? '--'} °C`, color: live.battery_temp > 45 ? '#ef4444' : '#22c55e', sub: 'Battery Temp' },
            { label: '☀️ Solar Power', value: `${live.solar_power_w ?? '--'} W`, color: '#f59e0b', sub: 'PV Generation' },
            { label: '🔌 Load Power', value: `${live.load_power_w ?? '--'} W`, color: '#60a5fa', sub: 'Current Consumption' },
            { label: '📊 Daily Yield', value: `${live.daily_yield_kwh ?? '--'} kWh`, color: '#34d399', sub: 'Energy Harvested Today' },
          ].map(m => (
            <div key={m.label} style={{ background: '#1e293b', borderRadius: 12, padding: 20, borderLeft: `4px solid ${m.color}` }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* MQTT Stream */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📡 Live MQTT Telemetry Stream
            <span style={{ fontSize: 11, background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: 4 }}>LIVE</span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, maxHeight: 300, overflowY: 'auto' }}>
            {stream.length === 0 && <div style={{ color: '#475569' }}>Waiting for telemetry data...</div>}
            {stream.map((s, i) => (
              <div key={i} style={{ marginBottom: 8, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span style={{ color: '#64748b' }}>{new Date(s.recorded_at).toLocaleTimeString()} </span>
                <span style={{ color: '#f59e0b' }}>smartsol/{selected?.serial_number}/telemetry </span>
                <span style={{ color: '#22c55e' }}>
                  {`{ soc: ${s.battery_soc}%, solar: ${s.solar_power_w}W, load: ${s.load_power_w}W, temp: ${s.battery_temp}°C }`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
