import db from '../config/database.js';

class Room {
  static async create({ name, nameFi, nameSv, nameEn, shellyDeviceId, shellyDeviceType, isCritical = false, criticalMinTemp = null }) {
    const result = await db.query(
      `INSERT INTO rooms (name, name_fi, name_sv, name_en, shelly_device_id, shelly_device_type, is_critical, critical_min_temp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, nameFi, nameSv, nameEn, shellyDeviceId, shellyDeviceType, isCritical, criticalMinTemp]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await db.query(
      'SELECT * FROM rooms ORDER BY id'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM rooms WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    values.push(id);
    const result = await db.query(
      `UPDATE rooms SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async updateTemperature(id, currentTemp, targetTemp) {
    const result = await db.query(
      `UPDATE rooms 
       SET current_temp = $1, target_temp = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [currentTemp, targetTemp, id]
    );
    return result.rows[0];
  }

  static async updateControlMode(id, controlMode) {
    const result = await db.query(
      `UPDATE rooms 
       SET control_mode = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [controlMode, id]
    );
    return result.rows[0];
  }

  static async getCriticalRooms() {
    const result = await db.query(
      'SELECT * FROM rooms WHERE is_critical = TRUE'
    );
    return result.rows;
  }
}

export default Room;
