import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class AuthController {
  // Admin login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          type: 'admin'
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Update last login
      await User.updateLastLogin(user.id);

      logger.info(`Admin login successful: ${email}`);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Login error', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // User PIN login (for guests)
  async loginWithPin(req, res) {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({
          success: false,
          message: 'PIN is required'
        });
      }

      // Import Booking model
      const Booking = (await import('../models/Booking.js')).default;
      
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

      // Generate user token
      const token = jwt.sign(
        { 
          bookingId: booking.id,
          guestName: booking.guest_name,
          type: 'user'
        },
        config.jwt.secret,
        { expiresIn: config.userPin.expiresIn }
      );

      logger.info(`User login successful with PIN: ${pin}`);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        booking: {
          id: booking.id,
          guestName: booking.guest_name,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          preferredTemp: booking.preferred_temp
        }
      });
    } catch (error) {
      logger.error('PIN login error', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // Register new admin user
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required'
        });
      }

      // Check if user exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        email,
        passwordHash,
        name,
        role: 'admin'
      });

      logger.info(`New admin user registered: ${email}`);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Registration error', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      return res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      logger.error('Get current user error', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }
}

export default new AuthController();
