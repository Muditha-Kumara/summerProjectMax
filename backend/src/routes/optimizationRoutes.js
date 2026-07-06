import express from 'express';
import optimizationController from '../controllers/optimizationController.js';
import { authenticateAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public/Guest routes
router.get('/spot-prices', optionalAuth, optimizationController.getSpotPrices);
router.get('/cheapest-hours', optionalAuth, optimizationController.getCheapestHours);

// Protected routes (admin only)
router.post('/optimize-all', authenticateAdmin, optimizationController.optimizeAll);
router.post('/temporary-leave/:roomId', optionalAuth, optimizationController.temporaryLeave);
router.post('/quick-mode/:mode', optionalAuth, optimizationController.quickMode);
router.get('/thermal-capacities', authenticateAdmin, optimizationController.getThermalCapacities);
router.post('/thermal-capacity/:roomId', authenticateAdmin, optimizationController.calculateThermalCapacity);

export default router;
