import Room from '../models/Room.js';
import ThermalCapacity from '../models/ThermalCapacity.js';
import SpotPrice from '../models/SpotPrice.js';
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
          await Room.updateTemperature(room.id, room.current_temp, modeSettings.targetTemp);
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

  getQuickModeSettings(mode) {
    const modes = {
      'home': { targetTemp: 21, label: 'Kotona (Home)' },
      'away': { targetTemp: 16, label: 'Poissa (Away)' },
      'eco': { targetTemp: 18, label: 'Säästävä (Eco)' },
      'comfort': { targetTemp: 23, label: 'Mukava (Comfort)' }
    };

    return modes[mode] || modes['home'];
  }
}

export default new OptimizationService();
