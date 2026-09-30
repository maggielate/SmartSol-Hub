const router = require('express').Router();
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const RATE_USD_PER_KWH = 0.12; // $0.12 per kWh

// Initiate payment (EcoCash or OneMoney)
router.post('/initiate', authenticate, async (req, res, next) => {
  try {
    const { unit_id, amount_usd, payment_method } = req.body;
    const kwh = (amount_usd / RATE_USD_PER_KWH).toFixed(3);

    const { rows } = await pool.query(
      `INSERT INTO energy_transactions (user_id, unit_id, amount_usd, kwh_purchased, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
      [req.user.id, unit_id, amount_usd, kwh, payment_method]
    );
    const txn = rows[0];

    let paymentResponse;
    if (payment_method === 'ecocash') {
      paymentResponse = await initiateEcoCash(req.user.phone, amount_usd, txn.id);
    } else if (payment_method === 'onemoney') {
      paymentResponse = await initiateOneMoney(req.user.phone, amount_usd, txn.id);
    } else {
      return res.status(400).json({ error: 'Unsupported payment method' });
    }

    await pool.query('UPDATE energy_transactions SET payment_ref=$1 WHERE id=$2',
      [paymentResponse.ref, txn.id]);

    res.json({ transaction_id: txn.id, payment_ref: paymentResponse.ref, kwh_purchased: kwh });
  } catch (err) { next(err); }
});

// Payment callback webhook
router.post('/callback', async (req, res, next) => {
  try {
    const { transaction_id, status, payment_ref } = req.body;
    if (status === 'SUCCESS') {
      const token = generatePrepaidToken();
      await pool.query(
        `UPDATE energy_transactions SET status='completed', token=$1 WHERE id=$2`,
        [token, transaction_id]
      );
      // TODO: Send token via SMS using Africa's Talking
      res.json({ success: true, token });
    } else {
      await pool.query(`UPDATE energy_transactions SET status='failed' WHERE id=$1`, [transaction_id]);
      res.json({ success: false });
    }
  } catch (err) { next(err); }
});

// Get transaction history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM energy_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

async function initiateEcoCash(phone, amount, txnId) {
  const { data } = await axios.post(`${process.env.ECOCASH_API_URL}/payments/initiate`, {
    msisdn: phone, amount, currency: 'USD',
    reference: txnId, callback_url: `${process.env.API_BASE_URL}/api/payments/callback`
  }, { headers: { Authorization: `Bearer ${process.env.ECOCASH_API_KEY}` } });
  return { ref: data.reference };
}

async function initiateOneMoney(phone, amount, txnId) {
  const { data } = await axios.post(`${process.env.ONEMONEY_API_URL}/payments/initiate`, {
    msisdn: phone, amount, currency: 'USD',
    reference: txnId, callback_url: `${process.env.API_BASE_URL}/api/payments/callback`
  }, { headers: { Authorization: `Bearer ${process.env.ONEMONEY_API_KEY}` } });
  return { ref: data.reference };
}

function generatePrepaidToken() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

module.exports = router;
