import express from 'express';
import aiController from '../controllers/aiController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Guests and admins can both use the AI chat
router.post('/chat', optionalAuth, aiController.chat);

export default router;
