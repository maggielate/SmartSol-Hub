-- SmartSol Hub Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (customers, admins, business accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer','admin','business')),
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solar Units (deployed hardware)
CREATE TABLE solar_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  unit_type VARCHAR(30) CHECK (unit_type IN ('home','school','business','community')),
  battery_capacity_kwh DECIMAL(8,3),
  solar_panel_watt INTEGER,
  firmware_version VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPS Locations
CREATE TABLE unit_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES solar_units(id),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  address TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT Telemetry (time-series from devices)
CREATE TABLE telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES solar_units(id),
  battery_soc DECIMAL(5,2),
  battery_voltage DECIMAL(6,3),
  battery_temp DECIMAL(5,2),
  solar_power_w DECIMAL(8,2),
  load_power_w DECIMAL(8,2),
  daily_yield_kwh DECIMAL(8,3),
  grid_status VARCHAR(10),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telemetry_unit_time ON telemetry(unit_id, recorded_at DESC);

-- Energy Transactions (Pay-As-You-Go)
CREATE TABLE energy_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  unit_id UUID REFERENCES solar_units(id),
  amount_usd DECIMAL(10,2) NOT NULL,
  kwh_purchased DECIMAL(8,3),
  payment_method VARCHAR(20) CHECK (payment_method IN ('ecocash','onemoney','cash','credit')),
  payment_ref VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  token VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Predictions
CREATE TABLE energy_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES solar_units(id),
  predicted_demand_kwh DECIMAL(8,3),
  predicted_solar_kwh DECIMAL(8,3),
  battery_health_score DECIMAL(5,2),
  prediction_date DATE NOT NULL,
  confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES solar_units(id),
  user_id UUID REFERENCES users(id),
  alert_type VARCHAR(50),
  severity VARCHAR(10) CHECK (severity IN ('info','warning','critical')),
  message TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
