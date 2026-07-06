import db from '../config/database.js';

class ThermalCapacity {
  static async create({ roomId, heatingTimeMinutes, tempRise, capacity }) {
    const result = await db.query(
      `INSERT INTO thermal_capacities (room_id, heating_time_minutes, temp_rise, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [roomId, heatingTimeMinutes, tempRise, capacity]
    );
    return result.rows[0];
  }

  static async findByRoom(roomId) {
    const result = await db.query(
      `SELECT * FROM thermal_capacities 
       WHERE room_id = $1 
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [roomId]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await db.query(
      `SELECT DISTINCT ON (room_id) *
       FROM thermal_capacities
       ORDER BY room_id, calculated_at DESC`
    );
    return result.rows;
  }

  static async calculateFromHistory(roomId) {
    // Calculate thermal capacity from historical data
    // Look for periods where heating was active and temperature rose
    const result = await db.query(
      `WITH heating_periods AS (
        SELECT 
          timestamp,
          current_temp,
          relay_state,
          LAG(current_temp) OVER (ORDER BY timestamp) as prev_temp,
          LAG(relay_state) OVER (ORDER BY timestamp) as prev_relay
        FROM historical_data
        WHERE room_id = $1
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY timestamp
      )
      SELECT 
        AVG(current_temp - prev_temp) as avg_temp_rise,
        COUNT(*) as heating_minutes
      FROM heating_periods
      WHERE relay_state = TRUE 
      AND prev_relay = TRUE
      AND current_temp > prev_temp`,
      [roomId]
    );

    if (result.rows[0] && result.rows[0].avg_temp_rise && result.rows[0].heating_minutes > 0) {
      const tempRise = parseFloat(result.rows[0].avg_temp_rise);
      const heatingMinutes = parseInt(result.rows[0].heating_minutes);
      const capacity = heatingMinutes / tempRise; // minutes per degree

      await this.create({
        roomId,
        heatingTimeMinutes: heatingMinutes,
        tempRise,
        capacity
      });

      return { heatingTimeMinutes: heatingMinutes, tempRise, capacity };
    }

    return null;
  }
}

export default ThermalCapacity;
