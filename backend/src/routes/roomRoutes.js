import express from 'express';
import roomController from '../controllers/roomController.js';
import { authenticateAdmin, authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public/Guest routes (with optional auth)
router.get('/', optionalAuth, roomController.getAll);
router.get('/:id', optionalAuth, roomController.getById);
router.get('/:id/history', optionalAuth, roomController.getHistoricalData);
router.get('/:id/energy', optionalAuth, roomController.getEnergyConsumption);

// Protected routes (admin only)
router.post('/', authenticateAdmin, roomController.create);
router.put('/:id', authenticateAdmin, roomController.update);
router.put('/:id/temperature', optionalAuth, roomController.updateTemperature);
router.put('/:id/control-mode', authenticateAdmin, roomController.updateControlMode);

export default router;
