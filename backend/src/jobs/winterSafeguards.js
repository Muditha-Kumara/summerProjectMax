import db from '../config/database.js';
import ShellyService from '../services/shellyService.js';
import WeatherService from '../services/weatherService.js';
import EmailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// HARDCODED CONSTANTS - CANNOT BE DISABLED
const WINTER_SAFEGUARDS = {
  KODINHOITOHUONE_MIN_TEMP: 15, // Pipe freeze protection
  HEAT_PUMP_DRAIN_THRESHOLD: 0, // °C outdoor - drain cable activation
  KODINHOITOHUONE_NAME: 'Kodinhoitohuone',
  ILMAHAPUMPPU_NAME: 'Ilmalämpöpumppu',
};

class WinterSafeguards {
  /**
   * Check freeze protection for Kodinhoitohuone - FORCE heating if < 15°C
   */
  async checkFreezeProtection() {
    try {
      // Get Kodinhoitohuone room
      const roomResult = await db.query(
        `SELECT * FROM "Rooms" WHERE name = $1 OR name LIKE '%Utility%'`,
        [WINTER_SAFEGUARDS.KODINHOITOHUONE_NAME]
      );

      if (roomResult.rows.length === 0) {
        logger.warn('Kodinhoitohuone not found in database');
        return { success: false, message: 'Room not found' };
      }

      const room = roomResult.rows[0];
      const currentTemp = room.current_temp || 20;

      // CRITICAL: If temperature below 15°C, force heating ON
      if (currentTemp < WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP) {
        logger.warn(`🚨 CRITICAL: ${room.name} at ${currentTemp}°C - below ${WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP}°C threshold!`);

        // Force Shelly relay ON
        if (room.shelly_device_id) {
          await ShellyService.setRelayState(room.shelly_device_id, 0, 'on');
          logger.info(`✅ Forced heating ON for ${room.name}`);
        }

        // Update room status
        await db.query(
          `UPDATE "Rooms" SET safeguard_active = true, updated_at = NOW() WHERE id = $1`,
          [room.id]
        );

        // Send alert email to admin
        await EmailService.sendTemperatureAlert(
          room,
          currentTemp,
          WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP
        );

        return {
          success: true,
          action: 'FORCED_HEATING',
          room: room.name,
          currentTemp,
          threshold: WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP,
        };
      }

      // Temperature OK - deactivate safeguard if it was active
      if (room.safeguard_active) {
        await db.query(
          `UPDATE "Rooms" SET safeguard_active = false, updated_at = NOW() WHERE id = $1`,
          [room.id]
        );
        logger.info(`✅ Safeguard deactivated for ${room.name} - temperature recovered to ${currentTemp}°C`);
      }

      return {
        success: true,
        action: 'NO_ACTION',
        room: room.name,
        currentTemp,
        threshold: WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP,
      };
    } catch (error) {
      logger.error('Error in checkFreezeProtection:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check heat pump drain cable - activate if outdoor < 0°C
   */
  async checkHeatPumpDrain() {
    try {
      // Get current outdoor temperature
      const weather = await WeatherService.getCurrentWeather();
      const outdoorTemp = weather.success ? weather.data.temperature : 0;

      // Get Ilmalämpöpumppu room
      const roomResult = await db.query(
        `SELECT * FROM "Rooms" WHERE name = $1 OR name LIKE '%Heat Pump%'`,
        [WINTER_SAFEGUARDS.ILMAHAPUMPPU_NAME]
      );

      if (roomResult.rows.length === 0) {
        logger.warn('Ilmalämpöpumppu not found in database');
        return { success: false, message: 'Room not found' };
      }

      const room = roomResult.rows[0];

      // CRITICAL: If outdoor temp < 0°C, activate drain cable
      if (outdoorTemp < WINTER_SAFEGUARDS.HEAT_PUMP_DRAIN_THRESHOLD) {
        logger.info(`❄️ Outdoor temp ${outdoorTemp}°C - activating drain cable for ${room.name}`);

        // Force Shelly relay ON for drain cable
        if (room.shelly_device_id) {
          await ShellyService.setRelayState(room.shelly_device_id, 0, 'on');
          logger.info(`✅ Drain cable activated for ${room.name}`);
        }

        return {
          success: true,
          action: 'DRAIN_CABLE_ON',
          room: room.name,
          outdoorTemp,
          threshold: WINTER_SAFEGUARDS.HEAT_PUMP_DRAIN_THRESHOLD,
        };
      }

      // Outdoor temp above threshold - deactivate if was active
      logger.debug(`Outdoor temp ${outdoorTemp}°C - drain cable not needed`);

      return {
        success: true,
        action: 'NO_ACTION',
        room: room.name,
        outdoorTemp,
        threshold: WINTER_SAFEGUARDS.HEAT_PUMP_DRAIN_THRESHOLD,
      };
    } catch (error) {
      logger.error('Error in checkHeatPumpDrain:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Override optimization plan with emergency safeguards
   * Returns modified plan with forced heating where needed
   */
  async overrideSafety(plan) {
    try {
      const emergencyOverrides = [];

      // Check each room in the plan
      for (const hourEntry of plan.hourlySchedule || []) {
        // Override 1: Kodinhoitohuone must ALWAYS heat if below threshold
        const kodinhoitohuoneEntry = hourEntry.activeHeating?.find(
          r => r.roomName === WINTER_SAFEGUARDS.KODINHOITOHUONE_NAME
        );

        const roomResult = await db.query(
          `SELECT current_temp FROM "Rooms" WHERE name = $1`,
          [WINTER_SAFEGUARDS.KODINHOITOHUONE_NAME]
        );

        const currentTemp = roomResult.rows[0]?.current_temp || 20;

        if (currentTemp < WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP && !kodinhoitohuoneEntry) {
          // Force heating regardless of price/optimization
          hourEntry.activeHeating = hourEntry.activeHeating || [];
          hourEntry.activeHeating.push({
            roomName: WINTER_SAFEGUARDS.KODINHOITOHUONE_NAME,
            targetTemp: WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP,
            priority: 'EMERGENCY',
            reason: 'PIPE_FREEZE_PROTECTION',
          });

          emergencyOverrides.push({
            hour: hourEntry.hour,
            room: WINTER_SAFEGUARDS.KODINHOITOHUONE_NAME,
            action: 'EMERGENCY_HEATING',
            reason: `Temperature ${currentTemp}°C below ${WINTER_SAFEGUARDS.KODINHOITOHUONE_MIN_TEMP}°C`,
          });
        }

        // Override 2: Heat pump drain cable if outdoor < 0°C
        const weather = await WeatherService.getCurrentWeather();
        const outdoorTemp = weather.success ? weather.data.temperature : 0;

        if (outdoorTemp < WINTER_SAFEGUARDS.HEAT_PUMP_DRAIN_THRESHOLD) {
          hourEntry.heatPumpDrainActive = true;
          hourEntry.safeguardNote = 'Heat pump drain cable active (outdoor < 0°C)';
        }
      }

      return {
        ...plan,
        emergencyOverrides,
        safeguardsApplied: true,
        overrideCount: emergencyOverrides.length,
      };
    } catch (error) {
      logger.error('Error in overrideSafety:', error);
      return { ...plan, error: error.message };
    }
  }

  /**
   * Run all safeguard checks (called by cron every 15 minutes)
   */
  async runAllChecks() {
    try {
      logger.info('🔒 Running winter safeguard checks...');

      const freezeCheck = await this.checkFreezeProtection();
      const drainCheck = await this.checkHeatPumpDrain();

      return {
        success: true,
        freezeProtection: freezeCheck,
        drainCable: drainCheck,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error in runAllChecks:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new WinterSafeguards();

</parameter>