import db from '../config/database.js';
import logger from '../utils/logger.js';

export async function up() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS electricity_contracts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'spot', 'tiered')),
        fixed_price DECIMAL(10, 4),
        spot_margin DECIMAL(10, 4) DEFAULT 0,
        tiered_pricing JSONB,
        start_date DATE NOT NULL,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_electricity_contracts_active 
      ON electricity_contracts(is_active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_electricity_contracts_dates 
      ON electricity_contracts(start_date, end_date)
    `);

    await client.query('COMMIT');
    logger.info('Migration 006: Created electricity_contracts table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration 006 failed', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS electricity_contracts');
    await client.query('COMMIT');
    logger.info('Migration 006: Dropped electricity_contracts table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration 006 rollback failed', error);
    throw error;
  } finally {
    client.release();
  }
}
