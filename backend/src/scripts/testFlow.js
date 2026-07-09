const axios = require('axios');
const bookingLifecycle = require('../services/bookingLifecycle');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const api = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000 });

let bookingId = null;
let userPin = null;
let roomId = null;

async function step1_createBooking() {
  console.log('\n=== STEP 1: Admin creates booking ===');
  try {
    const res = await api.post('/bookings', {
      guest_name: 'Test User',
      room_id: 1,
      checkin_time: new Date(Date.now() - 3600000).toISOString(),
      checkout_time: new Date(Date.now() - 60000).toISOString()
    });
    bookingId = res.data.booking?.id || res.data.id;
    userPin = res.data.booking?.user_pin || res.data.user_pin || '1234';
    roomId = res.data.booking?.room_id || 1;
    console.log(`✓ Booking created: ID=${bookingId}, PIN=${userPin}`);
  } catch (err) {
    console.error('✗ Step 1 failed:', err.response?.data || err.message);
    throw err;
  }
}

async function step2_validatePin() {
  console.log('\n=== STEP 2: User validates PIN ===');
  try {
    const res = await api.post('/bookings/validate', {
      booking_id: bookingId,
      pin: userPin
    });
    console.log(`✓ PIN validated: ${JSON.stringify(res.data)}`);
  } catch (err) {
    console.error('✗ Step 2 failed:', err.response?.data || err.message);
    throw err;
  }
}

async function step3_setTemperature() {
  console.log('\n=== STEP 3: User sets room temp to 22°C ===');
  try {
    const res = await api.put(`/rooms/${roomId}/temp`, {
      target_temp: 22
    });
    console.log(`✓ Temperature set: ${JSON.stringify(res.data)}`);
  } catch (err) {
    console.error('✗ Step 3 failed:', err.response?.data || err.message);
    throw err;
  }
}

async function simulateCheckout() {
  console.log('\n=== STEP 4: Simulate checkout (trigger expired bookings) ===');
  try {
    const result = await bookingLifecycle.checkExpiredBookings();
    console.log(`✓ Checkout simulated: ${JSON.stringify(result)}`);
  } catch (err) {
    console.error('✗ Step 4 failed:', err.message);
    throw err;
  }
}

async function step5_verifyEcoMode() {
  console.log('\n=== STEP 5: Verify ECO mode (rooms at 15°C) ===');
  try {
    const res = await api.get('/rooms');
    const rooms = res.data.rooms || res.data || [];
    const allEco = rooms.every(r => (r.target_temp || r.targetTemp) <= 15);
    rooms.forEach(r => {
      console.log(`  Room "${r.name}": target=${r.target_temp || r.targetTemp}°C`);
    });
    console.log(allEco ? '✓ All rooms in ECO mode (≤15°C)' : '✗ Some rooms NOT in ECO mode');
  } catch (err) {
    console.error('✗ Step 5 failed:', err.response?.data || err.message);
    throw err;
  }
}

(async () => {
  console.log(`Starting E2E flow test against ${BASE_URL}`);
  try {
    await step1_createBooking();
    await step2_validatePin();
    await step3_setTemperature();
    await simulateCheckout();
    await step5_verifyEcoMode();
    console.log('\n✓ ALL STEPS COMPLETED');
  } catch (err) {
    console.error('\n✗ FLOW TEST FAILED:', err.message);
    process.exit(1);
  }
})();