import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class ShellyService {
  constructor() {
    this.apiUrl = config.shelly.apiUrl;
    this.authKey = config.shelly.authKey;
    this.serverId = config.shelly.serverId;
  }

  async getDeviceStatus(deviceId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/device/status`,
        {
          id: deviceId,
          auth_key: this.authKey,
          server: this.serverId
        }
      );

      if (response.data.isok) {
        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        message: response.data.error || 'Unknown error'
      };
    } catch (error) {
      logger.error('Shelly API error - getDeviceStatus', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async setRelayState(deviceId, channel = 0, turn = 'on') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/device/relay/switch`,
        {
          id: deviceId,
          auth_key: this.authKey,
          server: this.serverId,
          channel,
          turn
        }
      );

      if (response.data.isok) {
        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        message: response.data.error || 'Unknown error'
      };
    } catch (error) {
      logger.error('Shelly API error - setRelayState', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getDeviceList() {
    try {
      const response = await axios.post(
        `${this.apiUrl}/device/list`,
        {
          auth_key: this.authKey,
          server: this.serverId
        }
      );

      if (response.data.isok) {
        return {
          success: true,
          devices: response.data.data.devices
        };
      }

      return {
        success: false,
        message: response.data.error || 'Unknown error'
      };
    } catch (error) {
      logger.error('Shelly API error - getDeviceList', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getTemperature(deviceId) {
    const status = await this.getDeviceStatus(deviceId);
    
    if (status.success && status.data.device_status) {
      const extTemperature = status.data.device_status.ext_temperature;
      if (extTemperature && extTemperature['0']) {
        return {
          success: true,
          temperature: extTemperature['0'].tC
        };
      }
    }

    return {
      success: false,
      message: 'Temperature not available'
    };
  }

  async getHumidity(deviceId) {
    const status = await this.getDeviceStatus(deviceId);
    
    if (status.success && status.data.device_status) {
      const extHumidity = status.data.device_status.ext_humidity;
      if (extHumidity && extHumidity['0']) {
        return {
          success: true,
          humidity: extHumidity['0'].hum
        };
      }
    }

    return {
      success: false,
      message: 'Humidity not available'
    };
  }

  async getPowerConsumption(deviceId) {
    const status = await this.getDeviceStatus(deviceId);
    
    if (status.success && status.data.device_status) {
      const meters = status.data.device_status.meters;
      if (meters && meters[0]) {
        return {
          success: true,
          power: meters[0].power,
          total: meters[0].total
        };
      }
    }

    return {
      success: false,
      message: 'Power consumption not available'
    };
  }
}

export default new ShellyService();
