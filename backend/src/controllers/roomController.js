import Room from '../models/Room.js';
import HistoricalData from '../models/HistoricalData.js';
import ShellyService from '../services/shellyService.js';
import WeatherService from '../services/weatherService.js';
import logger from '../utils/logger.js';

class RoomController {
  // Get all rooms
  async getAll(req, res) {
    try {
      const rooms = await Room.findAll();
      
      // Fetch current weather for outdoor temp
      const weather = await WeatherService.getCurrentWeather();
      const outdoorTemp = weather.success ? weather.data.temperature : null;

      // Enhance rooms with heating status, temperature, and humidity from Shelly devices
      const enhancedRooms = await Promise.all(
        rooms.map(async (room) => {
          if (!room.shelly_device_id) return room;
          
          try {
            const status = await ShellyService.getDeviceStatus(room.shelly_device_id);
            const relayState = status.success && status.data?.relays?.[0]?.ison === true;
            
            // Extract temperature from device status
            let currentTemp = null;
            if (status.success && status.data?.device_status?.ext_temperature?.['0']?.tC !== undefined) {
              currentTemp = status.data.device_status.ext_temperature['0'].tC;
            }
            
            // Extract humidity from device status
            let humidity = null;
            if (status.success && status.data?.device_status?.ext_humidity?.['0']?.hum !== undefined) {
              humidity = status.data.device_status.ext_humidity['0'].hum;
            }
            
            return {
              ...room,
              current_temp: currentTemp,
              humidity: humidity,
              heating_on: relayState,
              device_online: status.success
            };
          } catch (err) {
            logger.warn(`Failed to get status for room ${room.id}:`, err.message);
            return {
              ...room,
              current_temp: null,
              humidity: null,
              heating_on: false,
              device_online: false
            };
          }
        })
      );

      return res.json({
        success: true,
        rooms: enhancedRooms,
        outdoorTemp,
        weather: weather.success ? weather.data : null
      });
    } catch (error) {
      logger.error('Get all rooms error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms'
      });
    }
  }

  // Get single room
  async getById(req, res) {
    try {
      const { id } = req.params;
      const room = await Room.findById(id);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      return res.json({
        success: true,
        room
      });
    } catch (error) {
      logger.error('Get room error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch room'
      });
    }
  }

  // Update room temperature
  async updateTemperature(req, res) {
    try {
      const { id } = req.params;
      const { targetTemp } = req.body;

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Validate temperature range
      if (targetTemp < room.min_temp || targetTemp > room.max_temp) {
        return res.status(400).json({
          success: false,
          message: `Temperature must be between ${room.min_temp}°C and ${room.max_temp}°C`
        });
      }

      // Check critical safeguards
      if (room.is_critical && room.critical_min_temp && targetTemp < room.critical_min_temp) {
        return res.status(400).json({
          success: false,
          message: `Critical room ${room.name} cannot be set below ${room.critical_min_temp}°C`
        });
      }

      const updated = await Room.updateTemperature(id, room.current_temp, targetTemp);

      // Control Shelly device
      if (room.shelly_device_id) {
        const shouldHeat = room.current_temp < targetTemp;
        await ShellyService.setRelayState(
          room.shelly_device_id,
          0,
          shouldHeat ? 'on' : 'off'
        );
      }

      logger.info(`Room ${room.name} temperature updated to ${targetTemp}°C`);

      return res.json({
        success: true,
        message: 'Temperature updated',
        room: updated
      });
    } catch (error) {
      logger.error('Update temperature error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update temperature'
      });
    }
  }

  // Update room control mode
  async updateControlMode(req, res) {
    try {
      const { id } = req.params;
      const { controlMode } = req.body;

      const validModes = ['thermostat', 'spot-optimized', 'weekly-clock', 'automation', 'manual'];
      if (!validModes.includes(controlMode)) {
        return res.status(400).json({
          success: false,
          message: `Invalid control mode. Must be one of: ${validModes.join(', ')}`
        });
      }

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const updated = await Room.updateControlMode(id, controlMode);

      logger.info(`Room ${room.name} control mode updated to ${controlMode}`);

      return res.json({
        success: true,
        message: 'Control mode updated',
        room: updated
      });
    } catch (error) {
      logger.error('Update control mode error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update control mode'
      });
    }
  }

  // Toggle relay on/off for a room's Shelly device
  async toggleRelay(req, res) {
    try {
      const { id } = req.params;
      const { state } = req.body; // 'on' or 'off'

      if (!['on', 'off'].includes(state)) {
        return res.status(400).json({
          success: false,
          message: 'State must be "on" or "off"'
        });
      }

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      if (!room.shelly_device_id) {
        return res.status(400).json({
          success: false,
          message: 'Room has no Shelly device assigned'
        });
      }

      const result = await ShellyService.setRelayState(room.shelly_device_id, 0, state);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || 'Failed to toggle relay'
        });
      }

      logger.info(`Room ${room.name} relay set to ${state}`);

      return res.json({
        success: true,
        message: `Relay turned ${state}`,
        heating_on: state === 'on'
      });
    } catch (error) {
      logger.error('Toggle relay error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle relay'
      });
    }
  }

  // Update alert threshold for a room
  async updateAlertThreshold(req, res) {
    try {
      const { id } = req.params;
      const { alertThreshold } = req.body;

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const updated = await Room.updateAlertThreshold(id, alertThreshold);

      logger.info(`Room ${room.name} alert threshold updated to ${alertThreshold}`);

      return res.json({
        success: true,
        message: 'Alert threshold updated',
        room: updated
      });
    } catch (error) {
      logger.error('Update alert threshold error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update alert threshold'
      });
    }
  }

  // Get room historical data
  async getHistoricalData(req, res) {
    try {
      const { id } = req.params;
      const { limit = 100, offset = 0, startDate, endDate } = req.query;

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const data = await HistoricalData.findByRoom(id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        startDate,
        endDate
      });

      return res.json({
        success: true,
        room: room.name,
        data,
        count: data.length
      });
    } catch (error) {
      logger.error('Get historical data error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch historical data'
      });
    }
  }

  // Get room energy consumption
  async getEnergyConsumption(req, res) {
    try {
      const { id } = req.params;
      const { period = 'day' } = req.query;

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const data = await HistoricalData.getEnergyConsumption(id, period);

      return res.json({
        success: true,
        room: room.name,
        period,
        data
      });
    } catch (error) {
      logger.error('Get energy consumption error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch energy consumption'
      });
    }
  }

  // Create new room (admin only)
  async create(req, res) {
    try {
      const { name, nameFi, nameSv, nameEn, shellyDeviceId, shellyDeviceType, isCritical, criticalMinTemp } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Room name is required'
        });
      }

      const room = await Room.create({
        name,
        nameFi: nameFi || name,
        nameSv: nameSv || name,
        nameEn: nameEn || name,
        shellyDeviceId,
        shellyDeviceType,
        isCritical: isCritical || false,
        criticalMinTemp
      });

      logger.info(`New room created: ${name}`);

      return res.status(201).json({
        success: true,
        message: 'Room created',
        room
      });
    } catch (error) {
      logger.error('Create room error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create room'
      });
    }
  }

  // Update room (admin only)
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const room = await Room.findById(id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const updated = await Room.update(id, updates);

      logger.info(`Room ${room.name} updated`);

      return res.json({
        success: true,
        message: 'Room updated',
        room: updated
      });
    } catch (error) {
      logger.error('Update room error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update room'
      });
    }
  }
}

export default new RoomController();
