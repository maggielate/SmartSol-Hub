import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { payments, units } from '../services/api';

const RATE = 0.12;

export default function PayAsYouGo() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('ecocash');
  const [unitList, setUnitList] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const kwh = amount ? (parseFloat(amount) / RATE).toFixed(2) : '0.00';

  useEffect(() => {
    units.list().then(r => { setUnitList(r.data); if (r.data[0]) setSelectedUnit(r.data[0].id); });
    payments.history().then(r => setHistory(r.data)).catch(() => {});
  }, []);

  async function handlePay(e) {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 1) return alert('Minimum purchase is $1.00');
    setLoading(true);
    try {
      const { data } = await payments.initiate({ unit_id: selectedUnit, amount_usd: parseFloat(amount), payment_method: method });
      setResult(data);
      payments.history().then(r => setHistory(r.data)).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.error || 'Payment initiation failed — check API keys in .env');
    }
    setLoading(false);
  }

  const statusColor = s => s === 'completed' ? '#22c55e' : s === 'failed' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>☀️ Pay-As-You-Go</span>
      </nav>

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24 }}>

        {/* Payment Form */}
        <div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>☀️ Buy Energy</div>
            <form onSubmit={handlePay}>
              <label style={{ fontSize: 12, color: '#64748b' }}>Solar Unit</label>
              <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                style={{ width: '100%', background: '#334155', border: 'none', color: '#f1f5f9', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 16, marginTop: 4 }}>
                {unitList.map(u => <option key={u.id} value={u.id}>{u.serial_number} — {u.unit_type}</option>)}
              </select>

              <label style={{ fontSize: 12, color: '#64748b' }}>Amount (USD)</label>
              <input type="number" min="1" step="0.5" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 5.00" required
                style={{ width: '100%', background: '#334155', border: 'none', color: '#f1f5f9', padding: '10px 12px', borderRadius: 8, fontSize: 20, fontWeight: 700, marginBottom: 8, marginTop: 4, boxSizing: 'border-box' }} />
              <div style={{ color: '#22c55e', fontSize: 14, marginBottom: 16 }}>≈ {kwh} kWh · Rate: $0.12/kWh</div>

              <label style={{ fontSize: 12, color: '#64748b' }}>Payment Method</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 20 }}>
                {[['ecocash', '🟢 EcoCash'], ['onemoney', '🔵 OneMoney']].map(([val, label]) => (
                  <button type="button" key={val} onClick={() => setMethod(val)}
                    style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      background: method === val ? '#f59e0b' : '#334155', color: method === val ? '#000' : '#94a3b8' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Amount</span>
                  <span style={{ fontWeight: 700 }}>${parseFloat(amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Energy</span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>{kwh} kWh</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Method</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{method === 'ecocash' ? 'EcoCash' : 'OneMoney'}</span>
                </div>
              </div>

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? '#475569' : '#f59e0b', border: 'none', color: '#000', padding: 14, borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Processing...' : `Pay with ${method === 'ecocash' ? 'EcoCash' : 'OneMoney'}`}
              </button>
            </form>
          </div>

          {result && (
            <div style={{ background: '#052e16', border: '1px solid #22c55e', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: 8 }}>✅ Payment Initiated!</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Ref: <span style={{ color: '#f1f5f9' }}>{result.payment_ref}</span></div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Energy: <span style={{ color: '#22c55e', fontWeight: 700 }}>{result.kwh_purchased} kWh</span></div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>A payment prompt will be sent to your phone. Check SMS for energy token.</div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📋 Transaction History</div>
          {history.length === 0 && <p style={{ color: '#64748b' }}>No transactions yet</p>}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Date', 'Amount', 'Energy', 'Method', 'Status', 'Token'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>${t.amount_usd}</td>
                    <td style={{ padding: '10px 12px', color: '#22c55e' }}>{t.kwh_purchased} kWh</td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b', textTransform: 'capitalize' }}>{t.payment_method}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: statusColor(t.status) + '22', color: statusColor(t.status), padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                        {t.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a78bfa' }}>{t.token || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
