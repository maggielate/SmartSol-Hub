const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, su.serial_number FROM alerts a
       JOIN solar_units su ON su.id=a.unit_id
       WHERE a.is_resolved=false ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/:id/resolve', async (req, res, next) => {
  try {
    await pool.query('UPDATE alerts SET is_resolved=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
