import express from 'express';
import settingsController from '../controllers/settingsController.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();

// All settings routes require admin authentication
router.use(verifyAdminToken);

// Get all settings
router.get('/', settingsController.getAll);

// API Keys and credentials
router.get('/keys', settingsController.getKeys);
router.put('/keys', settingsController.updateKeys);

// Test email
router.post('/test-email', settingsController.testEmail);

// Device mappings
router.get('/mapping', settingsController.getMappings);
router.put('/mapping', settingsController.updateMappings);

// System configuration
router.get('/system', settingsController.getSystemSettings);
router.put('/system', settingsController.updateSystemSettings);

export default router;
