// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'smart_heating_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Mock external services
jest.mock('../src/services/shellyService.js', () => ({
  getDeviceStatus: jest.fn().mockResolvedValue({ success: true, data: {} }),
  setRelayState: jest.fn().mockResolvedValue({ success: true }),
  getTemperature: jest.fn().mockResolvedValue({ success: true, temperature: 20.5 }),
  getHumidity: jest.fn().mockResolvedValue({ success: true, humidity: 45 }),
  getPowerConsumption: jest.fn().mockResolvedValue({ success: true, power: 1500, total: 12500 })
}));

jest.mock('../src/services/weatherService.js', () => ({
  getCurrentWeather: jest.fn().mockResolvedValue({
    success: true,
    data: { temperature: 5.2, humidity: 65, windSpeed: 3.5, description: 'clear sky' }
  }),
  getForecast: jest.fn().mockResolvedValue({ success: true, forecast: [] }),
  getOutdoorTemperature: jest.fn().mockResolvedValue({ success: true, temperature: 5.2 })
}));

jest.mock('../src/services/nordPoolService.js', () => ({
  fetchSpotPrices: jest.fn().mockResolvedValue({ success: true, prices: [] }),
  getCurrentPrice: jest.fn().mockResolvedValue({ success: true, price: 0.085 }),
  getForecast: jest.fn().mockResolvedValue({ success: true, prices: [] }),
  getCheapestHours: jest.fn().mockResolvedValue({ success: true, prices: [] })
}));

jest.mock('../src/services/emailService.js', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendTemperatureAlert: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' })
}));
