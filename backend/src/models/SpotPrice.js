import db from '../config/database.js';

class SpotPrice {
  static async create({ timestamp, price, area = 'FI' }) {
    const result = await db.query(
      `INSERT INTO spot_prices (timestamp, price, area)
       VALUES ($1, $2, $3)
       ON CONFLICT (timestamp, area) DO UPDATE SET price = $2
       RETURNING *`,
      [timestamp, price, area]
    );
    return result.rows[0];
  }

  static async bulkCreate(prices) {
    const values = [];
    const params = [];
    let paramCount = 1;

    prices.forEach(({ timestamp, price, area = 'FI' }) => {
      values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2})`);
      params.push(timestamp, price, area);
      paramCount += 3;
    });

    const result = await db.query(
      `INSERT INTO spot_prices (timestamp, price, area)
       VALUES ${values.join(', ')}
       ON CONFLICT (timestamp, area) DO UPDATE SET price = EXCLUDED.price
       RETURNING *`,
      params
    );
    return result.rows;
  }

  static async findCurrent(area = 'FI') {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE area = $1 
       AND timestamp <= CURRENT_TIMESTAMP
       ORDER BY timestamp DESC
       LIMIT 1`,
      [area]
    );
    return result.rows[0];
  }

  static async findForecast(hours = 24, area = 'FI') {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE area = $1 
       AND timestamp >= CURRENT_TIMESTAMP
       AND timestamp <= CURRENT_TIMESTAMP + INTERVAL '${hours} hours'
       ORDER BY timestamp ASC`,
      [area]
    );
    return result.rows;
  }

  static async findCheapestHours(hours = 24, limit = 6, area = 'FI') {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE area = $1 
       AND timestamp >= CURRENT_TIMESTAMP
       AND timestamp <= CURRENT_TIMESTAMP + INTERVAL '${hours} hours'
       ORDER BY price ASC
       LIMIT $2`,
      [area, limit]
    );
    return result.rows;
  }

  static async findMostExpensiveHours(hours = 24, limit = 6, area = 'FI') {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE area = $1 
       AND timestamp >= CURRENT_TIMESTAMP
       AND timestamp <= CURRENT_TIMESTAMP + INTERVAL '${hours} hours'
       ORDER BY price DESC
       LIMIT $2`,
      [area, limit]
    );
    return result.rows;
  }

  static async findClosestToTimestamp(timestamp) {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE timestamp <= $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [timestamp]
    );
    return result.rows[0];
  }

  static async findByDateRange(startDate, endDate) {
    const result = await db.query(
      `SELECT * FROM spot_prices 
       WHERE timestamp >= $1 
       AND timestamp <= $2
       ORDER BY timestamp ASC`,
      [startDate, endDate]
    );
    return result.rows;
  }
}

export default SpotPrice;
