import express from 'express';
import virtualShellyService from '../services/virtualShellyService.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Debug endpoint - get all virtual device states (admin only)
router.get('/devices', authenticateAdmin, (req, res) => {
  try {
    const devices = virtualShellyService.getAllDeviceStates();
    res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Debug endpoint - set outdoor temperature for simulation
router.post('/outdoor-temp', authenticateAdmin, (req, res) => {
  try {
    const { temperature } = req.body;
    
    if (typeof temperature !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Temperature must be a number'
      });
    }
    
    virtualShellyService.setOutdoorTemperature(temperature);
    
    res.json({
      success: true,
      message: `Outdoor temperature set to ${temperature}°C`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Debug endpoint - reset a specific device
router.post('/reset/:deviceId', authenticateAdmin, (req, res) => {
  try {
    const { deviceId } = req.params;
    virtualShellyService.resetDevice(deviceId);
    
    res.json({
      success: true,
      message: `Device ${deviceId} reset to initial state`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
