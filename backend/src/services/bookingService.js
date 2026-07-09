import db from '../config/database.js';
import logger from '../utils/logger.js';
import EmailService from './emailService.js';

class BookingService {
  /**
   * Generate a unique 4-digit PIN code
   */
  generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Create a new booking with unique PIN
   */
  async createBooking({ name, email, checkIn, checkOut, rooms }) {
    try {
      const pin = this.generatePIN();

      const result = await db.query(
        `INSERT INTO "Bookings" (guest_name, guest_email, pin, check_in, check_out, rooms, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
         RETURNING *`,
        [name, email, pin, checkIn, checkOut, JSON.stringify(rooms || [])]
      );

      const booking = result.rows[0];
      logger.info(`Booking created for ${name} with PIN ${pin}`);

      return booking;
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Validate a booking PIN - return booking if valid & active
   */
  async validateBookingPIN(pin) {
    try {
      const result = await db.query(
        `SELECT * FROM "Bookings" 
         WHERE pin = $1 
         AND status = 'active'
         AND check_in <= NOW()
         AND check_out >= NOW()`,
        [pin]
      );

      if (result.rows.length === 0) {
        return { valid: false, message: 'Invalid or expired PIN' };
      }

      const booking = result.rows[0];
      return { valid: true, booking };
    } catch (error) {
      logger.error('Error validating booking PIN:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation email via Nodemailer
   */
  async sendBookingEmail(booking) {
    try {
      const emailResult = await EmailService.sendBookingConfirmation(booking);
      return emailResult;
    } catch (error) {
      logger.error('Error sending booking email:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all active bookings
   */
  async getActiveBookings() {
    try {
      const result = await db.query(
        `SELECT * FROM "Bookings" 
         WHERE status = 'active'
         AND check_out >= NOW()
         ORDER BY check_in ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching active bookings:', error);
      throw error;
    }
  }

  /**
   * Get current active booking (for guest access)
   */
  async getCurrentBooking() {
    try {
      const result = await db.query(
        `SELECT * FROM "Bookings" 
         WHERE status = 'active'
         AND check_in <= NOW()
         AND check_out >= NOW()
         ORDER BY check_in DESC
         LIMIT 1`
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error fetching current booking:', error);
      throw error;
    }
  }
}

export default new BookingService();

</parameter>