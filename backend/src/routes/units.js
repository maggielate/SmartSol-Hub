const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

// Get all units (admin) or own units (customer/business)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await pool.query(
      `SELECT u.*, l.latitude, l.longitude, l.address,
              t.battery_soc, t.solar_power_w, t.load_power_w, t.recorded_at as last_seen
       FROM solar_units u
       LEFT JOIN LATERAL (SELECT * FROM unit_locations WHERE unit_id=u.id ORDER BY recorded_at DESC LIMIT 1) l ON true
       LEFT JOIN LATERAL (SELECT * FROM telemetry WHERE unit_id=u.id ORDER BY recorded_at DESC LIMIT 1) t ON true
       WHERE ${isAdmin ? 'true' : 'u.owner_id=$1'}`,
      isAdmin ? [] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Get single unit with latest telemetry
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, l.latitude, l.longitude,
              t.battery_soc, t.battery_voltage, t.battery_temp,
              t.solar_power_w, t.load_power_w, t.daily_yield_kwh, t.recorded_at as last_seen
       FROM solar_units u
       LEFT JOIN LATERAL (SELECT * FROM unit_locations WHERE unit_id=u.id ORDER BY recorded_at DESC LIMIT 1) l ON true
       LEFT JOIN LATERAL (SELECT * FROM telemetry WHERE unit_id=u.id ORDER BY recorded_at DESC LIMIT 1) t ON true
       WHERE u.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Unit not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Register new unit (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { serial_number, owner_id, unit_type, battery_capacity_kwh, solar_panel_watt } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO solar_units (serial_number, owner_id, unit_type, battery_capacity_kwh, solar_panel_watt, installed_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [serial_number, owner_id, unit_type, battery_capacity_kwh, solar_panel_watt]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
