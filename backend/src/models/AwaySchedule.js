import db from '../config/database.js';
import logger from '../utils/logger.js';

class AwaySchedule {
  /**
   * Create a new away schedule
   */
  static async create({ roomId, startTime, endTime, previousMode, previousTargetTemps }) {
    try {
      const result = await db.query(
        `INSERT INTO away_schedules (room_id, start_time, end_time, previous_mode, previous_target_temps, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING *`,
        [roomId, startTime, endTime, previousMode, JSON.stringify(previousTargetTemps)]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating away schedule', error);
      throw error;
    }
  }

  /**
   * Find all active away schedules
   */
  static async findActive() {
    try {
      const result = await db.query(
        `SELECT * FROM away_schedules 
         WHERE status = 'active' 
         AND end_time <= NOW()
         ORDER BY end_time ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding active away schedules', error);
      throw error;
    }
  }

  /**
   * Find active schedules by room
   */
  static async findByRoom(roomId) {
    try {
      const result = await db.query(
        `SELECT * FROM away_schedules 
         WHERE room_id = $1 AND status = 'active'
         ORDER BY end_time DESC`,
        [roomId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding away schedules by room', error);
      throw error;
    }
  }

  /**
   * Update schedule status
   */
  static async updateStatus(id, status) {
    try {
      const result = await db.query(
        `UPDATE away_schedules 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating away schedule status', error);
      throw error;
    }
  }

  /**
   * Get all active schedules (for monitoring)
   */
  static async getAllActive() {
    try {
      const result = await db.query(
        `SELECT as.*, r.name as room_name 
         FROM away_schedules as 
         JOIN rooms r ON as.room_id = r.id
         WHERE as.status = 'active'
         ORDER BY as.end_time ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error getting all active away schedules', error);
      throw error;
    }
  }
}

export default AwaySchedule;
