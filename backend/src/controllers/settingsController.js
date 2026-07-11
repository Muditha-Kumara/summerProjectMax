import SystemSettings from '../models/SystemSettings.js';
import logger from '../utils/logger.js';

class SettingsController {
  /**
   * GET /api/v1/settings
   * Get all system settings
   */
  static async getAll(req, res) {
    try {
      const settings = await SystemSettings.getAll();
      const settingsMap = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error) {
      logger.error('Failed to get settings', error);
      res.status(500).json({ message: 'Failed to retrieve settings' });
    }
  }

  /**
   * GET /api/v1/settings/keys
   * Get API keys and credentials (masked)
   */
  static async getKeys(req, res) {
    try {
      const settings = await SystemSettings.getAll();
      const settingsMap = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });

      // Return keys with masking for sensitive values
      const keys = {
        shelly: settingsMap.shelly_auth_key || '',
        shellyServerId: settingsMap.shelly_server_id || '',
        nordPool: settingsMap.nordpool_api_key || '',
        nordPoolArea: settingsMap.nordpool_area || 'FI',
        openWeather: settingsMap.openweather_api_key || '',
        openWeatherLat: settingsMap.openweather_lat || '60.1699',
        openWeatherLon: settingsMap.openweather_lon || '24.9384',
        openWeatherUnits: settingsMap.openweather_units || 'metric',
        openai: settingsMap.openai_api_key || '',
        aiModel: settingsMap.ai_model || 'qwen-turbo',
        aiEndpoint: settingsMap.ai_endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        smtpHost: settingsMap.smtp_host || '',
        smtpPort: settingsMap.smtp_port || '587',
        smtpSecure: settingsMap.smtp_secure || 'false',
        smtpUser: settingsMap.smtp_user || '',
        smtpPass: settingsMap.smtp_pass || '',
        smtpFrom: settingsMap.smtp_from || '',
      };

