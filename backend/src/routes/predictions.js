const router = require('express').Router();
const axios = require('axios');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// Get latest prediction for a unit
router.get('/:unitId', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM energy_predictions WHERE unit_id=$1 ORDER BY created_at DESC LIMIT 7`,
      [req.params.unitId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Trigger new prediction (admin or scheduled job)
router.post('/:unitId/predict', authenticate, async (req, res, next) => {
  try {
    // Fetch last 30 days of telemetry for the AI model
    const { rows: history } = await pool.query(
      `SELECT DATE(recorded_at) as date,
              AVG(battery_soc) as avg_soc,
              MAX(solar_power_w) as peak_solar,
              AVG(load_power_w) as avg_load,
              MAX(daily_yield_kwh) as yield_kwh
       FROM telemetry WHERE unit_id=$1 AND recorded_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(recorded_at) ORDER BY date`,
      [req.params.unitId]
    );

    const { data: prediction } = await axios.post(
      `${process.env.AI_SERVICE_URL}/predict`,
      { unit_id: req.params.unitId, history }
    );

    const { rows } = await pool.query(
      `INSERT INTO energy_predictions
         (unit_id, predicted_demand_kwh, predicted_solar_kwh, battery_health_score, prediction_date, confidence)
       VALUES ($1,$2,$3,$4,CURRENT_DATE+1,$5) RETURNING *`,
      [req.params.unitId, prediction.demand_kwh, prediction.solar_kwh,
       prediction.battery_health, prediction.confidence]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
