const mqtt = require('mqtt');
const pool = require('../db/pool');

let io;

function init(socketIo) {
  io = socketIo;

  if (!process.env.MQTT_BROKER || process.env.MQTT_BROKER.includes('<')) {
    console.warn('MQTT broker not configured, skipping IoT connection');
    return;
  }

  const client = mqtt.connect(process.env.MQTT_BROKER, {
    port: parseInt(process.env.MQTT_PORT),
    protocol: 'mqtts',
    // AWS IoT Core uses certificate-based auth
    // Certificates loaded from environment or files
  });

  client.on('connect', () => {
    console.log('Connected to AWS IoT Core');
    client.subscribe('smartsol/+/telemetry');
    client.subscribe('smartsol/+/location');
    client.subscribe('smartsol/+/status');
  });

  client.on('message', async (topic, payload) => {
    try {
      const parts = topic.split('/');
      const unitId = parts[1];
      const type = parts[2];
      const data = JSON.parse(payload.toString());

      if (type === 'telemetry') {
        await pool.query(
          `INSERT INTO telemetry (unit_id, battery_soc, battery_voltage, battery_temp,
            solar_power_w, load_power_w, daily_yield_kwh, grid_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [unitId, data.battery_soc, data.battery_voltage, data.battery_temp,
           data.solar_power_w, data.load_power_w, data.daily_yield_kwh, data.grid_status]
        );
        // Push real-time to dashboard subscribers
        io.to(`unit:${unitId}`).emit('telemetry', { unitId, ...data });
      }

      if (type === 'location') {
        await pool.query(
          `INSERT INTO unit_locations (unit_id, latitude, longitude) VALUES ($1,$2,$3)`,
          [unitId, data.latitude, data.longitude]
        );
        io.to(`unit:${unitId}`).emit('location', { unitId, ...data });
      }

      if (type === 'status') {
        await pool.query('UPDATE solar_units SET is_active=$1 WHERE id=$2', [data.online, unitId]);
        io.to(`unit:${unitId}`).emit('status', { unitId, online: data.online });
      }
    } catch (err) {
      console.error('MQTT message error:', err.message);
    }
  });

  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production') return; // suppress in dev
    console.error('MQTT error:', err.message);
  });
}

module.exports = { init };
