import db from '../config/database.js';

class Alert {
  static async create({ type, severity, message, roomId = null, metadata = {} }) {
    const result = await db.query(
      `INSERT INTO alerts (type, severity, message, room_id, metadata, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [type, severity, message, roomId, JSON.stringify(metadata)]
    );
    return result.rows[0];
  }

  static async findAll({ status = 'active', limit = 50 } = {}) {
    const result = await db.query(
      `SELECT a.*, r.name as room_name
       FROM alerts a
       LEFT JOIN rooms r ON a.room_id = r.id
       WHERE a.status = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [status, limit]
    );
    return result.rows;
  }

  static async findByRoom(roomId, { status = 'active', limit = 20 } = {}) {
    const result = await db.query(
      `SELECT * FROM alerts
       WHERE room_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [roomId, status, limit]
    );
    return result.rows;
  }

  static async resolve(id, resolvedBy = 'system') {
    const result = await db.query(
      `UPDATE alerts
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, resolvedBy]
    );
    return result.rows[0];
  }

  static async resolveByRoom(roomId, type) {
    const result = await db.query(
      `UPDATE alerts
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = 'system'
       WHERE room_id = $1 AND type = $2 AND status = 'active'
       RETURNING *`,
      [roomId, type]
    );
    return result.rows;
  }

  static async getActiveCount() {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM alerts WHERE status = 'active'`
    );
    return parseInt(result.rows[0].count);
  }

  static async getCriticalAlerts() {
    const result = await db.query(
      `SELECT a.*, r.name as room_name
       FROM alerts a
       LEFT JOIN rooms r ON a.room_id = r.id
       WHERE a.status = 'active' AND a.severity = 'critical'
       ORDER BY a.created_at DESC`
    );
    return result.rows;
  }
}

export default Alert;
