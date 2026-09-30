const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await pool.query(
      `SELECT a.*, su.serial_number FROM alerts a
       JOIN solar_units su ON su.id=a.unit_id
       WHERE ${isAdmin ? 'true' : 'a.user_id=$1'} AND a.is_resolved=false
       ORDER BY a.created_at DESC`,
      isAdmin ? [] : [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE alerts SET is_resolved=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