      res.json(keys);
    } catch (error) {
      logger.error('Failed to get API keys', error);
      res.status(500).json({ message: 'Failed to retrieve API keys' });
    }
  }

  /**
   * PUT /api/v1/settings/keys
   * Update API keys and credentials
   */
  static async updateKeys(req, res) {
    try {
      const {
        shelly,
        shellyServerId,
        nordPool,
        nordPoolArea,
        openWeather,
        openWeatherLat,
        openWeatherLon,
        openWeatherUnits,
        openai,
        aiModel,
        aiEndpoint,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPass,
        smtpFrom,
      } = req.body;

      // Update each setting
      const updates = [
        { key: 'shelly_auth_key', value: shelly, desc: 'Shelly Cloud API authentication key' },
        { key: 'shelly_server_id', value: shellyServerId, desc: 'Shelly server identifier' },
        { key: 'nordpool_api_key', value: nordPool, desc: 'Nord Pool API key' },
        { key: 'nordpool_area', value: nordPoolArea, desc: 'Nord Pool price area (e.g., FI, NO, SE)' },
        { key: 'openweather_api_key', value: openWeather, desc: 'OpenWeatherMap API key' },
        { key: 'openweather_lat', value: openWeatherLat, desc: 'Latitude for weather data' },
        { key: 'openweather_lon', value: openWeatherLon, desc: 'Longitude for weather data' },
        { key: 'openweather_units', value: openWeatherUnits, desc: 'Weather units (metric/imperial)' },
        { key: 'openai_api_key', value: openai, desc: 'OpenAI-compatible API key (DashScope/Qwen)' },
        { key: 'ai_model', value: aiModel, desc: 'AI model to use (qwen-turbo, qwen-plus, qwen-max)' },
        { key: 'ai_endpoint', value: aiEndpoint, desc: 'AI API endpoint base URL' },
        { key: 'smtp_host', value: smtpHost, desc: 'SMTP server host' },
        { key: 'smtp_port', value: smtpPort, desc: 'SMTP server port' },
        { key: 'smtp_secure', value: smtpSecure, desc: 'Use SSL/TLS for SMTP' },
        { key: 'smtp_user', value: smtpUser, desc: 'SMTP username' },
        { key: 'smtp_pass', value: smtpPass, desc: 'SMTP password' },
        { key: 'smtp_from', value: smtpFrom, desc: 'From email address for notifications' },
      ];

      for (const update of updates) {
        if (update.value !== undefined && update.value !== null) {
          await SystemSettings.set(update.key, update.value, update.desc);
        }
      }

      logger.info('API keys updated by admin');
      res.json({ message: 'API keys updated successfully' });
    } catch (error) {
      logger.error('Failed to update API keys', error);
      res.status(500).json({ message: 'Failed to update API keys' });
    }
  }

  /**
   * GET /api/v1/settings/mapping
   * Get device mappings
   */
  static async getMappings(req, res) {
    try {
      const Room = (await import('../models/Room.js')).default;
      const rooms = await Room.findAll();
      res.json(rooms);
    } catch (error) {
      logger.error('Failed to get mappings', error);
      res.status(500).json({ message: 'Failed to retrieve mappings' });
    }
  }

  /**
   * PUT /api/v1/settings/mapping
   * Update device mappings
   */
  static async updateMappings(req, res) {
    try {
      const { mappings } = req.body;
      const Room = (await import('../models/Room.js')).default;

      for (const mapping of mappings) {
        await Room.update(mapping.roomId, {
          shelly_device_id: mapping.shellyDeviceId,
        });
      }

      logger.info('Device mappings updated by admin');
      res.json({ message: 'Device mappings updated successfully' });
    } catch (error) {
      logger.error('Failed to update mappings', error);
      res.status(500).json({ message: 'Failed to update mappings' });
    }
  }

  /**
   * GET /api/v1/settings/system
   * Get system configuration
   */
  static async getSystemSettings(req, res) {
    try {
      const settings = await SystemSettings.getAll();
      const settingsMap = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });

      const system = {
        timezone: settingsMap.system_timezone || 'Europe/Helsinki',
        language: settingsMap.system_language || 'en',
        currency: settingsMap.system_currency || 'EUR',
        temperatureUnit: settingsMap.temperature_unit || 'celsius',
        priceThreshold: settingsMap.price_threshold || '0',
        ecoModeEnabled: settingsMap.eco_mode_enabled || 'true',
        notificationsEnabled: settingsMap.notifications_enabled || 'true',
      };

      res.json(system);
    } catch (error) {
      logger.error('Failed to get system settings', error);
      res.status(500).json({ message: 'Failed to retrieve system settings' });
    }
  }

  /**
   * PUT /api/v1/settings/system
   * Update system configuration
   */
  static async updateSystemSettings(req, res) {
    try {
      const {
        timezone,
        language,
        currency,
        temperatureUnit,
        priceThreshold,
        ecoModeEnabled,
        notificationsEnabled,
      } = req.body;

      const updates = [
        { key: 'system_timezone', value: timezone, desc: 'System timezone' },
        { key: 'system_language', value: language, desc: 'Default language' },
        { key: 'system_currency', value: currency, desc: 'Currency for price display' },
        { key: 'temperature_unit', value: temperatureUnit, desc: 'Temperature unit (celsius/fahrenheit)' },
        { key: 'price_threshold', value: priceThreshold, desc: 'Price threshold for optimization alerts' },
        { key: 'eco_mode_enabled', value: ecoModeEnabled, desc: 'Enable eco mode features' },
        { key: 'notifications_enabled', value: notificationsEnabled, desc: 'Enable email notifications' },
      ];

      for (const update of updates) {
        if (update.value !== undefined && update.value !== null) {
          await SystemSettings.set(update.key, update.value, update.desc);
        }
      }

      logger.info('System settings updated by admin');
      res.json({ message: 'System settings updated successfully' });
    } catch (error) {
      logger.error('Failed to update system settings', error);
      res.status(500).json({ message: 'Failed to update system settings' });
    }
  }
}

export default SettingsController;
