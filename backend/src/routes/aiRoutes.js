import express from 'express';
import rateLimit from 'express-rate-limit';
import aiController from '../controllers/aiController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Voice chat specific rate limiter - more lenient for smooth voice interaction
const voiceChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: {
    success: false,
    message: 'Too many voice requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guests and admins can both use the AI chat
router.post('/chat', voiceChatLimiter, optionalAuth, aiController.chat);

export default router;
