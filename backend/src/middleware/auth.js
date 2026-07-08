import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import logger from '../utils/logger.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

// Admin JWT Authentication
export const verifyAdminToken = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type && decoded.type !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token'
      });
    }

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

export const authenticateAdmin = verifyAdminToken;

// User PIN Authentication (for guests)
export const verifyUserPIN = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const token = extractBearerToken(req);

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
    } else if (token) {
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

export const authenticateUser = verifyUserPIN;

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (token) {
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
  verifyAdminToken,
  verifyUserPIN,
  authenticateAdmin,
  authenticateUser,
  optionalAuth
};
