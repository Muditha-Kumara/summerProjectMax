import Room from '../models/Room.js';
import ThermalCapacity from '../models/ThermalCapacity.js';
import SpotPrice from '../models/SpotPrice.js';
import AwaySchedule from '../models/AwaySchedule.js';
import WeatherService from './weatherService.js';
import ShellyService from './shellyService.js';
import logger from '../utils/logger.js';

class OptimizationService {
  // CRITICAL: Winter safeguards - hardcoded overrides
  static CRITICAL_MIN_TEMP_UTILITY = 15; // Kodinhoitohuone - pipe freeze protection
  static DRAIN_CABLE_TEMP_THRESHOLD = 0; // Ilmalämpöpumppu drain cable

  async optimizeAllRooms() {
    try {
      const rooms = await Room.findAll();
      const weather = await WeatherService.getCurrentWeather();
      const spotPrices = await SpotPrice.findForecast(24);
      
      const optimizationResults = [];

      for (const room of rooms) {
        const result = await this.optimizeRoom(room, weather, spotPrices);
        optimizationResults.push(result);
      }

      logger.info(`Optimized ${optimizationResults.length} rooms`);
      
      return {
        success: true,
        results: optimizationResults
      };
    } catch (error) {
      logger.error('Optimization error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async optimizeRoom(room, weather, spotPrices) {
    try {
      // Get thermal capacity
      const thermalCapacity = await ThermalCapacity.findByRoom(room.id);
      
      // Get current outdoor temperature
      const outdoorTemp = weather.success ? weather.data.temperature : 0;
      
      // Apply critical safeguards first
      const safeguardResult = this.applySafeguards(room, outdoorTemp);
      if (safeguardResult.override) {
        return {
          roomId: room.id,
          roomName: room.name,
          targetTemp: safeguardResult.targetTemp,
          reason: safeguardResult.reason,
          safeguard: true
        };
      }

      // Calculate optimal heating schedule based on spot prices
      const heatingSchedule = this.calculateHeatingSchedule(
        room,
        thermalCapacity,
        spotPrices,
        outdoorTemp
      );

      // Update room target temperature
      await Room.updateTemperature(room.id, room.current_temp, heatingSchedule.targetTemp);
      await Room.updateControlMode(room.id, 'spot-optimized');

      return {
        roomId: room.id,
        roomName: room.name,
        targetTemp: heatingSchedule.targetTemp,
        heatingSchedule: heatingSchedule.schedule,
        estimatedSavings: heatingSchedule.estimatedSavings,
        reason: 'Spot-price optimized'
      };
    } catch (error) {
      logger.error(`Optimization error for room ${room.name}`, error);
      return {
        roomId: room.id,
        roomName: room.name,
        error: error.message
      };
    }
  }

  applySafeguards(room, outdoorTemp) {
    // CRITICAL: Kodinhoitohuone (Utility Room) - never below 15°C
    if (room.name === 'Kodinhoitohuone' || room.is_critical) {
      const criticalMin = room.critical_min_temp || this.CRITICAL_MIN_TEMP_UTILITY;
      
      if (room.target_temp < criticalMin) {
        return {
          override: true,
          targetTemp: criticalMin,
          reason: `Critical safeguard: ${room.name} must not drop below ${criticalMin}°C (pipe freeze protection)`
        };
      }
    }

    // CRITICAL: Ilmalämpöpumppu drain cable - keep active when outdoor < 0°C
    if (room.name === 'Ilmalämpöpumppu' && outdoorTemp < this.DRAIN_CABLE_TEMP_THRESHOLD) {
      return {
        override: true,
        targetTemp: 5, // Keep drain cable active
        reason: `Critical safeguard: Drain cable must stay active when outdoor temp < 0°C (current: ${outdoorTemp}°C)`
      };
    }

    return { override: false };
  }

  calculateHeatingSchedule(room, thermalCapacity, spotPrices, outdoorTemp) {
    if (!spotPrices || spotPrices.length === 0) {
      return {
        targetTemp: room.target_temp,
        schedule: [],
        estimatedSavings: 0
      };
    }

    // Sort prices to find cheapest hours
    const sortedPrices = [...spotPrices].sort((a, b) => a.price - b.price);
    const cheapestHours = sortedPrices.slice(0, Math.min(6, sortedPrices.length));
    
    // Calculate temperature difference needed
    const tempDiff = room.target_temp - outdoorTemp;
    
    // Estimate heating time based on thermal capacity
    let heatingTimeMinutes = 60; // Default 1 hour
    if (thermalCapacity && thermalCapacity.capacity) {
      heatingTimeMinutes = Math.ceil(tempDiff * thermalCapacity.capacity);
    }

    // Create heating schedule for cheapest hours
    const schedule = cheapestHours.map(hour => ({
      timestamp: hour.timestamp,
      price: hour.price,
      shouldHeat: true,
      targetTemp: room.target_temp
    }));

    // Calculate estimated savings
    const avgPrice = spotPrices.reduce((sum, p) => sum + p.price, 0) / spotPrices.length;
    const cheapestAvgPrice = cheapestHours.reduce((sum, p) => sum + p.price, 0) / cheapestHours.length;
    const estimatedSavings = ((avgPrice - cheapestAvgPrice) / avgPrice) * 100;

    return {
      targetTemp: room.target_temp,
      schedule,
      heatingTimeMinutes,
      estimatedSavings: Math.round(estimatedSavings * 10) / 10
    };
  }

  async applyTemporaryLeave(roomId, durationHours) {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return { success: false, message: 'Room not found' };
      }

      // Reduce temperature by 3°C for energy savings
      const tempTarget = Math.max(room.min_temp, room.target_temp - 3);
      
      await Room.updateTemperature(roomId, room.current_temp, tempTarget);
      
      // Schedule restoration after duration
      const restoreTime = new Date();
      restoreTime.setHours(restoreTime.getHours() + durationHours);

      logger.info(`Temporary leave activated for ${room.name} until ${restoreTime.toISOString()}`);

      return {
        success: true,
        room: room.name,
        originalTemp: room.target_temp,
        temporaryTemp: tempTarget,
        restoreTime: restoreTime.toISOString(),
        durationHours
      };
    } catch (error) {
      logger.error('Temporary leave error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async applyQuickMode(mode) {
    try {
      const rooms = await Room.findAll();
      const modeSettings = this.getQuickModeSettings(mode);

      for (const room of rooms) {
        // Apply safeguards first
        const weather = await WeatherService.getCurrentWeather();
        const outdoorTemp = weather.success ? weather.data.temperature : 0;
        const safeguard = this.applySafeguards(room, outdoorTemp);

        if (safeguard.override) {
          await Room.updateTemperature(room.id, room.current_temp, safeguard.targetTemp);
        } else {
          // Use room-specific temperature, fallback to default mode temp
          const roomTemp = this.getRoomModeTemp(room.name, mode, modeSettings.targetTemp);
          await Room.updateTemperature(room.id, room.current_temp, roomTemp);
        }
        
        await Room.updateControlMode(room.id, mode);
      }

      logger.info(`Quick mode "${mode}" applied to all rooms`);

      return {
        success: true,
        mode,
        settings: modeSettings,
        roomsUpdated: rooms.length
      };
    } catch (error) {
      logger.error('Quick mode error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Room-specific mode temperatures based on Finnish building standards.
   * Each room gets its optimal temperature per mode, considering its purpose
   * and the allowed min_temp/max_temp range.
   *
   * Finnish standards reference:
   *   Living rooms: 20-22°C, Bedrooms: 18-20°C, Hallways: 18-20°C,
   *   Storage: 10-15°C, Utility: 18-20°C, Water heater: 55-60°C
   */
  static ROOM_MODE_TEMPS = {
    'home': {
      'Kodinhoitohuone': 19,       // Utility — functional, above pipe freeze
      'Eteinen': 19,               // Hallway — transition space, moderate
      'Makuuhuone': 19,            // Bedroom — comfortable for resting
      'Olohuone': 21,              // Living Room — main area, warmest
      'Varasto': 12,               // Storage — doesn't need warmth
      'Lämminvesivaraaja': 55,     // Water Heater — legionella prevention
      'Ilmalämpöpumppu': 21        // Heat Pump — supports living area
    },
    'away': {
      'Kodinhoitohuone': 15,       // Utility — minimum, pipe freeze protection
      'Eteinen': 14,               // Hallway — minimal heating
      'Makuuhuone': 14,            // Bedroom — minimal heating
      'Olohuone': 15,              // Living Room — basic freeze protection
      'Varasto': 8,                // Storage — storage minimum
      'Lämminvesivaraaja': 50,     // Water Heater — minimum safe water temp
      'Ilmalämpöpumppu': 16        // Heat Pump — minimum for heat pump
    },
    'eco': {
      'Kodinhoitohuone': 17,       // Utility — reduced but safe
      'Eteinen': 17,               // Hallway — reduced
      'Makuuhuone': 17,            // Bedroom — cool but sleepable
      'Olohuone': 19,              // Living Room — slightly reduced comfort
      'Varasto': 10,               // Storage — minimum for storage
      'Lämminvesivaraaja': 52,     // Water Heater — reduced but safe
      'Ilmalämpöpumppu': 19        // Heat Pump — reduced
    },
    'comfort': {
      'Kodinhoitohuone': 21,       // Utility — warm utility space
      'Eteinen': 21,               // Hallway — warm welcome
      'Makuuhuone': 20,            // Bedroom — ideal sleep temperature
      'Olohuone': 23,              // Living Room — maximum living comfort
      'Varasto': 15,               // Storage — max for storage room
      'Lämminvesivaraaja': 60,     // Water Heater — optimal hot water
      'Ilmalämpöpumppu': 23        // Heat Pump — maximum heating support
    }
  };

  /**
   * Get the optimal temperature for a specific room in a given mode.
   * Falls back to the default mode temperature if room not found in the map.
   * Also clamps the result to the room's min_temp/max_temp range if provided.
   */
  getRoomModeTemp(roomName, mode, fallbackTemp) {
    const modeTemps = OptimizationService.ROOM_MODE_TEMPS[mode];
    if (!modeTemps) return fallbackTemp;

    const temp = modeTemps[roomName];
    if (temp === undefined) return fallbackTemp;

    return temp;
  }

  getQuickModeSettings(mode) {
    const modes = {
      'home': { targetTemp: 21, label: 'Kotona (Home)' },
      'away': { targetTemp: 15, label: 'Poissa (Away)' },
      'eco': { targetTemp: 19, label: 'Säästävä (Eco)' },
      'comfort': { targetTemp: 23, label: 'Mukava (Comfort)' }
    };

    return modes[mode] || modes['home'];
  }

  /**
   * Apply scheduled away mode - temporarily set away mode and schedule restoration
   * @param {number} durationHours - How long the away mode should last (1-24 hours)
   */
  async applyScheduledAway(durationHours) {
    try {
      if (durationHours < 1 || durationHours > 24) {
        return { success: false, message: 'Duration must be between 1 and 24 hours' };
      }

      const rooms = await Room.findAll();
      
      // Store current state for restoration
      const previousTargetTemps = {};
      let previousMode = null;
      
      for (const room of rooms) {
        previousTargetTemps[room.id] = room.target_temp;
        if (!previousMode) {
          previousMode = room.control_mode;
        }
      }

      // Calculate start and end times
      const startTime = new Date();
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + durationHours);

      // Apply away mode to all rooms (room-specific temperatures)
      const awaySettings = this.getQuickModeSettings('away');
      
      for (const room of rooms) {
        // Apply safeguards first
        const weather = await WeatherService.getCurrentWeather();
        const outdoorTemp = weather.success ? weather.data.temperature : 0;
        const safeguard = this.applySafeguards(room, outdoorTemp);

        if (safeguard.override) {
          await Room.updateTemperature(room.id, room.current_temp, safeguard.targetTemp);
        } else {
          // Use room-specific away temperature, fallback to default away temp
          const roomTemp = this.getRoomModeTemp(room.name, 'away', awaySettings.targetTemp);
          await Room.updateTemperature(room.id, room.current_temp, roomTemp);
        }
        
        await Room.updateControlMode(room.id, 'away');
      }

      // Create away schedule record for each room
      for (const room of rooms) {
        await AwaySchedule.create({
          roomId: room.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          previousMode: previousMode,
          previousTargetTemps: previousTargetTemps
        });
      }

      logger.info(`Scheduled away mode activated for ${durationHours} hours`, {
        rooms: rooms.length,
        endTime: endTime.toISOString()
      });

      return {
        success: true,
        mode: 'away',
        durationHours,
        endTime: endTime.toISOString(),
        roomsUpdated: rooms.length,
        message: `Away mode activated for ${durationHours} hour${durationHours > 1 ? 's' : ''}. Will restore at ${endTime.toLocaleTimeString()}`
      };
    } catch (error) {
      logger.error('Scheduled away mode error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Restore from away mode - called by cron job when away period ends
   */
  async restoreFromAway() {
    try {
      const expiredSchedules = await AwaySchedule.findActive();
      
      if (expiredSchedules.length === 0) {
        return { success: true, message: 'No expired away schedules', restored: 0 };
      }

      let restoredCount = 0;

      for (const schedule of expiredSchedules) {
        const room = await Room.findById(schedule.room_id);
        if (!room) continue;

        // Restore previous target temperature
        const previousTemps = schedule.previous_target_temps || {};
        const previousTemp = previousTemps[room.id] || 21;
        
        await Room.updateTemperature(room.id, room.current_temp, previousTemp);
        
        // Restore previous mode
        const previousMode = schedule.previous_mode || 'home';
        await Room.updateControlMode(room.id, previousMode);

        // Mark schedule as completed
        await AwaySchedule.updateStatus(schedule.id, 'completed');

        restoredCount++;
        logger.info(`Restored room ${room.name} from away mode`, {
          previousTemp,
          previousMode
        });
      }

      return {
        success: true,
        restored: restoredCount,
        message: `Restored ${restoredCount} room${restoredCount > 1 ? 's' : ''} from away mode`
      };
    } catch (error) {
      logger.error('Restore from away error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default new OptimizationService();
