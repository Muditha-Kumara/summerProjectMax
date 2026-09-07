import express from 'express';
import costService from '../services/costService.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/v1/costs/summary
 * Get total cost summary for a date range
 * Query params: startDate, endDate (ISO format)
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (ISO format)'
      });
    }

    const costs = await costService.getTotalCosts(new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate costs',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/costs/room/:roomId
 * Get costs for a specific room
 * Query params: startDate, endDate (ISO format)
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (ISO format)'
      });
    }

    const costs = await costService.calculateRoomCosts(
      parseInt(roomId),
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate room costs',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/costs/timeseries
 * Get time-series cost/energy/price data for charting
 * Query params: startDate, endDate (ISO format)
 */
router.get('/timeseries', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (ISO format)'
      });
    }

    const Room = (await import('../models/Room.js')).default;
    const rooms = await Room.findAll();
    const roomMeta = rooms.map((r) => ({ id: r.id, name: r.name }));

    // Viewer's UTC offset in minutes (e.g. +180 for EEST) so buckets align
    // with the browser wall clock instead of server UTC.
    const tzOffset = parseInt(req.query.tzOffset, 10) || 0;

    const timeseries = await costService.getTimeseries(
      new Date(startDate),
      new Date(endDate),
      tzOffset
    );

    res.json({
      success: true,
      data: {
        rooms: roomMeta,
        points: timeseries,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get timeseries data',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/costs/daily
 * Get daily cost breakdown
 * Query params: startDate, endDate (ISO format)
 */
router.get('/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required (ISO format)'
      });
    }

    const dailyBreakdown = await costService.getDailyCostBreakdown(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: dailyBreakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get daily breakdown',
      error: error.message
    });
  }
});

export default router;
