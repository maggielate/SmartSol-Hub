const router = require('express').Router();
const pool = require('../db/pool');

// Africa's Talking USSD callback
router.post('/', async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const input = text.split('*');
  const level = input.length;
  let response = '';

  const user = await getOrCreateUser(phoneNumber);

  // Level 1 - Main Menu
  if (text === '') {
    response = `CON Welcome to SmartSol Energy
1. Check Balance & Usage
2. Buy Energy (Pay-As-You-Go)
3. Battery Status
4. Report Fault
5. My Account`;

  // Level 2
  } else if (level === 1) {
    switch (input[0]) {
      case '1':
        const usage = await getUsageSummary(user.id);
        response = `CON Your Account
Balance: $${usage.wallet_balance}
Today's Usage: ${usage.today_kwh} kWh
Battery: ${usage.battery_soc}%
1. Top Up
2. Back`;
        break;
      case '2':
        response = `CON Buy Energy
Enter amount in USD (min $1):`;
        break;
      case '3':
        const status = await getBatteryStatus(user.id);
        response = `END Battery Status
Charge: ${status.battery_soc}%
Voltage: ${status.battery_voltage}V
Temp: ${status.battery_temp}°C
Solar: ${status.solar_power_w}W
Load: ${status.load_power_w}W`;
        break;
      case '4':
        response = `CON Report Fault
1. No Power
2. Battery Not Charging
3. Solar Panel Issue
4. Other`;
        break;
      case '5':
        response = `END Account: ${user.name || phoneNumber}
Phone: ${phoneNumber}
Role: ${user.role}
Wallet: $${user.wallet_balance}`;
        break;
      default:
        response = 'END Invalid option';
    }

  // Level 3
  } else if (level === 2) {
    if (input[0] === '2') {
      const amount = parseFloat(input[1]);
      if (isNaN(amount) || amount < 1) {
        response = 'END Invalid amount. Minimum is $1.';
      } else {
        const kwh = (amount / 0.12).toFixed(2);
        response = `CON Confirm Purchase
Amount: $${amount}
Energy: ${kwh} kWh
1. Pay with EcoCash
2. Pay with OneMoney
3. Cancel`;
      }
    } else if (input[0] === '4') {
      const faultTypes = { '1': 'No Power', '2': 'Battery Not Charging', '3': 'Solar Panel Issue', '4': 'Other' };
      const fault = faultTypes[input[1]] || 'Unknown';
      await logFault(user.id, fault);
      response = `END Fault reported: ${fault}
Our team will contact you within 24 hours.
Ref: ${Date.now().toString(36).toUpperCase()}`;
    }

  // Level 4 - Payment confirmation
  } else if (level === 3 && input[0] === '2') {
    const amount = parseFloat(input[1]);
    const method = input[2] === '1' ? 'ecocash' : input[2] === '2' ? 'onemoney' : null;
    if (!method) {
      response = 'END Transaction cancelled.';
    } else {
      const unit = await getUserUnit(user.id);
      if (!unit) {
        response = 'END No solar unit linked to your account.';
      } else {
        await createPendingTransaction(user.id, unit.id, amount, method);
        response = `END Payment initiated!
Amount: $${amount} via ${method.toUpperCase()}
You will receive a prompt on your phone.
Check your SMS for energy token.`;
      }
    }
  } else {
    response = 'END Session ended.';
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

async function getOrCreateUser(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
  if (rows[0]) return rows[0];
  const { rows: newRows } = await pool.query(
    'INSERT INTO users (phone) VALUES ($1) RETURNING *', [phone]
  );
  return newRows[0];
}

async function getUsageSummary(userId) {
  const { rows } = await pool.query(
    `SELECT u.wallet_balance,
            COALESCE(t.battery_soc, 0) as battery_soc,
            COALESCE(SUM(et.kwh_purchased), 0) as today_kwh
     FROM users u
     LEFT JOIN solar_units su ON su.owner_id=u.id
     LEFT JOIN LATERAL (SELECT battery_soc FROM telemetry WHERE unit_id=su.id ORDER BY recorded_at DESC LIMIT 1) t ON true
     LEFT JOIN energy_transactions et ON et.user_id=u.id AND DATE(et.created_at)=CURRENT_DATE AND et.status='completed'
     WHERE u.id=$1 GROUP BY u.wallet_balance, t.battery_soc`,
    [userId]
  );
  return rows[0] || { wallet_balance: 0, battery_soc: 0, today_kwh: 0 };
}

async function getBatteryStatus(userId) {
  const { rows } = await pool.query(
    `SELECT t.* FROM telemetry t
     JOIN solar_units su ON su.id=t.unit_id
     WHERE su.owner_id=$1 ORDER BY t.recorded_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || { battery_soc: 'N/A', battery_voltage: 'N/A', battery_temp: 'N/A', solar_power_w: 0, load_power_w: 0 };
}

async function getUserUnit(userId) {
  const { rows } = await pool.query('SELECT * FROM solar_units WHERE owner_id=$1 LIMIT 1', [userId]);
  return rows[0];
}

async function createPendingTransaction(userId, unitId, amount, method) {
  const kwh = (amount / 0.12).toFixed(3);
  await pool.query(
    `INSERT INTO energy_transactions (user_id, unit_id, amount_usd, kwh_purchased, payment_method, status)
     VALUES ($1,$2,$3,$4,$5,'pending')`,
    [userId, unitId, amount, kwh, method]
  );
}

async function logFault(userId, faultType) {
  const unit = await getUserUnit(userId);
  await pool.query(
    `INSERT INTO alerts (unit_id, user_id, alert_type, severity, message)
     VALUES ($1,$2,'fault','warning',$3)`,
    [unit?.id, userId, `User reported: ${faultType}`]
  );
}

module.exports = router;
