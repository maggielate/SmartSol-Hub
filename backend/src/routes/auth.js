const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

router.post('/register', async (req, res, next) => {
  try {
    const { phone, name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (phone, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, phone, name, role`,
      [phone, name, email, hash, role || 'customer']
    );
    const token = jwt.sign(rows[0], process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ user: rows[0], token });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const { password_hash, ...user } = rows[0];
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ user, token });
  } catch (err) { next(err); }
});

module.exports = router;
