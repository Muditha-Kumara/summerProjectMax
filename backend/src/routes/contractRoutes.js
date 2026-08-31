import express from 'express';
import contractService from '../services/contractService.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/v1/contracts
 * Get all electricity contracts
 */
router.get('/', async (req, res) => {
  try {
    const contracts = await contractService.getAllContracts();
    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contracts',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/contracts/active
 * Get currently active contract
 */
router.get('/active', async (req, res) => {
  try {
    const contract = await contractService.getCurrentContract();
    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active contract',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/contracts
 * Create new contract
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, fixed_price, spot_margin, tiered_pricing, start_date, end_date, is_active } = req.body;

    // Validation
    if (!name || !type || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, start_date'
      });
    }

    if (!['fixed', 'spot', 'tiered'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contract type. Must be: fixed, spot, or tiered'
      });
    }

    if (type === 'fixed' && !fixed_price) {
      return res.status(400).json({
        success: false,
        message: 'Fixed price contracts require fixed_price field'
      });
    }

    const contract = await contractService.saveContract({
      name,
      type,
      fixed_price,
      spot_margin,
      tiered_pricing,
      start_date,
      end_date,
      is_active
    });

    res.json({
      success: true,
      data: contract,
      message: 'Contract created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create contract',
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/contracts/:id
 * Update existing contract
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contract = await contractService.saveContract({
      id: parseInt(id),
      ...updates
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.json({
      success: true,
      data: contract,
      message: 'Contract updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update contract',
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/contracts/:id
 * Delete contract
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await contractService.deleteContract(parseInt(id));

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.json({
      success: true,
      message: 'Contract deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete contract',
      error: error.message
    });
  }
});

export default router;
