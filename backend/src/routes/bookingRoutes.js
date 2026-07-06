import express from 'express';
import bookingController from '../controllers/bookingController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protected routes (admin only)
router.get('/', authenticateAdmin, bookingController.getAll);
router.get('/active', authenticateAdmin, bookingController.getActive);
router.get('/:id', authenticateAdmin, bookingController.getById);
router.post('/', authenticateAdmin, bookingController.create);
router.put('/:id/status', authenticateAdmin, bookingController.updateStatus);
router.delete('/:id', authenticateAdmin, bookingController.delete);

export default router;
