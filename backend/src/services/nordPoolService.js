import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import SpotPrice from '../models/SpotPrice.js';

class NordPoolService {
  constructor() {
    this.apiUrl = config.nordPool.apiUrl;
    this.area = config.nordPool.area;
    this.useMockPrices = config.nordPool.useMockPrices;
    this.spotHintaApiUrl = config.spotHinta.apiUrl;
    this.priceSource = config.priceSource;
  }

  /**
   * Generate realistic mock spot prices (EUR/MWh) for testing.
   * Simulates a typical Finnish day-ahead price curve:
   *  - Cheap at night (00–06)
   *  - Morning peak (07–09)
   *  - Midday dip
   *  - Evening peak (17–20)
   */
  generateMockPrices(hours = 48) {
    const prices = [];
    const now = new Date();
    // Align to the start of the current hour
    now.setMinutes(0, 0, 0);

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = timestamp.getHours();

      // Base price in EUR/MWh with a realistic daily shape
      let basePrice;
      if (hour >= 0 && hour < 6) basePrice = 30 + Math.random() * 10;       // night: cheap
      else if (hour >= 6 && hour < 9) basePrice = 70 + Math.random() * 20;  // morning peak
      else if (hour >= 9 && hour < 16) basePrice = 45 + Math.random() * 15; // midday
      else if (hour >= 16 && hour < 21) basePrice = 80 + Math.random() * 25;// evening peak
      else basePrice = 40 + Math.random() * 10;                             // late evening

      prices.push({
        timestamp,
        price: basePrice / 1000, // convert EUR/MWh → EUR/kWh
        area: this.area
      });
    }
    return prices;
  }

  /**
   * Fetch prices from spot-hinta.fi (free, no API key required)
   * Returns 15-minute interval prices in EUR/kWh
   */
  async fetchSpotHintaPrices() {
    try {
      logger.info('Fetching prices from spot-hinta.fi');
      
      const response = await axios.get(`${this.spotHintaApiUrl}/TodayAndDayForward`, {
        timeout: 10000
      });

      if (!response.data || !Array.isArray(response.data)) {
        return { success: false, message: 'Invalid response from spot-hinta.fi' };
      }

      // Convert 15-min intervals to hourly averages
      const hourlyPrices = this.aggregateSpotHintaData(response.data);
      
      logger.info(`Fetched ${response.data.length} intervals, aggregated to ${hourlyPrices.length} hours`);
      return { success: true, prices: hourlyPrices };
    } catch (error) {
      logger.error('Spot-hinta.fi API error', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Aggregate 15-minute interval data to hourly averages
   */
  aggregateSpotHintaData(data) {
    const hourlyMap = new Map();

    data.forEach(item => {
      const dateTime = new Date(item.DateTime);
      const hourKey = new Date(dateTime);
      hourKey.setMinutes(0, 0, 0);
      const key = hourKey.toISOString();

      if (!hourlyMap.has(key)) {
        hourlyMap.set(key, {
          timestamp: hourKey,
          prices: [],
          area: this.area
        });
      }

      // Use PriceWithTax for consumer-facing prices (EUR/kWh)
      hourlyMap.get(key).prices.push(item.PriceWithTax);
    });

    // Calculate hourly averages
    return Array.from(hourlyMap.values()).map(entry => ({
      timestamp: entry.timestamp,
      price: entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length,
      area: entry.area
    }));
  }

  async fetchSpotPrices(hours = 24) {
    try {
      let prices;

      // Determine which price source to use
      if (this.priceSource === 'spothinta') {
        logger.info('Using spot-hinta.fi as price source');
        const result = await this.fetchSpotHintaPrices();
        if (result.success) {
          prices = result.prices;
        } else {
          logger.warn('Spot-hinta.fi failed, falling back to mock prices');
          prices = this.generateMockPrices(hours);
        }
      } else if (this.useMockPrices || this.priceSource === 'mock') {
        logger.info('Using MOCK spot prices');
        prices = this.generateMockPrices(hours);
      } else {
        // Nord Pool API endpoint for day-ahead prices
        const response = await axios.get(
          `${this.apiUrl}/page1`,
          {
            params: {
              endDate: new Date().toISOString().split('T')[0],
              country: this.area
            }
          }
        );

        if (response.data && response.data.data) {
          prices = this.parsePrices(response.data.data);
        } else {
          return { success: false, message: 'No price data available' };
        }
      }

      // Store in database
      if (prices && prices.length > 0) {
        await SpotPrice.bulkCreate(prices);
        logger.info(`Stored ${prices.length} spot prices from ${this.priceSource}`);
      }

      return {
        success: true,
        prices: prices || []
      };
    } catch (error) {
      logger.error('Price fetch error', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  parsePrices(data) {
    const prices = [];
    
    if (data.Rows) {
      data.Rows.forEach(row => {
        if (row.Columns) {
          row.Columns.forEach(col => {
            if (col.Value && col.Value !== '-') {
              const price = parseFloat(col.Value.replace(',', '.'));
              const timestamp = new Date(row.StartTime);
              
              prices.push({
                timestamp,
                price: price / 1000, // Convert from EUR/MWh to EUR/kWh
                area: this.area
              });
            }
          });
        }
      });
    }

    return prices;
  }

  async getCurrentPrice() {
    const current = await SpotPrice.findCurrent(this.area);
    
    if (current) {
      return {
        success: true,
        price: current.price,
        timestamp: current.timestamp
      };
    }

    // Fetch fresh data if not available
    await this.fetchSpotPrices();
    const fresh = await SpotPrice.findCurrent(this.area);
    
    return {
      success: !!fresh,
      price: fresh?.price,
      timestamp: fresh?.timestamp
    };
  }

  async getForecast(hours = 24, area = this.area) {
    const forecast = await SpotPrice.findForecast(hours, area);
    
    return {
      success: true,
      prices: forecast
    };
  }

  /**
   * Return hourly prices covering today and tomorrow (local calendar days),
   * including hours already passed today. Used by the dashboard chart's
   * Today/Tomorrow toggle.
   *
   * The window is intentionally generous (server runs in UTC, the browser may
   * be several hours ahead/behind) so the client always receives every row it
   * needs to bucket by its own local calendar day.
   */
  async getTodayAndTomorrow() {
    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;
    // Cover up to ±14h of timezone offset relative to the server's UTC day.
    const start = new Date(now.getTime() - 2 * DAY);
    const end = new Date(now.getTime() + 3 * DAY);

    const rows = await SpotPrice.findByDateRange(start, end, this.area);
    return { success: true, prices: rows };
  }

  async getCheapestHours(hours = 24, limit = 6) {
    const cheapest = await SpotPrice.findCheapestHours(hours, limit, this.area);
    
    return {
      success: true,
      prices: cheapest
    };
  }

  async getMostExpensiveHours(hours = 24, limit = 6) {
    const expensive = await SpotPrice.findMostExpensiveHours(hours, limit, this.area);
    
    return {
      success: true,
      prices: expensive
    };
  }
}

export default new NordPoolService();
