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
        aiModel: settingsMap.ai_model || 'qwen-plus',
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
        { key: 'ai_model', value: aiModel, desc: 'AI model to use (qwen-plus, qwen-max)' },
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
   * POST /api/v1/settings/test-email
   * Send a test email to verify SMTP settings
   */
  static async testEmail(req, res) {
    try {
      const EmailService = (await import('../services/emailService.js')).default;
      
      const testEmail = {
        guest_email: req.body.email || req.user?.email,
        guest_name: 'Test User',
        pin: '1234',
        check_in: new Date(),
        check_out: new Date(Date.now() + 86400000)
      };

      if (!testEmail.guest_email) {
        return res.status(400).json({ 
          success: false, 
          message: 'No email address provided' 
        });
      }

      const result = await EmailService.sendBookingConfirmation(testEmail);
      
      res.json({ 
        success: result.success, 
        message: result.success 
          ? 'Test email sent successfully! Check your inbox.' 
          : `Failed to send email: ${result.message}` 
      });
    } catch (error) {
      logger.error('Test email failed', error);
      res.status(500).json({ 
        success: false, 
        message: `Test email failed: ${error.message}` 
      });
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

  /**
   * POST /api/v1/settings/test-weather
   * Test OpenWeather API connection
   */
  static async testWeather(req, res) {
    try {
      const WeatherService = (await import('../services/weatherService.js')).default;
      const result = await WeatherService.getCurrentWeather();
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Weather API working! Current temp: ${result.data.temperature}°C, ${result.data.description}`
          : `Weather API failed: ${result.message}`,
        data: result.success ? result.data : null
      });
    } catch (error) {
      logger.error('Weather test failed', error);
      res.status(500).json({ 
        success: false, 
        message: `Weather test failed: ${error.message}` 
      });
    }
  }

  /**
   * POST /api/v1/settings/test-nordpool
   * Test Nord Pool API connection
   */
  static async testNordPool(req, res) {
    try {
      const NordPoolService = (await import('../services/nordPoolService.js')).default;
      const result = await NordPoolService.fetchSpotPrices(24);
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Price API working! Retrieved ${result.prices?.length || 0} price entries`
          : `Price API failed: ${result.message}`,
        data: result.success ? { count: result.prices?.length || 0 } : null
      });
    } catch (error) {
      logger.error('Price API test failed', error);
      res.status(500).json({ 
        success: false, 
        message: `Price API test failed: ${error.message}` 
      });
    }
  }

  /**
   * POST /api/v1/settings/test-shelly
   * Test Shelly Cloud API connection
   */
  static async testShelly(req, res) {
    try {
      const ShellyService = (await import('../services/shellyService.js')).default;
      const result = await ShellyService.getDeviceList();
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Shelly Cloud API working! Found ${result.data?.devices?.length || 0} devices`
          : `Shelly Cloud API failed: ${result.message}`,
        data: result.success ? { deviceCount: result.data?.devices?.length || 0 } : null
      });
    } catch (error) {
      logger.error('Shelly test failed', error);
      res.status(500).json({ 
        success: false, 
        message: `Shelly test failed: ${error.message}` 
      });
    }
  }

  /**
   * POST /api/v1/settings/test-ai
   * Test AI API connection
   */
  static async testAI(req, res) {
    try {
      const AIService = (await import('../services/aiService.js')).default;
      const apiKey = await AIService.getApiKey();
      const model = await AIService.getModel();
      const endpoint = await AIService.getEndpoint();
      
      if (!apiKey) {
        return res.json({
          success: false,
          message: 'AI API key not configured. Please set it in the settings above.'
        });
      }

      // Simple test request
      const axios = (await import('axios')).default;
      const response = await axios.post(
        `${endpoint}/chat/completions`,
        {
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      res.json({
        success: true,
        message: `AI API working! Model: ${model}, Response: ${response.data.choices?.[0]?.message?.content || 'OK'}`
      });
    } catch (error) {
      logger.error('AI test failed', error);
      res.status(500).json({ 
        success: false, 
        message: `AI test failed: ${error.response?.data?.error?.message || error.message}` 
      });
    }
  }
}

export default SettingsController;
