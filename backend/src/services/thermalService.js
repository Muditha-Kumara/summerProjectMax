import db from '../config/database.js';
import logger from '../utils/logger.js';

class ThermalService {
  async calculateThermalCapacity(roomId) {
    try {
      const result = await db.query(
      `SELECT tc.room_id, tc.heating_rate, tc.cooling_rate, tc.thermal_capacity,
              tc.updated_at, r.name as room_name
       FROM "ThermalCapacities" tc
       JOIN "Rooms" r ON r.id = tc.room_id
       WHERE tc.room_id = $1`,
        [roomId]
    );
      return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
      logger.error(`Error fetching thermal capacity for room ${roomId}:`, error);
    throw error;
  }
}

  async getOptimalHeatingWindow(roomId, priceData, weatherForecast) {
    try {
      const thermal = await this.calculateThermalCapacity(roomId);

      if (!thermal) {
        return {
          startTime: null,
          duration: 0,
          targetTemp: 21,
          estimatedCost: 0,
          heatingSegments: [],
          reason: 'No thermal capacity data available'
};
      }

      const currentTemp = room.current_temp || 20;
      const tempDeficit = 21 - currentTemp;

      if (tempDeficit <= 0) {
        return {
          startTime: null,
          duration: 0,
          targetTemp,
          estimatedCost: 0,
          heatingSegments: [],
          reason: 'Already at target temperature'
        };
      }

      const hoursNeeded = Math.ceil(tempDeficit / thermal.heating_rate);

      const hourlyScores = priceData.map((priceHour, index) => {
        const forecastHour = weatherForecast?.forecast?.[index] || {};
        const outdoorTemp = forecastHour.temperature || weatherForecast?.currentTemp || 0;

        const score = priceHour.price * 0.5 + (20 - outdoorTemp) / 40 + thermal.heating_rate / 3;
        return {
          hour: new Date(priceHour.timestamp).getHours(),
          price: priceHour.price,
          outdoorTemp,
          score
        };
      });

      const selectedHours = hourlyScores.sort((a, b) => b.score - a.score)
        .slice(0, Math.min(hoursNeeded, hourlyScores.length));

      const startTime = selectedHours.length > 0 ? selectedHours[0].timestamp : null;
      const duration = selectedHours.length;

      return {
        startTime,
        duration,
        targetTemp,
        estimatedCost: selectedHours.reduce((sum, h) => sum + h.price, 0),
        heatingSegments: selectedHours.map(h => ({
          hour: h.hour,
          price: h.price,
          outdoorTemp
        })),
        thermalData: thermal
      };

    } catch (error) {
      logger.error(`Error calculating optimal heating window for room ${roomId}:`, error);
      throw error;
    }
  }

  async predictTempDrop(roomId, hours, currentTemp = null) {
    try {
      const thermal = await this.calculateThermalCapacity(roomId);

      if (!thermal) {
        return {
          predictions: [],
          finalTemp: null,
          totalDrop: 0,
          initialTemp: currentTemp || 20,
          outdoorTemp: null,
          coolingConstant: null
        };
      }

      const k = thermal.cooling_rate / Math.max(thermal.thermal_capacity, 0.1);

      const predictions = [];
      let temp = currentTemp || 20;

      for (let h = 1; h <= hours; h++) {
        const drop = k * (temp - outdoorTemp);
        temp -= drop;
        predictions.push({ hour: h, predictedTemp: Math.round(temp * 10) / 10 });
      }

      const finalTemp = predictions.length > 0 ? predictions[predictions.length - 1].predictedTemp : null;
      const totalDrop = Math.round((currentTemp || 20) - finalTemp) * 10;

      return {
        predictions,
        finalTemp,
        totalDrop,
        initialTemp: currentTemp,
        outdoorTemp: null,
        coolingConstant: k * 10000
      };

    } catch (error) {
      logger.error(`Error predicting temp drop for room ${roomId}:`, error);
      throw error;
    }
  }

  async getAllThermalCapacities() {
    try {
      const capacities = await db.query(
        `SELECT tc.room_id, tc.heating_rate, tc.cooling_rate, tc.thermal_capacity,
              tc.updated_at
       FROM "ThermalCapacities" tc`
      );
      return capacities.rows;
    } catch (error) {
      logger.error('Error fetching thermal capacities:', error);
      throw error;
    }
  }
}

export default new ThermalService();
