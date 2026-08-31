import db from '../config/database.js';

class ElectricityContract {
  static async create({ name, type, fixed_price, spot_margin, tiered_pricing, start_date, end_date, is_active = true }) {
    const result = await db.query(
      `INSERT INTO electricity_contracts 
       (name, type, fixed_price, spot_margin, tiered_pricing, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, type, fixed_price, spot_margin, JSON.stringify(tiered_pricing), start_date, end_date, is_active]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM electricity_contracts WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await db.query(
      'SELECT * FROM electricity_contracts ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findActive() {
    const result = await db.query(
      `SELECT * FROM electricity_contracts 
       WHERE is_active = true 
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY start_date DESC
       LIMIT 1`
    );
    return result.rows[0];
  }

  static async update(id, { name, type, fixed_price, spot_margin, tiered_pricing, start_date, end_date, is_active }) {
    const result = await db.query(
      `UPDATE electricity_contracts 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           fixed_price = COALESCE($3, fixed_price),
           spot_margin = COALESCE($4, spot_margin),
           tiered_pricing = COALESCE($5, tiered_pricing),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, type, fixed_price, spot_margin, JSON.stringify(tiered_pricing), start_date, end_date, is_active, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM electricity_contracts WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async deactivateAll() {
    await db.query('UPDATE electricity_contracts SET is_active = false');
  }
}

export default ElectricityContract;
