import db from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Generate test historical data for all rooms
 * This simulates energy consumption data for testing purposes
 */
const generateTestData = async () => {
  try {
    logger.info('Generating test historical data...');

    const rooms = await db.query('SELECT id, name FROM rooms');
    const now = new Date();
    const hoursBack = 24;

    for (const room of rooms.rows) {
      logger.info(`Generating data for room: ${room.name}`);

      for (let i = hoursBack; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        // Simulate energy consumption (0.5-2.5 kWh per hour)
        const energyConsumption = Math.random() * 2 + 0.5;
        
        // Simulate temperature (18-22°C)
        const temperature = Math.random() * 4 + 18;
        
        // Simulate humidity (40-60%)
        const humidity = Math.random() * 20 + 40;

        await db.query(
          `INSERT INTO historical_data 
           (room_id, timestamp, current_temp, humidity, energy_consumption, relay_state, outdoor_temp, spot_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [room.id, timestamp, temperature, humidity, energyConsumption, Math.random() > 0.5, 5.0, 0.08]
        );
      }
    }

    logger.info('Test data generation complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error generating test data:', error);
    process.exit(1);
  }
};

generateTestData();
