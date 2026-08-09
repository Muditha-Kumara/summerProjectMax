import bcrypt from 'bcryptjs';
import db from './database.js';
import logger from '../utils/logger.js';
import { runMigrations } from './migrate.js';

const seedData = async () => {
  try {
    // Ensure tables exist before seeding
    await runMigrations();

    logger.info('Seeding database...');

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@example.com', passwordHash, 'Admin User', 'admin']
    );
    logger.info('Admin user created (admin@example.com / admin123)');

    // Create default rooms based on hardware mapping
    const rooms = [
      {
        name: 'Kodinhoitohuone',
        name_fi: 'Kodinhoitohuone',
        name_sv: 'Tvättstuga',
        name_en: 'Utility Room',
        shelly_device_id: 'shelly-plus-1pm-utility',
        shelly_device_type: 'Shelly Plus 1PM',
        is_critical: true,
        critical_min_temp: 15.00,
        min_temp: 15.00,
        max_temp: 25.00,
        target_temp: 20.00
      },
      {
        name: 'Eteinen',
        name_fi: 'Eteinen',
        name_sv: 'Hall',
        name_en: 'Hallway',
        shelly_device_id: 'shelly-plus-1pm-hallway',
        shelly_device_type: 'Shelly Plus 1PM',
        is_critical: false,
        min_temp: 10.00,
        max_temp: 25.00,
        target_temp: 20.00
      },
      {
        name: 'Makuuhuone',
        name_fi: 'Makuuhuone',
        name_sv: 'Sovrum',
        name_en: 'Bedroom',
        shelly_device_id: 'shelly-plus-1pm-bedroom',
        shelly_device_type: 'Shelly Plus 1PM',
        is_critical: false,
        min_temp: 10.00,
        max_temp: 25.00,
        target_temp: 20.00
      },
      {
        name: 'Olohuone',
        name_fi: 'Olohuone',
        name_sv: 'Vardagsrum',
        name_en: 'Living Room',
        shelly_device_id: 'shelly-plus-1pm-living',
        shelly_device_type: 'Shelly Plus 1PM',
        is_critical: false,
        min_temp: 10.00,
        max_temp: 28.00,
        target_temp: 21.00
      },
      {
        name: 'Varasto',
        name_fi: 'Varasto',
        name_sv: 'Förråd',
        name_en: 'Storage',
        shelly_device_id: 'shelly-plus-1pm-storage',
        shelly_device_type: 'Shelly Plus 1PM',
        is_critical: false,
        min_temp: 5.00,
        max_temp: 20.00,
        target_temp: 15.00
      },
      {
        name: 'Lämminvesivaraaja',
        name_fi: 'Lämminvesivaraaja',
        name_sv: 'Varmvattenberedare',
        name_en: 'Water Heater',
        shelly_device_id: 'shelly-pro-4pm-water',
        shelly_device_type: 'Shelly Pro 4PM',
        is_critical: false,
        min_temp: 50.00,
        max_temp: 80.00,
        target_temp: 55.00
      },
      {
        name: 'Ilmalämpöpumppu',
        name_fi: 'Ilmalämpöpumppu',
        name_sv: 'Luftvärmepump',
        name_en: 'Heat Pump',
        shelly_device_id: 'shelly-pro-1pm-heatpump',
        shelly_device_type: 'Shelly Pro 1PM',
        is_critical: true,
        critical_min_temp: 15.00,
        min_temp: 16.00,
        max_temp: 30.00,
        target_temp: 21.00
      }
    ];

    for (const room of rooms) {
      await db.query(
        `INSERT INTO rooms (name, name_fi, name_sv, name_en, shelly_device_id, shelly_device_type, is_critical, critical_min_temp, min_temp, max_temp, target_temp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (name) DO NOTHING`,
        [room.name, room.name_fi, room.name_sv, room.name_en, room.shelly_device_id, room.shelly_device_type, room.is_critical, room.critical_min_temp, room.min_temp, room.max_temp, room.target_temp]
      );
    }
    logger.info(`${rooms.length} rooms created`);

    // Create default system settings
    // Note: Mode temperatures are now room-specific (see ROOM_MODE_TEMPS in optimizationService.js)
    // These values serve as fallback defaults for rooms not in the room-specific map
    const settings = [
      { key: 'default_mode', value: 'home', description: 'Default heating mode' },
      { key: 'eco_temp', value: '19', description: 'Eco mode temperature (fallback for living spaces)' },
      { key: 'away_temp', value: '15', description: 'Away mode temperature (fallback for living spaces)' },
      { key: 'comfort_temp', value: '23', description: 'Comfort mode temperature (fallback for living spaces)' },
      { key: 'home_temp', value: '21', description: 'Home mode temperature (fallback for living spaces)' },
      { key: 'optimization_enabled', value: 'true', description: 'Enable spot-price optimization' },
      { key: 'winter_safeguards_enabled', value: 'true', description: 'Enable winter safeguards' }
    ];

    for (const setting of settings) {
      await db.query(
        `INSERT INTO system_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [setting.key, setting.value, setting.description]
      );
    }
    logger.info(`${settings.length} system settings created`);

    // Seed API keys and service settings from environment variables
    const apiSettings = [
      { key: 'shelly_auth_key', value: process.env.SHELLY_AUTH_KEY || '', description: 'Shelly Cloud API authentication key' },
      { key: 'shelly_server_id', value: process.env.SHELLY_SERVER_ID || '', description: 'Shelly server identifier' },
      { key: 'nordpool_area', value: process.env.NORD_POOL_AREA || 'FI', description: 'Nord Pool price area (e.g., FI, NO, SE)' },
      { key: 'openweather_api_key', value: process.env.OPENWEATHER_API_KEY || '', description: 'OpenWeatherMap API key' },
      { key: 'openweather_lat', value: process.env.OPENWEATHER_LAT || '60.1699', description: 'Latitude for weather data' },
      { key: 'openweather_lon', value: process.env.OPENWEATHER_LON || '24.9384', description: 'Longitude for weather data' },
      { key: 'openweather_units', value: process.env.OPENWEATHER_UNITS || 'metric', description: 'Weather units (metric/imperial)' },
      { key: 'openai_api_key', value: process.env.OPENAI_API_KEY || '', description: 'OpenAI-compatible API key (DashScope/Qwen)' },
      { key: 'ai_model', value: process.env.AI_MODEL || 'qwen-plus', description: 'AI model to use' },
      { key: 'ai_endpoint', value: process.env.AI_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1', description: 'AI API endpoint base URL' },
      { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', description: 'SMTP server host' },
      { key: 'smtp_port', value: process.env.SMTP_PORT || '587', description: 'SMTP server port' },
      { key: 'smtp_secure', value: process.env.SMTP_SECURE || 'false', description: 'Use SSL/TLS for SMTP' },
      { key: 'smtp_user', value: process.env.SMTP_USER || '', description: 'SMTP username' },
      { key: 'smtp_pass', value: process.env.SMTP_PASS || '', description: 'SMTP password' },
      { key: 'smtp_from', value: process.env.SMTP_FROM || 'Smart Heating <noreply@example.com>', description: 'From email address for notifications' }
    ];

    for (const setting of apiSettings) {
      if (setting.value) {
        await db.query(
          `INSERT INTO system_settings (key, value, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (key) DO NOTHING`,
          [setting.key, setting.value, setting.description]
        );
      }
    }
    logger.info(`API settings seeded from environment variables`);

    // Create sample booking with PIN
    const sampleBookingPin = '1234';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await db.query(
      `INSERT INTO bookings (guest_name, guest_email, pin, check_in, check_out, preferred_temp, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      ['Sample Guest', 'guest@example.com', sampleBookingPin, yesterday.toISOString(), nextWeek.toISOString(), 21.00, 'confirmed']
    );
    logger.info(`Sample booking created with PIN: ${sampleBookingPin}`);

    logger.info('Database seeding completed');
  } catch (error) {
    logger.error('Database seeding failed', error);
    throw error;
  }
};

// Run if called directly
if (process.argv[1].includes('seed.js')) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedData;
