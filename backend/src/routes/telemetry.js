const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// Ingest telemetry from IoT device (device uses API key, not JWT)
router.post('/ingest', async (req, res, next) => {
  try {
    const { unit_id, battery_soc, battery_voltage, battery_temp,
            solar_power_w, load_power_w, daily_yield_kwh, grid_status } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO telemetry (unit_id, battery_soc, battery_voltage, battery_temp,
        solar_power_w, load_power_w, daily_yield_kwh, grid_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [unit_id, battery_soc, battery_voltage, battery_temp,
       solar_power_w, load_power_w, daily_yield_kwh, grid_status]
    );

    // Trigger alert checks
    await checkAlerts(rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Get telemetry history for a unit
router.get('/:unitId', authenticate, async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM telemetry
       WHERE unit_id=$1 AND recorded_at > NOW() - INTERVAL '${parseInt(hours)} hours'
       ORDER BY recorded_at ASC`,
      [req.params.unitId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Get aggregated daily stats
router.get('/:unitId/daily', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DATE(recorded_at) as date,
              AVG(battery_soc) as avg_soc,
              MAX(solar_power_w) as peak_solar_w,
              AVG(load_power_w) as avg_load_w,
              MAX(daily_yield_kwh) as yield_kwh
       FROM telemetry WHERE unit_id=$1
       GROUP BY DATE(recorded_at) ORDER BY date DESC LIMIT 30`,
      [req.params.unitId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

async function checkAlerts(telemetry) {
  const alerts = [];
  if (telemetry.battery_soc < 20)
    alerts.push({ type: 'low_battery', severity: 'warning', msg: `Battery at ${telemetry.battery_soc}%` });
  if (telemetry.battery_soc < 10)
    alerts.push({ type: 'critical_battery', severity: 'critical', msg: `Battery critically low: ${telemetry.battery_soc}%` });
  if (telemetry.battery_temp > 45)
    alerts.push({ type: 'high_temp', severity: 'critical', msg: `Battery overheating: ${telemetry.battery_temp}°C` });
  if (telemetry.solar_power_w === 0 && new Date().getHours() > 8 && new Date().getHours() < 17)
    alerts.push({ type: 'no_solar', severity: 'warning', msg: 'No solar production during daylight hours' });

  for (const alert of alerts) {
    await pool.query(
      `INSERT INTO alerts (unit_id, alert_type, severity, message) VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [telemetry.unit_id, alert.type, alert.severity, alert.msg]
    );
  }
}

module.exports = router;
