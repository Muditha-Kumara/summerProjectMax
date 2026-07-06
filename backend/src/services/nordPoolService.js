import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import SpotPrice from '../models/SpotPrice.js';

class NordPoolService {
  constructor() {
    this.apiUrl = config.nordPool.apiUrl;
    this.area = config.nordPool.area;
  }

  async fetchSpotPrices(hours = 24) {
    try {
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
        const prices = this.parsePrices(response.data.data);
        
        // Store in database
        if (prices.length > 0) {
          await SpotPrice.bulkCreate(prices);
          logger.info(`Stored ${prices.length} spot prices`);
        }

        return {
          success: true,
          prices
        };
      }

      return {
        success: false,
        message: 'No price data available'
      };
    } catch (error) {
      logger.error('Nord Pool API error', error);
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

  async getForecast(hours = 24) {
    const forecast = await SpotPrice.findForecast(hours, this.area);
    
    return {
      success: true,
      prices: forecast
    };
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
