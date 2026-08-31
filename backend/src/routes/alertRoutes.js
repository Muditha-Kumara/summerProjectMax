import express from 'express';
import alertService from '../services/alertService.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/v1/alerts
 * Get all active alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await alertService.getActiveAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/alerts/critical
 * Get critical alerts only
 */
router.get('/critical', async (req, res) => {
  try {
    const alerts = await alertService.getCriticalAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch critical alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/alerts/stats
 * Get alert statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await alertService.getAlertStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert stats',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/alerts/:id/resolve
 * Resolve an alert
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy } = req.body;

    const alert = await alertService.resolveAlert(parseInt(id), resolvedBy || 'admin');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
});

export default router;
