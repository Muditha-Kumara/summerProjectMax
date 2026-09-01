import bcrypt from 'bcryptjs';
import db from './database.js';
import logger from '../utils/logger.js';
import { runMigrations } from './migrate.js';

/**
 * Generate ~10 days of realistic hourly energy-consumption history for every
 * room so that the Energy Consumption charts (dashboard total + /admin/energy
 * detail chart) have data immediately after seeding.
 *
 * Idempotent: skipped when readings already cover a full week (7 distinct days
 * within the last 6 days).
 */
const seedEnergyHistory = async () => {
  const existing = await db.query(
    `SELECT COUNT(DISTINCT date_trunc('day', timestamp))::int AS n
     FROM historical_data
     WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '6 days'`
  );
  if (existing.rows[0].n >= 7) {
    logger.info('Energy history already covers a full week — skipping dummy data seed');
    return;
  }

  const roomsRes = await db.query('SELECT id, name FROM rooms ORDER BY id');
  const rooms = roomsRes.rows;
  if (!rooms.length) return;

  // Rough hourly kWh profile per device type (index = hour of day, UTC)
  const profileFor = (name) => {
    const base = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      // Quiet at night, peaks in morning (7-9) and evening (17-21)
      const morning = Math.exp(-((h - 8) ** 2) / 6);
      const evening = Math.exp(-((h - 19) ** 2) / 8);
      const night = h < 6 || h > 22 ? 0.25 : 1;
      base[h] = night * (0.3 + morning + evening);
    }
    switch (name) {
      case 'Lämminvesivaraaja': // water heater: big bursts at night + midday
        return base.map((v, h) => (h < 6 || h === 12 ? 1.8 + v : 0.2 + v * 0.3));
      case 'Ilmalämpöpumppu': // heat pump: steady, higher in cold hours
        return base.map((v, h) => 0.6 + v * 1.5 + (h < 7 || h > 21 ? 0.4 : 0));
      case 'Varasto': // storage: mostly off
        return base.map((v) => v * 0.1);
      default: // living spaces
        return base.map((v) => 0.15 + v * 0.8);
    }
  };

  const DAYS = 10;
  const now = new Date();
  // Seed through the end of the current week (next Monday 00:00 UTC) so the
  // week chart always shows a full Mon–Sun curve in demos.
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7)); // back to Monday 00:00 UTC
  const start = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);

  const values = [];
  for (const room of rooms) {
    const profile = profileFor(room.name);
    let t = new Date(start);
    let day = 0;
    while (t <= end) {
      const h = t.getUTCHours();
      // Day-to-day variation + noise; seed is deterministic-ish via sin
      const dayFactor = 0.8 + 0.4 * Math.abs(Math.sin((day + room.id) * 1.7));
      const noise = 0.85 + 0.3 * Math.abs(Math.sin((t.getTime() / 3.6e6 + room.id * 13) * 2.3));
      const energy = Math.max(0, profile[h] * dayFactor * noise); // kW-ish rate
      const energyKwh = energy / 4; // kWh consumed in this 15-min slot
      const temp = 20 + 2 * Math.sin((h - 14) / 24 * 2 * Math.PI) + (Math.random() - 0.5);
      const humidity = 45 + 8 * Math.sin(day / 3 + room.id) + (Math.random() - 0.5) * 4;
      const outdoor = 3 + 7 * Math.sin((h - 15) / 24 * 2 * Math.PI) + (Math.random() - 0.5) * 2;
      // Spot price: cheap at night, pricier morning/evening (EUR/kWh)
      const spot = 0.04 + 0.09 * (profile[h] / 1.3) + (Math.random() - 0.5) * 0.02;
      const target = room.name === 'Lämminvesivaraaja' ? 55 : room.name === 'Varasto' ? 15 : 21;
      values.push(
        `(${room.id}, '${t.toISOString().replace("T", " ").replace("Z", "")}', ${temp.toFixed(2)}, ${target.toFixed(2)}, ${energyKwh.toFixed(4)}, ${humidity.toFixed(1)}, ${outdoor.toFixed(1)}, ${Math.max(0.01, spot).toFixed(4)}, ${energy > 0.3})`
      );
      t = new Date(t.getTime() + 15 * 60 * 1000); // 15-min readings
      if (t.getUTCHours() === 0 && t.getUTCMinutes() === 0) day++;
    }
  }

  // Bulk insert in chunks to keep statements manageable
  const CHUNK = 2000;
  for (let i = 0; i < values.length; i += CHUNK) {
    const slice = values.slice(i, i + CHUNK).join(',');
    await db.query(
      `INSERT INTO historical_data
       (room_id, timestamp, current_temp, target_temp, energy_consumption, humidity, outdoor_temp, spot_price, relay_state)
       VALUES ${slice}`
    );
  }
  logger.info(`Seeded ${values.length} historical energy readings (${DAYS} days) for ${rooms.length} rooms`);
};

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

    // Seed ~10 days of dummy hourly energy-consumption history so the
    // Energy Consumption charts (dashboard totals / admin energy page)
    // have data out of the box. Skipped when recent data already exists.
    await seedEnergyHistory();

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
      { key: 'ai_model', value: process.env.AI_MODEL || 'qwen3.7-plus', description: 'AI model to use' },
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
