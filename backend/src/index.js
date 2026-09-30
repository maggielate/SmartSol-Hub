require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const unitRoutes = require('./routes/units');
const telemetryRoutes = require('./routes/telemetry');
const paymentRoutes = require('./routes/payments');
const ussdRoutes = require('./routes/ussd');
const alertRoutes = require('./routes/alerts');
const predictionRoutes = require('./routes/predictions');
const gpsRoutes = require('./routes/gps');

const mqttService = require('./services/mqtt');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SmartSol API' }));

app.use('/api/auth', authRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/gps', gpsRoutes);

app.use(errorHandler);

// Pass socket.io to MQTT service for real-time push
mqttService.init(io);

io.on('connection', (socket) => {
  socket.on('subscribe_unit', (unitId) => socket.join(`unit:${unitId}`));
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`SmartSol API running on port ${PORT}`));
