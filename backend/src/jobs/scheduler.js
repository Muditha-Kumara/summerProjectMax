import cron from 'node-cron';
import db from '../config/database.js';
import NordPoolService from '../services/nordPoolService.js';
import WeatherService from '../services/weatherService.js';
import OptimizationService from '../services/optimizationService.js';
import ThermalService from '../services/thermalService.js';
import ShellyService from '../services/shellyService.js';
import WinterSafeguards from './winterSafeguards.js';
import logger from '../utils/logger.js';

class Scheduler {
  constructor() {
    this.tasks = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  start() {
    logger.info('📅 Starting scheduler...');

    // Hourly: Fetch NordPool prices, OpenWeather forecast, run optimization
    this.scheduleHourlyTasks();

    // Every 15 minutes: Check winter safeguards, adjust relays if needed
    this.scheduleSafeguardChecks();

    // Daily at midnight: Calculate thermal capacity updates
    this.scheduleDailyTasks();

    logger.info('✅ Scheduler started with all tasks');
  }

  /**
   * Hourly tasks (0 * * * *) - Price fetching & optimization
   */
  scheduleHourlyTasks() {
    const hourlyTask = cron.schedule('0 * * * *', async () => {
      logger.info('⏰ Running hourly optimization cycle...');

      try {
        // Step 1: Fetch NordPool prices
        logger.debug('Fetching NordPool prices...');
        const priceResult = await NordPoolService.fetchSpotPrices(24);
        if (!priceResult.success) {
          logger.warn('Failed to fetch NordPool prices:', priceResult.message);
        }

        // Step 2: Fetch OpenWeather forecast
        logger.debug('Fetching weather forecast...');
        const weatherResult = await WeatherService.getForecast();
        if (!weatherResult.success) {
          logger.warn('Failed to fetch weather forecast:', weatherResult.message);
        }

        // Step 3: Run optimization
        logger.debug('Running optimization...');
        const optimizationResult = await OptimizationService.optimizeAllRooms();
        if (!optimizationResult.success) {
          logger.error('Optimization failed:', optimizationResult.message);
          return;
        }

        // Step 4: Store plan in OptimizationPlans table
        const today = new Date().toISOString().split('T')[0];
        await this.storeOptimizationPlan(today, optimizationResult);

        logger.info('✅ Hourly optimization cycle completed', {
          rooms: optimizationResult.results?.length,
          success: optimizationResult.success,
        });
      } catch (error) {
        logger.error('❌ Hourly task error:', error);
      }
    });

    this.tasks.push(hourlyTask);
    logger.info('📌 Hourly optimization task scheduled (0 * * * *)');
  }

  /**
   * Every 15 minutes (*/15 * * * *) - Winter safeguards & relay adjustments
   */
  scheduleSafeguardChecks() {
    const safeguardTask = cron.schedule('*/15 * * * *', async () => {
      logger.info('🔒 Running 15-minute safeguard check...');

      try {
        // Run all winter safeguard checks
        const safeguardResult = await WinterSafeguards.runAllChecks();
        if (!safeguardResult.success) {
          logger.error('Safeguard check failed:', safeguardResult.message);
          return;
        }

        // Check current temps vs plan & adjust Shelly relays
        await this.adjustRelaysBasedOnPlan();

        logger.info('✅ Safeguard check completed', {
          freezeProtection: safeguardResult.freezeProtection?.action,
          drainCable: safeguardResult.drainCable?.action,
        });
      } catch (error) {
        logger.error('❌ Safeguard check error:', error);
      }
    });

    this.tasks.push(safeguardTask);
    logger.info('📌 Safeguard check task scheduled (*/15 * * * *)');
  }

  /**
   * Daily at midnight (0 0 * * *) - Thermal capacity calculations
   */
  scheduleDailyTasks() {
    const dailyTask = cron.schedule('0 0 * * *', async () => {
      logger.info('🌡️ Running daily thermal capacity update...');

      try {
        // Get all rooms
        const roomsResult = await db.query('SELECT id, name FROM "Rooms" WHERE active = true');
        const rooms = roomsResult.rows;

        // For each room, calculate thermal capacity from historical data
        for (const room of rooms) {
          await this.updateThermalCapacity(room.id, room.name);
        }

        logger.info('✅ Daily thermal capacity update completed', { rooms: rooms.length });
      } catch (error) {
        logger.error('❌ Daily thermal update error:', error);
      }
    });

    this.tasks.push(dailyTask);
    logger.info('📌 Daily thermal update task scheduled (0 0 * * *)');
  }

  /**
   * Store optimization plan to OptimizationPlans table
   */
  async storeOptimizationPlan(date, optimizationResult) {
    try {
      const hourlySchedule = this.convertToHourlySchedule(optimizationResult);

      await db.query(
        `INSERT INTO "OptimizationPlans" (date, "hourlySchedule", status, "createdAt", "updatedAt")
         VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (date) DO UPDATE SET
           "hourlySchedule" = $2,
           status = 'ACTIVE',
           "updatedAt" = NOW()`,
        [date, JSON.stringify(hourlySchedule)]
      );

      logger.debug(`Optimization plan stored for ${date}`);
    } catch (error) {
      logger.error('Error storing optimization plan:', error);
    }
  }

