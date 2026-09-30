import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const { data } = await auth.login(phone, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch {
      setError('Invalid phone or password');
    }
  }

  const s = { input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #334155',
    background: '#1e293b', color: '#f1f5f9', fontSize: 15, marginBottom: 14, boxSizing: 'border-box' } };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleLogin} style={{ background: '#1e293b', padding: 40, borderRadius: 16, width: 360 }}>
        <h2 style={{ color: '#f59e0b', marginBottom: 8 }}>⚡ SmartSol Hub</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>Energy Management Platform</p>
        {error && <div style={{ color: '#ef4444', marginBottom: 14, fontSize: 13 }}>{error}</div>}
        <input style={s.input} type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} required />
        <input style={s.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" style={{ width: '100%', padding: '12px', background: '#f59e0b', color: '#0f172a',
          border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Sign In
        </button>
      </form>
    </div>
  );
}
