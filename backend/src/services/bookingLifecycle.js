const db = require('../config/database');

async function checkExpiredBookings() {
  try {
    const [expired] = await db.query(
      `SELECT id, user_pin, user_token, room_id 
       FROM bookings 
       WHERE checkout_time < NOW() 
       AND status = 'active'`
    );

    if (!expired || expired.length === 0) {
      return { revoked: 0, message: 'No expired bookings found' };
    }

    for (const booking of expired) {
      // Revoke user PIN/token
      await db.query(
        `UPDATE bookings 
         SET status = 'completed', user_pin = NULL, user_token = NULL 
         WHERE id = ?`,
        [booking.id]
      );

      // Log event
      await db.query(
        `INSERT INTO event_log (event_type, booking_id, details, created_at) 
         VALUES ('CHECKOUT_EXPIRED', ?, ?, NOW())`,
        [booking.id, JSON.stringify({ action: 'PIN_REVOKED', booking_id: booking.id })]
      );
    }

    // Trigger ECO mode
    await setGlobalMode('ECO');

    return { revoked: expired.length, mode: 'ECO', message: 'Expired bookings processed, ECO mode activated' };
  } catch (err) {
    console.error('[bookingLifecycle] checkExpiredBookings error:', err.message);
    throw err;
  }
}

async function setGlobalMode(mode) {
  try {
    const [rooms] = await db.query(`SELECT id, name FROM rooms`);

    for (const room of rooms) {
      const targetTemp = mode === 'ECO' ? 15 : 21;
      await db.query(
        `INSERT INTO room_settings (room_id, target_temp, mode, updated_at) 
         VALUES (?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE target_temp = ?, mode = ?, updated_at = NOW()`,
        [room.id, targetTemp, mode, targetTemp, mode]
      );
    }

    await db.query(
      `INSERT INTO event_log (event_type, details, created_at) 
       VALUES ('GLOBAL_MODE_CHANGE', ?, NOW())`,
      [JSON.stringify({ mode, targetTemp: mode === 'ECO' ? 15 : 21 })]
    );
  } catch (err) {
    console.error('[bookingLifecycle] setGlobalMode error:', err.message);
    throw err;
  }
}

function handleVoiceCommand(transcript, roomId) {
  if (!transcript || typeof transcript !== 'string') return null;

  const normalized = transcript.trim().toLowerCase();

  // Finnish: "22 astetta", "lämpötila 22", "aseta 22 asteeseen"
  const finnishMatch = normalized.match(/(\d{1,2})\s*(aste(?:tta|eseen)?|°)/);
  if (finnishMatch) {
    const temp = parseInt(finnishMatch[1], 10);
    if (temp >= 5 && temp <= 35) {
      return { targetTemp: temp, roomId };
    }
  }

  // English: "set to 22", "22 degrees", "temperature 22"
  const englishMatch = normalized.match(/(?:set\s*(?:to)?|temperature)?\s*(\d{1,2})\s*(?:degrees|°)?/);
  if (englishMatch) {
    const temp = parseInt(englishMatch[1], 10);
    if (temp >= 5 && temp <= 35) {
      return { targetTemp: temp, roomId };
    }
  }

  return null;
}

module.exports = {
  checkExpiredBookings,
  setGlobalMode,
  handleVoiceCommand
};