import logger from '../utils/logger.js';

/**
 * Virtual Shelly Service - Simulates Shelly Cloud API for testing
 * 
 * This service mimics the behavior of real Shelly devices without requiring
 * actual hardware or Shelly Cloud API access. It simulates:
 * - Temperature changes based on relay state (heating on/off)
 * - Heat loss to environment (based on outdoor temperature)
 * - Power consumption when relay is active
 * - Humidity variations
 * 
 * Device state is stored in memory and persists during server runtime.
 */

class VirtualShellyService {
  constructor() {
    // Virtual device states - keyed by deviceId
    this.devices = new Map();
    
    // Simulation parameters
    this.simulationInterval = 60000; // Update every 60 seconds
    this.heatGainRate = 0.1; // °C per minute when heating on (for floor heating)
    this.heatLossRate = 0.02; // °C per minute per degree difference from outdoor
    this.outdoorTemp = 5; // Default outdoor temperature (°C)
    
    // Initialize default devices
    this.initializeDefaultDevices();
    
    // Start simulation loop
    this.startSimulation();
    
    logger.info('Virtual Shelly Service initialized - simulating device behavior');
  }

  /**
   * Initialize default virtual devices based on seed data
   */
  initializeDefaultDevices() {
    const defaultDevices = [
      {
        deviceId: 'shelly-plus-1pm-utility',
        name: 'Kodinhoitohuone',
        type: 'Shelly Plus 1PM',
        temperature: 18.5,
        humidity: 45,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: true
      },
      {
        deviceId: 'shelly-plus-1pm-hallway',
        name: 'Eteinen',
        type: 'Shelly Plus 1PM',
        temperature: 19.0,
        humidity: 42,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: false
      },
      {
        deviceId: 'shelly-plus-1pm-bedroom',
        name: 'Makuuhuone',
        type: 'Shelly Plus 1PM',
        temperature: 18.8,
        humidity: 44,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: false
      },
      {
        deviceId: 'shelly-plus-1pm-living',
        name: 'Olohuone',
        type: 'Shelly Plus 1PM',
        temperature: 19.2,
        humidity: 43,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: false
      },
      {
        deviceId: 'shelly-plus-1pm-storage',
        name: 'Varasto',
        type: 'Shelly Plus 1PM',
        temperature: 15.5,
        humidity: 50,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: false
      },
      {
        deviceId: 'shelly-pro-4pm-water',
        name: 'Lämminvesivaraaja',
        type: 'Shelly Pro 4PM',
        temperature: 52.0,
        humidity: 0,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: false
      },
      {
        deviceId: 'shelly-pro-1pm-heatpump',
        name: 'Ilmalämpöpumppu',
        type: 'Shelly Pro 1PM',
        temperature: 20.0,
        humidity: 40,
        relayState: false,
        power: 0,
        totalEnergy: 0,
        isCritical: true
      }
    ];

    defaultDevices.forEach(device => {
      this.devices.set(device.deviceId, {
        ...device,
        lastUpdate: Date.now()
      });
    });

    logger.info(`Initialized ${defaultDevices.length} virtual Shelly devices`);
  }

  /**
   * Start simulation loop - updates device states periodically
   */
  startSimulation() {
    setInterval(() => {
      this.simulateDeviceBehavior();
    }, this.simulationInterval);
  }

  /**
   * Simulate device behavior - temperature changes, power consumption
   */
  simulateDeviceBehavior() {
    const now = Date.now();
    
    this.devices.forEach((device, deviceId) => {
      const elapsedMinutes = (now - device.lastUpdate) / 60000;
      
      // Calculate temperature change
      let tempChange = 0;
      
      if (device.relayState) {
        // Heating is ON - temperature increases
        tempChange = this.heatGainRate * elapsedMinutes;
        
        // Power consumption (W) - varies by device type
        if (device.type.includes('Pro 4PM')) {
          device.power = 3000; // Water heater - 3kW
        } else if (device.type.includes('Pro 1PM')) {
          device.power = 1500; // Heat pump - 1.5kW
        } else {
          device.power = 1200; // Floor heating - 1.2kW typical
        }
        
        // Accumulate energy (kWh)
        const energyKwh = (device.power / 1000) * (elapsedMinutes / 60);
        device.totalEnergy += energyKwh;
      } else {
        // Heating is OFF - temperature decreases (heat loss)
        const tempDiff = device.temperature - this.outdoorTemp;
        tempChange = -this.heatLossRate * tempDiff * elapsedMinutes;
        device.power = 0;
      }
      
      // Apply temperature change
      device.temperature += tempChange;
      
      // Simulate humidity changes (slight increase when heating, decrease when off)
      if (device.humidity > 0) {
        const humidityChange = device.relayState ? -0.1 * elapsedMinutes : 0.05 * elapsedMinutes;
        device.humidity = Math.max(30, Math.min(70, device.humidity + humidityChange));
      }
      
      device.lastUpdate = now;
    });
  }

