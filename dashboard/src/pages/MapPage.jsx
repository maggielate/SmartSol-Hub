import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { gps } from '../services/api';

export default function MapPage() {
  const [units, setUnits] = useState([]);

  useEffect(() => { gps.map().then(r => setUnits(r.data)); }, []);

  const center = units[0] ? [units[0].latitude, units[0].longitude] : [-17.8292, 31.0522]; // Harare default

  return (
    <div style={{ height: '100vh', background: '#0f172a' }}>
      <div style={{ padding: '16px 24px', background: '#1e293b', color: '#f1f5f9' }}>
        <h2>⚡ SmartSol — Unit GPS Map ({units.length} units)</h2>
      </div>
      <MapContainer center={center} zoom={10} style={{ height: 'calc(100vh - 60px)' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {units.map(u => (
          <Marker key={u.id} position={[u.latitude, u.longitude]}>
            <Popup>
              <strong>{u.serial_number}</strong><br />
              Type: {u.unit_type}<br />
              Battery: {u.battery_soc}%<br />
              Solar: {u.solar_power_w}W<br />
              Status: {u.is_active ? '🟢 Online' : '🔴 Offline'}<br />
              {u.address}
            </Popup>
            <Circle center={[u.latitude, u.longitude]} radius={200}
              color={u.is_active ? '#22c55e' : '#ef4444'} fillOpacity={0.15} />
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
