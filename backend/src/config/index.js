import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const dbName = process.env.POSTGRES_DB || process.env.DB_NAME || 'smart_heating';
const dbUser = process.env.POSTGRES_USER || process.env.DB_USER || 'postgres';
const dbPassword = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres';

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // User PIN
  userPin: {
    length: parseInt(process.env.USER_PIN_LENGTH, 10) || 4,
    expiresIn: process.env.USER_PIN_EXPIRES_IN || '24h',
  },

  // Shelly Cloud
  shelly: {
    apiUrl: process.env.SHELLY_CLOUD_API_URL || 'https://shelly-14-eu.shelly.cloud',
    authKey: process.env.SHELLY_AUTH_KEY || '',
    serverId: process.env.SHELLY_SERVER_ID || '',
    useVirtual: process.env.USE_VIRTUAL_SHELLY === 'true',
  },

  // Nord Pool
  nordPool: {
    apiUrl: process.env.NORD_POOL_API_URL || 'https://www.nordpoolgroup.com/api/marketdata',
    area: process.env.NORD_POOL_AREA || 'FI',
    useMockPrices: process.env.USE_MOCK_PRICES === 'true',
  },

  // Spot-hinta.fi (free alternative)
  spotHinta: {
    apiUrl: process.env.SPOT_HINTA_API_URL || 'https://api.spot-hinta.fi',
    enabled: process.env.PRICE_SOURCE === 'spothinta',
  },

  // Price source: 'nordpool', 'spothinta', or 'mock'
  priceSource: process.env.PRICE_SOURCE || 'mock',

  // OpenWeatherMap
  openWeather: {
    apiKey: process.env.OPENWEATHER_API_KEY || '',
    lat: parseFloat(process.env.OPENWEATHER_LAT || '60.1699'),
    lon: parseFloat(process.env.OPENWEATHER_LON || '24.9384'),
    units: process.env.OPENWEATHER_UNITS || 'metric',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Smart Heating <noreply@example.com>',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
};

export default config;
