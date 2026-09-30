import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { units, alerts } from '../services/api';

export default function MobilePreview() {
  const [unit, setUnit] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [screen, setScreen] = useState('home');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ecocash');

  useEffect(() => {
    units.list().then(r => r.data[0] && setUnit(r.data[0]));
    alerts.list().then(r => setAlertList(r.data));
  }, []);

  const socColor = soc => soc > 50 ? '#22c55e' : soc > 20 ? '#f59e0b' : '#ef4444';
  const kwh = amount ? (parseFloat(amount) / 0.12).toFixed(2) : '0.00';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Back to Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>📱 Mobile App Preview</span>
      </nav>

      <div style={{ padding: 24, display: 'flex', gap: 32, justifyContent: 'center' }}>

        {/* Phone Frame */}
        <div style={{ width: 320, background: '#1e293b', borderRadius: 40, padding: '20px 12px', border: '3px solid #334155', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 12px', fontSize: 11, color: '#64748b' }}>
            <span>9:41</span><span>SmartSol</span><span>🔋 82%</span>
          </div>

          {/* Screen */}
          <div style={{ background: '#0f172a', borderRadius: 24, padding: 16, minHeight: 560 }}>

            {screen === 'home' && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', marginBottom: 16 }}>⚡ SmartSol Energy</div>

                {/* Battery Card */}
                <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>🔋 Battery Status</div>
                  <div style={{ background: '#334155', borderRadius: 6, height: 10, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${unit?.battery_soc ?? 0}%`, background: socColor(unit?.battery_soc), borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: socColor(unit?.battery_soc) }}>{unit?.battery_soc ?? '--'}%</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{unit?.battery_voltage ?? '--'}V · {unit?.battery_temp ?? '--'}°C</div>
                </div>

                {/* Solar & Load */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#1e293b', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>☀️ Solar</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{unit?.solar_power_w ?? '--'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Watts</div>
                  </div>
                  <div style={{ background: '#1e293b', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>🔌 Load</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>{unit?.load_power_w ?? '--'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Watts</div>
                  </div>
                </div>

                {/* Buy Button */}
                <button onClick={() => setScreen('buy')}
                  style={{ width: '100%', background: '#f59e0b', border: 'none', color: '#000', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
                  💳 Buy Energy (Pay-As-You-Go)
                </button>

                {/* Alerts */}
                {alertList.slice(0, 2).map(a => (
                  <div key={a.id} style={{ background: '#1a0f00', borderLeft: '3px solid #f59e0b', padding: '8px 12px', borderRadius: 6, marginBottom: 6, fontSize: 12, color: '#cbd5e1' }}>
                    ⚠️ {a.message}
                  </div>
                ))}
              </div>
            )}

            {screen === 'buy' && (
              <div>
                <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>← Back</button>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>💳 Buy Energy</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Rate: $0.12 / kWh</div>

                <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Amount (USD)</div>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5.00"
                    style={{ width: '100%', background: '#334155', border: 'none', color: '#f1f5f9', padding: 12, borderRadius: 8, fontSize: 20, fontWeight: 600, boxSizing: 'border-box' }} />
                  <div style={{ color: '#22c55e', fontSize: 13, marginTop: 8 }}>≈ {kwh} kWh of energy</div>
                </div>

                <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Payment Method</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['ecocash', 'onemoney'].map(m => (
                      <button key={m} onClick={() => setMethod(m)}
                        style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                          background: method === m ? '#f59e0b' : '#334155', color: method === m ? '#000' : '#94a3b8' }}>
                        {m === 'ecocash' ? '🟢 EcoCash' : '🔵 OneMoney'}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => { alert(`Payment of $${amount} via ${method} initiated!\nYou will receive a prompt on your phone.`); setScreen('home'); }}
                  style={{ width: '100%', background: '#f59e0b', border: 'none', color: '#000', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Pay with {method === 'ecocash' ? 'EcoCash' : 'OneMoney'}
                </button>
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 0', borderTop: '1px solid #334155', marginTop: 8 }}>
            {[['🏠', 'home'], ['💳', 'buy']].map(([icon, s]) => (
              <button key={s} onClick={() => setScreen(s)}
                style={{ background: 'none', border: 'none', color: screen === s ? '#f59e0b' : '#64748b', cursor: 'pointer', fontSize: 20 }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div style={{ maxWidth: 320 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📱 React Native Mobile App</div>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              This is a browser preview of the mobile app. The actual app runs natively on iOS and Android via React Native.
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🚀 Run on Device</div>
            {[
              'cd mobile',
              'npm install',
              'npx react-native run-android',
              '# or: npx react-native run-ios',
            ].map((cmd, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 6, padding: '6px 12px', marginBottom: 6, fontFamily: 'monospace', fontSize: 12, color: '#22c55e' }}>
                {cmd}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