  /**
   * Set outdoor temperature (affects heat loss simulation)
   */
  setOutdoorTemperature(temp) {
    this.outdoorTemp = temp;
    logger.info(`Virtual outdoor temperature set to ${temp}°C`);
  }

  /**
   * Get device status - mimics Shelly Cloud API response
   */
  async getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      return {
        success: false,
        message: `Virtual device ${deviceId} not found`
      };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      data: {
        device_status: {
          ext_temperature: device.temperature > 0 ? {
            '0': {
              tC: parseFloat(device.temperature.toFixed(1))
            }
          } : null,
          ext_humidity: device.humidity > 0 ? {
            '0': {
              hum: parseFloat(device.humidity.toFixed(1))
            }
          } : null,
          meters: [{
            power: device.power,
            total: parseFloat(device.totalEnergy.toFixed(3)),
            is_valid: true
          }],
          relays: [{
            ison: device.relayState,
            has_timer: false,
            timer_started: 0,
            timer_duration: 0,
            timer_remaining: 0,
            override: false
          }],
          wifi_sta: {
            connected: true,
            ssid: 'VirtualWiFi',
            ip: '192.168.1.100',
            rssi: -50
          },
          update: {
            status: 'idle',
            has_update: false
          }
        }
      }
    };
  }

  /**
   * Set relay state - mimics Shelly Cloud API
   */
  async setRelayState(deviceId, channel = 0, turn = 'on') {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      return {
        success: false,
        message: `Virtual device ${deviceId} not found`
      };
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const newState = turn === 'on';
    device.relayState = newState;
    device.lastUpdate = Date.now();

    logger.info(`Virtual device ${deviceId} (${device.name}) relay ${channel} turned ${newState ? 'ON' : 'OFF'}`);

    return {
      success: true,
      data: {
        isok: true,
        relays: [{
          ison: newState,
          has_timer: false
        }]
      }
    };
  }

  /**
   * Get device list - mimics Shelly Cloud API
   */
  async getDeviceList() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const devices = Array.from(this.devices.entries()).map(([deviceId, device]) => ({
      id: deviceId,
      name: device.name,
      type: device.type,
      hostname: `shelly-${deviceId}`,
      ip: '192.168.1.100',
      has_update: false,
      fw_info: '2023-01-01',
      authenticated: true
    }));

    return {
      success: true,
      devices
    };
  }

  /**
   * Get temperature - convenience method
   */
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

  /**
   * Get humidity - convenience method
   */
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

  /**
   * Get power consumption - convenience method
   */
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

  /**
   * Get all virtual device states (for debugging/testing)
   */
  getAllDeviceStates() {
    return Array.from(this.devices.entries()).map(([deviceId, device]) => ({
      deviceId,
      name: device.name,
      temperature: parseFloat(device.temperature.toFixed(1)),
      humidity: parseFloat(device.humidity.toFixed(1)),
      relayState: device.relayState,
      power: device.power,
      totalEnergy: parseFloat(device.totalEnergy.toFixed(3))
    }));
  }

  /**
   * Reset device to initial state (for testing)
   */
  resetDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.temperature = 19.0;
      device.humidity = 45;
      device.relayState = false;
      device.power = 0;
      device.totalEnergy = 0;
      device.lastUpdate = Date.now();
      logger.info(`Virtual device ${deviceId} reset to initial state`);
    }
  }
}

export default new VirtualShellyService();
