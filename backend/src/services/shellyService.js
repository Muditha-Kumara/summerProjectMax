import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import virtualShellyService from './virtualShellyService.js';

class ShellyService {
  constructor() {
    this.apiUrl = config.shelly.apiUrl;
    this.authKey = config.shelly.authKey;
    this.serverId = config.shelly.serverId;
    this.useVirtual = config.shelly.useVirtual;
    
    if (this.useVirtual) {
      logger.info('Shelly Service: Using VIRTUAL mode (no real hardware needed)');
    } else {
      logger.info('Shelly Service: Using REAL Shelly Cloud API');
    }
  }

  async getDeviceStatus(deviceId) {
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.getDeviceStatus(deviceId);
    }

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
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.setRelayState(deviceId, channel, turn);
    }

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

  /**
   * Sync a room's thermostat setpoint to the device.
   * In virtual mode the simulator heats toward this target; with real hardware
   * the physical thermostat handles it, so this is a no-op there.
   */
  async setTargetTemperature(deviceId, targetTemp) {
    if (this.useVirtual) {
      virtualShellyService.setTargetTemperature(deviceId, targetTemp);
    }
    return { success: true };
  }

  async getDeviceList() {
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.getDeviceList();
    }

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
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.getTemperature(deviceId);
    }

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
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.getHumidity(deviceId);
    }

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
    // Use virtual service if enabled
    if (this.useVirtual) {
      return virtualShellyService.getPowerConsumption(deviceId);
    }

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
