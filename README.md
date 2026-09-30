# ⚡ SmartSol Hub — Smart Energy Management Platform

A full-stack, technology-enabled solar energy platform for Zimbabwe and beyond.

## Platform Components

| Component | Tech | Purpose |
|-----------|------|---------|
| `backend/` | Node.js + Express | REST API, WebSocket, business logic |
| `dashboard/` | React + Chart.js + Leaflet | Web dashboard for schools/businesses |
| `mobile/` | React Native | iOS & Android customer app |
| `ussd/` | Africa's Talking | Feature phone access via USSD |
| `iot/` | ESP32 (C++) | Solar unit firmware → AWS IoT Core |
| `ai/` | Python + scikit-learn | Demand prediction & battery health |
| `infra/` | AWS CDK | Cloud infrastructure as code |

## Features

- ☀️ **Pay-As-You-Go** energy via EcoCash & OneMoney
- 📱 **Mobile App** — real-time battery, solar, load monitoring
- 📟 **USSD** — works on any phone, no internet needed (`*123#`)
- 🌐 **IoT** — ESP32 publishes telemetry every 30s to AWS IoT Core
- 🔋 **Smart Battery Management** — auto alerts at 20% and 10% SoC
- 📊 **Dashboard** — live charts, GPS map, alert management
- 🤖 **AI Predictions** — 7-day demand & solar forecast, battery health score
- 📍 **GPS Tracking** — all deployed units on live map via AWS Location

## AWS Services Used

- **ECS Fargate** — containerised backend API
- **RDS PostgreSQL** — primary database
- **ElastiCache Redis** — session & caching
- **AWS IoT Core** — MQTT broker for device telemetry
- **AWS Location Service** — GPS tracker for deployed units
- **Lambda** — AI prediction function
- **S3** — OTA firmware updates
- **ALB** — load balancer for API

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone and configure
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Start all services
```bash
docker-compose up --build
```

Services will be available at:
- API: http://localhost:3000
- Dashboard: http://localhost:3001
- AI Service: http://localhost:5001

### 3. Run database migrations
```bash
docker exec -it smartsol_postgres psql -U smartsol_user -d smartsol -f /docker-entrypoint-initdb.d/schema.sql
```

## Mobile App Setup

```bash
cd mobile
npm install
npx react-native run-android   # or run-ios
```

## IoT Firmware Setup

1. Open `iot/firmware/smartsol_device.ino` in Arduino IDE
2. Install libraries: `PubSubClient`, `ArduinoJson`, `TinyGPS++`
3. Add your AWS IoT certificates as `AWS_CERT_CA`, `AWS_CERT_CRT`, `AWS_PRIVATE_KEY`
4. Set `WIFI_SSID`, `WIFI_PASSWORD`, `UNIT_ID`, `MQTT_BROKER`
5. Flash to ESP32

## AWS Deployment

```bash
cd infra
npm install
npx cdk bootstrap
npx cdk deploy
```

## USSD Flow (`*123#`)

```
1. Check Balance & Usage
2. Buy Energy (Pay-As-You-Go)
   └── Enter amount → Choose EcoCash/OneMoney → Confirm
3. Battery Status
4. Report Fault
5. My Account
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/units` | List solar units |
| GET | `/api/telemetry/:unitId` | Telemetry history |
| POST | `/api/payments/initiate` | Start PAYG payment |
| POST | `/api/ussd` | USSD callback |
| GET | `/api/gps/map` | All unit locations |
| GET | `/api/predictions/:unitId` | AI forecasts |
| GET | `/api/alerts` | Active alerts |

## Environment Variables

See `backend/.env.example` for full list. Key variables:
- `ECOCASH_API_KEY` — EcoCash payment gateway
- `ONEMONEY_API_KEY` — OneMoney payment gateway
- `AT_API_KEY` — Africa's Talking (USSD/SMS)
- `AWS_IOT_ENDPOINT` — AWS IoT Core endpoint
- `AI_SERVICE_URL` — Python AI service URL

## Architecture

```
Mobile App ──┐
Dashboard ───┤──► ALB ──► ECS (Node.js API) ──► RDS PostgreSQL
USSD ────────┘                │                ──► ElastiCache Redis
                              │
ESP32 ──► AWS IoT Core ───────┤──► Lambda (AI)
                              │
                         AWS Location (GPS)
```
