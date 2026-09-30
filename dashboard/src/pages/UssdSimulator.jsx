import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function UssdSimulator() {
  const [phone, setPhone] = useState('+263771234567');
  const [input, setInput] = useState('');
  const [screen, setScreen] = useState('');
  const [history, setHistory] = useState([]);
  const [sessionId] = useState('SIM-' + Date.now());
  const [loading, setLoading] = useState(false);

  async function sendUssd(text) {
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:3002/api/ussd', new URLSearchParams({
        sessionId, serviceCode: '*123#', phoneNumber: phone, text
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      setScreen(data);
      setHistory(prev => [...prev, { input: text || '*123#', response: data }]);
    } catch (e) {
      setScreen('END Error connecting to server');
    }
    setInput('');
    setLoading(false);
  }

  function handleSend() {
    const allInputs = history.map(h => h.input).filter(i => i !== '*123#');
    allInputs.push(input);
    const text = allInputs.join('*');
    sendUssd(text);
  }

  const isCON = screen.startsWith('CON');
  const displayText = screen.replace(/^(CON|END)\s?/, '');

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56, borderBottom: '1px solid #334155' }}>
        <Link to="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>⚡ SmartSol Hub</Link>
        <Link to="/" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>← Back to Dashboard</Link>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>📟 USSD Simulator</span>
      </nav>

      <div style={{ padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Phone mockup */}
        <div style={{ width: 300 }}>
          <div style={{ background: '#1e293b', borderRadius: 24, padding: 24, border: '2px solid #334155' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>📟 Feature Phone Simulator</div>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '6px 12px', borderRadius: 6, fontSize: 13, width: '100%', marginTop: 8, textAlign: 'center' }} />
            </div>

            {/* Screen */}
            <div style={{ background: '#0a1628', borderRadius: 8, padding: 16, minHeight: 160, marginBottom: 16, fontFamily: 'monospace', fontSize: 13 }}>
              {screen === '' ? (
                <div style={{ color: '#475569', textAlign: 'center', marginTop: 40 }}>Press Dial to start</div>
              ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f1f5f9', lineHeight: 1.6 }}>{displayText}</pre>
              )}
              {!isCON && screen !== '' && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 8 }}>Session ended</div>}
            </div>

            {/* Input */}
            {isCON && (
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Enter option..."
                style={{ width: '100%', background: '#334155', border: 'none', color: '#f1f5f9',
                  padding: '8px 12px', borderRadius: 6, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setScreen(''); setHistory([]); sendUssd(''); }}
                style={{ flex: 1, background: '#22c55e', border: 'none', color: '#000', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {loading ? '...' : history.length === 0 ? '📞 Dial *123#' : '🔄 Restart'}
              </button>
              {isCON && (
                <button onClick={handleSend}
                  style={{ flex: 1, background: '#f59e0b', border: 'none', color: '#000', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Session history */}
        <div style={{ flex: 1, background: '#1e293b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📋 USSD Session Log</div>
          {history.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Dial *123# to start a session</p>}
          {history.map((h, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, background: '#0f172a', borderRadius: 8 }}>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Input: <span style={{ color: '#f59e0b' }}>{h.input || '(dial)'}</span></div>
              <pre style={{ margin: 0, color: '#94a3b8', fontSize: 12, whiteSpace: 'pre-wrap' }}>{h.response}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