  /**
   * Convert optimization results to hourly schedule format
   */
  convertToHourlySchedule(optimizationResult) {
    const hourlySchedule = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourEntry = {
        hour,
        activeHeating: [],
        idleRooms: [],
      };

      for (const roomResult of optimizationResult.results || []) {
        if (roomResult.safeguard) {
          hourEntry.activeHeating.push({
            roomId: roomResult.roomId,
            roomName: roomResult.roomName,
            targetTemp: roomResult.targetTemp,
            priority: 'SAFEGUARD',
            reason: roomResult.reason,
          });
        } else if (roomResult.heatingSchedule) {
          const isActive = roomResult.heatingSchedule.some(
            s => new Date(s.timestamp).getHours() === hour
          );

          if (isActive) {
            hourEntry.activeHeating.push({
              roomId: roomResult.roomId,
              roomName: roomResult.roomName,
              targetTemp: roomResult.targetTemp,
              priority: 'NORMAL',
            });
          } else {
            hourEntry.idleRooms.push({
              roomId: roomResult.roomId,
              roomName: roomResult.roomName,
            });
          }
        }
      }

      hourlySchedule.push(hourEntry);
    }

    return hourlySchedule;
  }

  /**
   * Check current temps vs optimization plan and adjust Shelly relays
   */
  async adjustRelaysBasedOnPlan() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();

      // Get today's optimization plan
      const planResult = await db.query(
        `SELECT "hourlySchedule" FROM "OptimizationPlans" WHERE date = $1`,
        [today]
      );

      if (planResult.rows.length === 0) {
        logger.warn('No optimization plan found for today');
        return;
      }

      const hourlySchedule = planResult.rows[0].hourlySchedule;
      const currentHourEntry = hourlySchedule[currentHour];

      if (!currentHourEntry) {
        logger.warn('No schedule entry for current hour');
        return;
      }

      // Get all rooms
      const roomsResult = await db.query('SELECT * FROM "Rooms" WHERE active = true');
      const rooms = roomsResult.rows;

      // For each room, check if it should be heating
      for (const room of rooms) {
        const shouldHeat = currentHourEntry.activeHeating?.some(
          h => h.roomId === room.id || h.roomName === room.name
        );

        if (room.shelly_device_id) {
          if (shouldHeat && room.current_temp < room.target_temp) {
            // Turn relay ON
            await ShellyService.setRelayState(room.shelly_device_id, 0, 'on');
            logger.debug(`🔥 Heating ON for ${room.name} (current: ${room.current_temp}°C, target: ${room.target_temp}°C)`);
          } else if (room.current_temp >= room.target_temp) {
            // Turn relay OFF - target reached
            await ShellyService.setRelayState(room.shelly_device_id, 0, 'off');
            logger.debug(`❄️ Heating OFF for ${room.name} - target reached (${room.current_temp}°C >= ${room.target_temp}°C)`);
          }
        }
      }
    } catch (error) {
      logger.error('Error adjusting relays:', error);
    }
  }

  /**
   * Update thermal capacity for a room from historical data
   */
  async updateThermalCapacity(roomId, roomName) {
    try {
      // Fetch last 24 hours of historical data
      const historicalResult = await db.query(
        `SELECT timestamp, indoor_temp, outdoor_temp, relay_state, energy_consumption
         FROM "HistoricalData"
         WHERE room_id = $1
         AND timestamp >= NOW() - INTERVAL '24 hours'
         ORDER BY timestamp ASC`,
        [roomId]
      );

      const historicalData = historicalResult.rows;

      if (historicalData.length < 2) {
        logger.debug(`Insufficient historical data for ${roomName} (${historicalData.length} records)`);
        return;
      }

      // Calculate heating and cooling rates
      let totalHeatingTempRise = 0;
      let totalHeatingMinutes = 0;
      let totalCoolingTempDrop = 0;
      let totalCoolingMinutes = 0;

      for (let i = 1; i < historicalData.length; i++) {
        const prev = historicalData[i - 1];
        const curr = historicalData[i];
        const timeDiffHours = (new Date(curr.timestamp) - new Date(prev.timestamp)) / (1000 * 60 * 60);

        if (timeDiffHours <= 0) continue;

        const tempDiff = curr.indoor_temp - prev.indoor_temp;

        if (prev.relay_state) {
          // Heating phase
          totalHeatingTempRise += Math.max(tempDiff, 0);
          totalHeatingMinutes += timeDiffHours * 60;
        } else {
          // Cooling phase
          totalCoolingTempDrop += Math.abs(Math.min(tempDiff, 0));
          totalCoolingMinutes += timeDiffHours * 60;
        }
      }

      const heatingRate = totalHeatingMinutes > 0 ? (totalHeatingTempRise / (totalHeatingMinutes / 60)) : 0.5;
      const coolingRate = totalCoolingMinutes > 0 ? (totalCoolingTempDrop / (totalCoolingMinutes / 60)) : 0.3;
      const thermalCapacity = heatingRate > 0 ? (heatingRate / (coolingRate || 0.3)) : 0.05;
      const confidence = Math.min(historicalData.length / 24, 1);

      // Store in ThermalCapacities table
      await db.query(
        `INSERT INTO "ThermalCapacities" (room_id, capacity, "coolingRate", "heatingRate", confidence, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (room_id) DO UPDATE SET
           capacity = $2,
           "coolingRate" = $3,
           "heatingRate" = $4,
           confidence = $5,
           "updatedAt" = NOW()`,
        [roomId, thermalCapacity, coolingRate, heatingRate, confidence]
      );

      logger.info(`📊 Thermal capacity updated for ${roomName}: ${thermalCapacity.toFixed(3)} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    } catch (error) {
      logger.error(`Error updating thermal capacity for ${roomName}:`, error);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    logger.info('⏹️ Stopping scheduler...');
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    logger.info('✅ Scheduler stopped');
  }
}

export default new Scheduler();

</parameter>