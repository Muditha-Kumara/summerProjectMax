import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import logger from '../utils/logger.js';

// Admin JWT Authentication
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    logger.error('Authentication error', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// User PIN Authentication (for guests)
export const authenticateUser = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const authHeader = req.headers.authorization;

    // Check for PIN in body or token in header
    if (pin) {
      const booking = await Booking.findByPin(pin);
      
      if (!booking) {
        return res.status(401).json({
          success: false,
          message: 'Invalid PIN'
        });
      }

      // Check if booking is active
      const now = new Date();
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);

      if (now < checkIn || now > checkOut) {
        return res.status(401).json({
          success: false,
          message: 'Booking is not active'
        });
      }

      req.booking = booking;
      req.userType = 'guest';
      next();
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);

      if (decoded.type !== 'user') {
        return res.status(401).json({
          success: false,
          message: 'Invalid user token'
        });
      }

      const booking = await Booking.findById(decoded.bookingId);
      if (!booking) {
        return res.status(401).json({
          success: false,
          message: 'Invalid booking'
        });
      }

      req.booking = booking;
      req.userType = 'guest';
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
  } catch (error) {
    logger.error('User authentication error', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);

      if (decoded.type === 'admin') {
        const user = await User.findById(decoded.userId);
        req.user = user;
        req.userType = 'admin';
      } else if (decoded.type === 'user') {
        const booking = await Booking.findById(decoded.bookingId);
        req.booking = booking;
        req.userType = 'guest';
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
};

export default {
  authenticateAdmin,
  authenticateUser,
  optionalAuth
};
