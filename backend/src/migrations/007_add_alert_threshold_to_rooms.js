import db from '../config/database.js';
import logger from '../utils/logger.js';

export async function up() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS alert_threshold DECIMAL(5,2)
    `);

    await client.query('COMMIT');
    logger.info('Migration 007: Added alert_threshold column to rooms table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration 007 failed', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE rooms DROP COLUMN IF EXISTS alert_threshold');
    await client.query('COMMIT');
    logger.info('Migration 007 rollback: Removed alert_threshold column');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration 007 rollback failed', error);
    throw error;
  } finally {
    client.release();
  }
}
