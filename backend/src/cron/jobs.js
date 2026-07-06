import cron from 'node-cron';
import Room from '../models/Room.js';
import HistoricalData from '../models/HistoricalData.js';
import ShellyService from '../services/shellyService.js';
import WeatherService from '../services/weatherService.js';
import NordPoolService from '../services/nordPoolService.js';
import OptimizationService from '../services/optimizationService.js';
import EmailService from '../services/emailService.js';
import logger from '../utils/logger.js';

class CronJobs {
  start() {
    logger.info('Starting cron jobs...');

    // Fetch weather data every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.fetchWeatherData();
    });

    // Fetch spot prices every hour
    cron.schedule('0 * * * *', async () => {
      await this.fetchSpotPrices();
    });

    // Record historical data every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.recordHistoricalData();
    });

    // Run optimization every hour
    cron.schedule('15 * * * *', async () => {
      await this.runOptimization();
    });

    // Check critical safeguards every minute
    cron.schedule('* * * * *', async () => {
      await this.checkCriticalSafeguards();
    });

    // Check booking status every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkBookingStatus();
    });

    logger.info('Cron jobs started');
  }

  async fetchWeatherData() {
    try {
      const weather = await WeatherService.getCurrentWeather();
      if (weather.success) {
        logger.debug('Weather data fetched', weather.data);
      }
    } catch (error) {
      logger.error('Weather fetch cron error', error);
    }
  }

  async fetchSpotPrices() {
    try {
      const result = await NordPoolService.fetchSpotPrices(24);
      if (result.success) {
        logger.debug(`Fetched ${result.prices.length} spot prices`);
      }
    } catch (error) {
      logger.error('Spot price fetch cron error', error);
    }
  }

  async recordHistoricalData() {
    try {
      const rooms = await Room.findAll();
      const weather = await WeatherService.getCurrentWeather();
      const outdoorTemp = weather.success ? weather.data.temperature : null;
      const spotPrice = await NordPoolService.getCurrentPrice();

      for (const room of rooms) {
        let currentTemp = room.current_temp;
        let humidity = room.humidity;
        let relayState = false;
        let energyConsumption = 0;

        // Fetch real data from Shelly if device ID is configured
        if (room.shelly_device_id) {
          const tempData = await ShellyService.getTemperature(room.shelly_device_id);
          if (tempData.success) currentTemp = tempData.temperature;

          const humidityData = await ShellyService.getHumidity(room.shelly_device_id);
          if (humidityData.success) humidity = humidityData.humidity;

          const powerData = await ShellyService.getPowerConsumption(room.shelly_device_id);
          if (powerData.success) energyConsumption = powerData.power;

          const statusData = await ShellyService.getDeviceStatus(room.shelly_device_id);
          if (statusData.success && statusData.data?.device_status?.relays?.[0]) {
            relayState = statusData.data.device_status.relays[0].ison;
          }

          // Update room current temp
          if (currentTemp !== room.current_temp) {
            await Room.updateTemperature(room.id, currentTemp, room.target_temp);
          }
        }

        // Store historical data
        await HistoricalData.create({
          roomId: room.id,
          currentTemp,
          targetTemp: room.target_temp,
          humidity,
          relayState,
          energyConsumption,
          outdoorTemp,
          spotPrice: spotPrice.success ? spotPrice.price : null
        });
      }

      logger.debug('Historical data recorded for all rooms');
    } catch (error) {
      logger.error('Record historical data cron error', error);
    }
  }

  async runOptimization() {
    try {
      const result = await OptimizationService.optimizeAllRooms();
      if (result.success) {
        logger.info('Optimization completed', { rooms: result.results.length });
      }
    } catch (error) {
      logger.error('Optimization cron error', error);
    }
  }

  async checkCriticalSafeguards() {
    try {
      const criticalRooms = await Room.getCriticalRooms();
      const weather = await WeatherService.getCurrentWeather();
      const outdoorTemp = weather.success ? weather.data.temperature : 0;

      for (const room of criticalRooms) {
        // Check pipe freeze protection
        if (room.current_temp < OptimizationService.CRITICAL_MIN_TEMP_UTILITY) {
          logger.warn(`CRITICAL: ${room.name} temperature ${room.current_temp}°C is below minimum!`);
          
          // Force heating on
          if (room.shelly_device_id) {
            await ShellyService.setRelayState(room.shelly_device_id, 0, 'on');
          }

          // Send alert email
          await EmailService.sendTemperatureAlert(
            room,
            room.current_temp,
            OptimizationService.CRITICAL_MIN_TEMP_UTILITY
          );
        }

        // Check drain cable
        if (room.name === 'Ilmalämpöpumppu' && outdoorTemp < OptimizationService.DRAIN_CABLE_TEMP_THRESHOLD) {
          if (room.shelly_device_id) {
            await ShellyService.setRelayState(room.shelly_device_id, 0, 'on');
            logger.debug('Drain cable activated for Ilmalämpöpumppu');
          }
        }
      }
    } catch (error) {
      logger.error('Critical safeguards cron error', error);
    }
  }

  async checkBookingStatus() {
    try {
      const Booking = (await import('../models/Booking.js')).default;
      const activeBookings = await Booking.findActive();

      for (const booking of activeBookings) {
        const now = new Date();
        const checkOut = new Date(booking.check_out);

        // If booking has ended, set to completed
        if (now > checkOut) {
          await Booking.updateStatus(booking.id, 'completed');
          logger.info(`Booking ${booking.id} completed`);

          // Reset to eco mode
          await OptimizationService.applyQuickMode('eco');
        }
      }
    } catch (error) {
      logger.error('Booking status cron error', error);
    }
  }
}

export default new CronJobs();
