import db from '../config/database.js';

class HistoricalData {
  static async create({ roomId, currentTemp, targetTemp, humidity, relayState, energyConsumption, outdoorTemp, spotPrice }) {
    const result = await db.query(
      `INSERT INTO historical_data 
       (room_id, current_temp, target_temp, humidity, relay_state, energy_consumption, outdoor_temp, spot_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [roomId, currentTemp, targetTemp, humidity, relayState, energyConsumption, outdoorTemp, spotPrice]
    );
    return result.rows[0];
  }

  static async findByRoom(roomId, { limit = 100, offset = 0, startDate, endDate } = {}) {
    let query = 'SELECT * FROM historical_data WHERE room_id = $1';
    const params = [roomId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND timestamp >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getAverageByRoom(roomId, period = 'day') {
    let interval = '1 day';
    if (period === 'week') interval = '7 days';
    if (period === 'month') interval = '30 days';

    const result = await db.query(
      `SELECT 
        AVG(current_temp) as avg_temp,
        AVG(humidity) as avg_humidity,
        SUM(energy_consumption) as total_energy,
        COUNT(*) as readings
       FROM historical_data 
       WHERE room_id = $1 
       AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${interval}'`,
      [roomId]
    );
    return result.rows[0];
  }

  static async getEnergyConsumption(roomId, period = 'day') {
    let interval = '1 day';
    if (period === 'week') interval = '7 days';
    if (period === 'month') interval = '30 days';
    if (period === 'year') interval = '365 days';

    const result = await db.query(
      `SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        SUM(energy_consumption) as total_energy,
        AVG(current_temp) as avg_temp
       FROM historical_data 
       WHERE room_id = $1 
       AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC('hour', timestamp)
       ORDER BY hour DESC`,
      [roomId]
    );
    return result.rows;
  }
}

export default HistoricalData;
