import OptimizationService from '../services/optimizationService.js';
import NordPoolService from '../services/nordPoolService.js';
import ThermalCapacity from '../models/ThermalCapacity.js';
import logger from '../utils/logger.js';

class OptimizationController {
  // Optimize all rooms
  async optimizeAll(req, res) {
    try {
      const result = await OptimizationService.optimizeAllRooms();

      return res.json({
        success: result.success,
        message: result.success ? 'Optimization completed' : result.message,
        results: result.results
      });
    } catch (error) {
      logger.error('Optimize all error', error);
      return res.status(500).json({
        success: false,
        message: 'Optimization failed'
      });
    }
  }

  // Apply temporary leave
  async temporaryLeave(req, res) {
    try {
      const { roomId } = req.params;
      const { durationHours = 2 } = req.body;

      if (durationHours < 1 || durationHours > 8) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be between 1 and 8 hours'
        });
      }

      const result = await OptimizationService.applyTemporaryLeave(
        parseInt(roomId),
        parseInt(durationHours)
      );

      return res.json({
        success: result.success,
        message: result.success ? 'Temporary leave activated' : result.message,
        data: result
      });
    } catch (error) {
      logger.error('Temporary leave error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to activate temporary leave'
      });
    }
  }

  // Apply quick mode
  async quickMode(req, res) {
    try {
      const { mode } = req.params;

      const validModes = ['home', 'away', 'eco', 'comfort'];
      if (!validModes.includes(mode)) {
        return res.status(400).json({
          success: false,
          message: `Invalid mode. Must be one of: ${validModes.join(', ')}`
        });
      }

      const result = await OptimizationService.applyQuickMode(mode);

      return res.json({
        success: result.success,
        message: result.success ? `Quick mode "${mode}" applied` : result.message,
        data: result
      });
    } catch (error) {
      logger.error('Quick mode error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to apply quick mode'
      });
    }
  }

  // Get spot prices
  async getSpotPrices(req, res) {
    try {
      const { hours = 24 } = req.query;

      const forecast = await NordPoolService.getForecast(parseInt(hours));

      return res.json({
        success: forecast.success,
        prices: forecast.prices
      });
    } catch (error) {
      logger.error('Get spot prices error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch spot prices'
      });
    }
  }

  // Get cheapest hours
  async getCheapestHours(req, res) {
    try {
      const { hours = 24, limit = 6 } = req.query;

      const cheapest = await NordPoolService.getCheapestHours(
        parseInt(hours),
        parseInt(limit)
      );

      return res.json({
        success: cheapest.success,
        prices: cheapest.prices
      });
    } catch (error) {
      logger.error('Get cheapest hours error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch cheapest hours'
      });
    }
  }

  // Get thermal capacities
  async getThermalCapacities(req, res) {
    try {
      const capacities = await ThermalCapacity.findAll();

      return res.json({
        success: true,
        capacities
      });
    } catch (error) {
      logger.error('Get thermal capacities error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch thermal capacities'
      });
    }
  }

  // Calculate thermal capacity for a room
  async calculateThermalCapacity(req, res) {
    try {
      const { roomId } = req.params;

      const result = await ThermalCapacity.calculateFromHistory(parseInt(roomId));

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Insufficient historical data to calculate thermal capacity'
        });
      }

      return res.json({
        success: true,
        message: 'Thermal capacity calculated',
        capacity: result
      });
    } catch (error) {
      logger.error('Calculate thermal capacity error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate thermal capacity'
      });
    }
  }
}

export default new OptimizationController();
