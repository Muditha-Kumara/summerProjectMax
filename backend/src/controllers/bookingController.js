import Booking from '../models/Booking.js';
import EmailService from '../services/emailService.js';
import logger from '../utils/logger.js';

class BookingController {
  // Get all bookings
  async getAll(req, res) {
    try {
      const bookings = await Booking.findAll();

      return res.json({
        success: true,
        bookings
      });
    } catch (error) {
      logger.error('Get all bookings error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings'
      });
    }
  }

  // Get active bookings
  async getActive(req, res) {
    try {
      const bookings = await Booking.findActive();

      return res.json({
        success: true,
        bookings
      });
    } catch (error) {
      logger.error('Get active bookings error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch active bookings'
      });
    }
  }

  // Get single booking
  async getById(req, res) {
    try {
      const { id } = req.params;
      const booking = await Booking.findById(id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      return res.json({
        success: true,
        booking
      });
    } catch (error) {
      logger.error('Get booking error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking'
      });
    }
  }

  // Get current user's booking (for guests)
  async getCurrentBooking(req, res) {
    try {
      if (!req.booking) {
        return res.status(401).json({
          success: false,
          message: 'No booking found for current user'
        });
      }

      return res.json({
        success: true,
        booking: {
          id: req.booking.id,
          guestName: req.booking.guest_name,
          checkIn: req.booking.check_in,
          checkOut: req.booking.check_out,
          preferredTemp: req.booking.preferred_temp
        }
      });
    } catch (error) {
      logger.error('Get current booking error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch current booking'
      });
    }
  }

  // Create new booking
  async create(req, res) {
    try {
      const { guestName, guestEmail, checkIn, checkOut, preferredTemp } = req.body;

      // Validate input
      if (!guestName || !guestEmail || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Guest name, email, check-in, and check-out are required'
        });
      }

      // Generate random PIN
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const booking = await Booking.create({
        guestName,
        guestEmail,
        pin,
        checkIn,
        checkOut,
        preferredTemp: preferredTemp || 21.00
      });

      // Send confirmation email
      const emailResult = await EmailService.sendBookingConfirmation(booking);

      logger.info(`New booking created for ${guestName}`);

      return res.status(201).json({
        success: true,
        message: 'Booking created',
        booking,
        emailSent: emailResult.success
      });
    } catch (error) {
      logger.error('Create booking error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }
  }

  // Update booking status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const updated = await Booking.updateStatus(id, status);

      logger.info(`Booking ${id} status updated to ${status}`);

      return res.json({
        success: true,
        message: 'Booking status updated',
        booking: updated
      });
    } catch (error) {
      logger.error('Update booking status error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update booking status'
      });
    }
  }

  // Delete booking
  async delete(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      await Booking.delete(id);

      logger.info(`Booking ${id} deleted`);

      return res.json({
        success: true,
        message: 'Booking deleted'
      });
    } catch (error) {
      logger.error('Delete booking error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete booking'
      });
    }
  }
}

export default new BookingController();
