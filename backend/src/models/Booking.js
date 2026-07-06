import db from '../config/database.js';

class Booking {
  static async create({ guestName, guestEmail, pin, checkIn, checkOut, preferredTemp = 21.00 }) {
    const result = await db.query(
      `INSERT INTO bookings (guest_name, guest_email, pin, check_in, check_out, preferred_temp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [guestName, guestEmail, pin, checkIn, checkOut, preferredTemp]
    );
    return result.rows[0];
  }

  static async findByPin(pin) {
    const result = await db.query(
      'SELECT * FROM bookings WHERE pin = $1',
      [pin]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await db.query(
      'SELECT * FROM bookings ORDER BY check_in DESC'
    );
    return result.rows;
  }

  static async findActive() {
    const result = await db.query(
      `SELECT * FROM bookings 
       WHERE status = 'active' 
       AND check_in <= CURRENT_TIMESTAMP 
       AND check_out >= CURRENT_TIMESTAMP
       ORDER BY check_in DESC`
    );
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE bookings 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM bookings WHERE id = $1', [id]);
  }
}

export default Booking;
