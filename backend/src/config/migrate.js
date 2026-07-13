import db from './database.js';
import logger from '../utils/logger.js';

const schema = `
-- Users table (Admin users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  name_fi VARCHAR(255),
  name_sv VARCHAR(255),
  name_en VARCHAR(255),
  shelly_device_id VARCHAR(255),
  shelly_device_type VARCHAR(100),
  current_temp DECIMAL(5,2),
  target_temp DECIMAL(5,2) DEFAULT 20.00,
  min_temp DECIMAL(5,2) DEFAULT 5.00,
  max_temp DECIMAL(5,2) DEFAULT 30.00,
  humidity DECIMAL(5,2),
  is_critical BOOLEAN DEFAULT FALSE,
  critical_min_temp DECIMAL(5,2),
  control_mode VARCHAR(50) DEFAULT 'thermostat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historical data (temperature, humidity, energy)
CREATE TABLE IF NOT EXISTS historical_data (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_temp DECIMAL(5,2),
  target_temp DECIMAL(5,2),
  humidity DECIMAL(5,2),
  relay_state BOOLEAN,
  energy_consumption DECIMAL(10,4),
  outdoor_temp DECIMAL(5,2),
  spot_price DECIMAL(10,4)
);

CREATE INDEX IF NOT EXISTS idx_historical_data_room_timestamp ON historical_data(room_id, timestamp DESC);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  pin VARCHAR(10) UNIQUE NOT NULL,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  preferred_temp DECIMAL(5,2) DEFAULT 21.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thermal capacities
CREATE TABLE IF NOT EXISTS thermal_capacities (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  heating_time_minutes INTEGER,
  temp_rise DECIMAL(5,2),
  capacity DECIMAL(10,4),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spot prices
CREATE TABLE IF NOT EXISTS spot_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  area VARCHAR(10) DEFAULT 'FI',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(timestamp, area)
);

CREATE INDEX IF NOT EXISTS idx_spot_prices_timestamp ON spot_prices(timestamp DESC);

-- Weather data
CREATE TABLE IF NOT EXISTS weather_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outdoor_temp DECIMAL(5,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  description VARCHAR(255),
  forecast JSONB
);

-- Heating schedules
CREATE TABLE IF NOT EXISTS heating_schedules (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  target_temp DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  condition_type VARCHAR(50),
  condition_value TEXT,
  action_type VARCHAR(50),
  action_value TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Away schedules (for temporary away mode with auto-restore)
CREATE TABLE IF NOT EXISTS away_schedules (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  previous_mode VARCHAR(50),
  previous_target_temps JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_away_schedules_status_end_time ON away_schedules(status, end_time);
`;

export const runMigrations = async () => {
  try {
    logger.info('Running database migrations...');
    await db.query(schema);
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', error);
    throw error;
  }
};

export default runMigrations;
