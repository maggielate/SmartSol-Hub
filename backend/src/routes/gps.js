const router = require('express').Router();
const { LocationClient, BatchUpdateDevicePositionCommand } = require('@aws-sdk/client-location');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const location = new LocationClient({ region: process.env.AWS_REGION });

// Update unit GPS position (called by device or installer)
router.post('/:unitId/location', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude, address } = req.body;
    const { unitId } = req.params;

    // Store in DB
    await pool.query(
      `INSERT INTO unit_locations (unit_id, latitude, longitude, address) VALUES ($1,$2,$3,$4)`,
      [unitId, latitude, longitude, address]
    );

    // Update AWS Location Tracker (skipped in dev if not configured)
    if (process.env.AWS_LOCATION_TRACKER && !process.env.AWS_ACCESS_KEY_ID?.includes('<')) {
      await location.send(new BatchUpdateDevicePositionCommand({
        TrackerName: process.env.AWS_LOCATION_TRACKER,
        Updates: [{
          DeviceId: unitId,
          Position: [parseFloat(longitude), parseFloat(latitude)],
          SampleTime: new Date().toISOString()
        }]
      }));
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// Get all unit locations (for map view)
router.get('/map', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await pool.query(
      `SELECT su.id, su.serial_number, su.unit_type, su.is_active,
              l.latitude, l.longitude, l.address, l.recorded_at,
              t.battery_soc, t.solar_power_w
       FROM solar_units su
       LEFT JOIN LATERAL (SELECT * FROM unit_locations WHERE unit_id=su.id ORDER BY recorded_at DESC LIMIT 1) l ON true
       LEFT JOIN LATERAL (SELECT battery_soc, solar_power_w FROM telemetry WHERE unit_id=su.id ORDER BY recorded_at DESC LIMIT 1) t ON true
       WHERE ${isAdmin ? 'true' : 'su.owner_id=$1'} AND l.latitude IS NOT NULL`,
      isAdmin ? [] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Get location history for a unit
router.get('/:unitId/history', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM unit_locations WHERE unit_id=$1 ORDER BY recorded_at DESC LIMIT 100`,
      [req.params.unitId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
