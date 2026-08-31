import Alert from '../models/Alert.js';
import Room from '../models/Room.js';
import EmailService from './emailService.js';
import logger from '../utils/logger.js';

class AlertService {
  /**
   * Check for freeze risk and create alerts
   */
  async checkFreezeRisk() {
    try {
      const rooms = await Room.findAll();
      
      for (const room of rooms) {
        if (!room.current_temp) continue;

        const currentTemp = parseFloat(room.current_temp);
        const criticalMin = room.critical_min_temp ? parseFloat(room.critical_min_temp) : 5;

        // Critical freeze alert
        if (currentTemp <= criticalMin) {
          await this.createAlert({
            type: 'freeze_risk',
            severity: 'critical',
            message: `CRITICAL: ${room.name} temperature is ${currentTemp}°C (below ${criticalMin}°C)`,
            roomId: room.id,
            metadata: { currentTemp, criticalMin }
          });

          // Send email notification
          await this.sendAlertEmail({
            type: 'freeze_risk',
            severity: 'critical',
            room: room.name,
            message: `Temperature is ${currentTemp}°C, which is below the critical minimum of ${criticalMin}°C. Immediate action required!`
          });
        }
        // Warning alert
        else if (currentTemp <= criticalMin + 2) {
          await this.createAlert({
            type: 'low_temperature',
            severity: 'warning',
            message: `WARNING: ${room.name} temperature is low (${currentTemp}°C)`,
            roomId: room.id,
            metadata: { currentTemp, criticalMin }
          });
        }
      }
    } catch (error) {
      logger.error('Error checking freeze risk:', error);
    }
  }

  /**
   * Check for high temperature alerts
   */
  async checkHighTemperature() {
    try {
      const rooms = await Room.findAll();
      
      for (const room of rooms) {
        if (!room.current_temp) continue;

        const currentTemp = parseFloat(room.current_temp);
        const maxTemp = room.max_temp ? parseFloat(room.max_temp) : 30;

        if (currentTemp >= maxTemp) {
          await this.createAlert({
            type: 'high_temperature',
            severity: 'warning',
            message: `${room.name} temperature is high (${currentTemp}°C)`,
            roomId: room.id,
            metadata: { currentTemp, maxTemp }
          });
        }
      }
    } catch (error) {
      logger.error('Error checking high temperature:', error);
    }
  }

  /**
   * Check for device offline alerts
   */
  async checkDeviceStatus() {
    try {
      const rooms = await Room.findAll();
      
      for (const room of rooms) {
        if (!room.shelly_device_id) continue;

        // Check if device is responding (this would be implemented with actual device checks)
        // For now, we'll skip this as it requires integration with the Shelly service
      }
    } catch (error) {
      logger.error('Error checking device status:', error);
    }
  }

  /**
   * Create an alert (avoid duplicates)
   */
  async createAlert({ type, severity, message, roomId, metadata }) {
    try {
      // Check if there's already an active alert of this type for this room
      const existingAlerts = await Alert.findByRoom(roomId, { status: 'active', limit: 100 });
      const existingAlert = existingAlerts.find(a => a.type === type);

      if (existingAlert) {
        // Update existing alert instead of creating duplicate
        logger.debug(`Alert already exists for room ${roomId}, type ${type}`);
        return existingAlert;
      }

      const alert = await Alert.create({
        type,
        severity,
        message,
        roomId,
        metadata
      });

      logger.info(`Alert created: ${type} - ${message}`);
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Resolve alerts for a room when temperature is back to normal
   */
  async resolveRoomAlerts(roomId) {
    try {
      const resolved = await Alert.resolveByRoom(roomId, 'freeze_risk');
      resolved.push(...await Alert.resolveByRoom(roomId, 'low_temperature'));
      resolved.push(...await Alert.resolveByRoom(roomId, 'high_temperature'));
      
      if (resolved.length > 0) {
        logger.info(`Resolved ${resolved.length} alerts for room ${roomId}`);
      }
      
      return resolved;
    } catch (error) {
      logger.error('Error resolving alerts:', error);
    }
  }

  /**
   * Send alert email notification
   */
  async sendAlertEmail({ type, severity, room, message }) {
    try {
      const subject = `[${severity.toUpperCase()}] Smart Heating Alert - ${room}`;
      const html = `
        <h2>Smart Heating Alert</h2>
        <p><strong>Room:</strong> ${room}</p>
        <p><strong>Severity:</strong> ${severity}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Message:</strong> ${message}</p>
        <hr>
        <p><small>This is an automated alert from your Smart Heating system.</small></p>
      `;

      await EmailService.sendAlert(subject, html);
      logger.info(`Alert email sent: ${subject}`);
    } catch (error) {
      logger.error('Error sending alert email:', error);
    }
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts() {
    try {
      return await Alert.findAll({ status: 'active' });
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts() {
    try {
      return await Alert.getCriticalAlerts();
    } catch (error) {
      logger.error('Error getting critical alerts:', error);
      return [];
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy = 'admin') {
    try {
      return await Alert.resolve(alertId, resolvedBy);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    try {
      const activeCount = await Alert.getActiveCount();
      const criticalAlerts = await Alert.getCriticalAlerts();
      
      return {
        active: activeCount,
        critical: criticalAlerts.length
      };
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      return { active: 0, critical: 0 };
    }
  }
}

export default new AlertService();
