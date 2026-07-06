import db from '../config/database.js';

class SystemSettings {
  static async get(key) {
    const result = await db.query(
      'SELECT value FROM system_settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value;
  }

  static async set(key, value, description = null) {
    const result = await db.query(
      `INSERT INTO system_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE 
       SET value = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, description]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await db.query(
      'SELECT * FROM system_settings ORDER BY key'
    );
    return result.rows;
  }

  static async delete(key) {
    await db.query('DELETE FROM system_settings WHERE key = $1', [key]);
  }

  static async getApiKeys() {
    const result = await db.query(
      `SELECT key, value FROM system_settings 
       WHERE key LIKE '%_api_key' OR key LIKE '%_auth_key'
       ORDER BY key`
    );
    return result.rows;
  }
}

export default SystemSettings;
