import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/login/pin', authController.loginWithPin);
router.post('/register', authController.register);

// Protected routes (admin only)
router.get('/me', authenticateAdmin, authController.getCurrentUser);

export default router;
