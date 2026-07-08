import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Phase 2 spec routes
router.post('/admin/login', authController.login);
router.post('/user/login', authController.loginWithPin);

// Legacy routes (kept for backward compatibility)
router.post('/login', authController.login);
router.post('/login/pin', authController.loginWithPin);
router.post('/register', authController.register);

// Protected routes (admin only)
router.get('/me', authenticateAdmin, authController.getCurrentUser);

export default router;
