import HistoricalData from '../models/HistoricalData.js';
import SpotPrice from '../models/SpotPrice.js';
import ElectricityContract from '../models/ElectricityContract.js';
import logger from '../utils/logger.js';

class CostService {
  /**
   * Calculate heating costs for a specific room
   * @param {number} roomId - Room ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Cost breakdown
   */
  async calculateRoomCosts(roomId, startDate, endDate) {
    try {
      // Get historical data for the period
      const historicalData = await HistoricalData.findByRoomAndDateRange(roomId, startDate, endDate);
      
      if (!historicalData || historicalData.length === 0) {
        return {
          totalEnergy: 0,
          totalCost: 0,
          avgPricePerKwh: 0,
          dataPoints: 0
        };
      }

      // Get active contract
      const contract = await ElectricityContract.findActive();
      
      let totalEnergy = 0;
      let totalCost = 0;

      for (const data of historicalData) {
        const energy = parseFloat(data.energy_consumption || 0);
        totalEnergy += energy;

        // Get spot price for this timestamp
        const spotPrice = await SpotPrice.findClosestToTimestamp(data.timestamp);
        const pricePerKwh = spotPrice ? parseFloat(spotPrice.price) : 0;

        // Calculate effective price based on contract
        let effectivePrice = pricePerKwh;
        if (contract) {
          effectivePrice = this.calculateEffectivePrice(contract, pricePerKwh);
        }

        totalCost += energy * effectivePrice;
      }

      return {
        totalEnergy: Math.round(totalEnergy * 1000) / 1000, // kWh
        totalCost: Math.round(totalCost * 100) / 100, // EUR
        avgPricePerKwh: totalEnergy > 0 ? Math.round((totalCost / totalEnergy) * 10000) / 10000 : 0,
        dataPoints: historicalData.length,
        contractType: contract?.type || 'spot'
      };
    } catch (error) {
      logger.error('Error calculating room costs:', error);
      throw error;
    }
  }

  /**
   * Calculate effective price based on contract type
   * @param {Object} contract - Electricity contract
   * @param {number} spotPrice - Spot price in EUR/kWh
   * @returns {number} Effective price in EUR/kWh
   */
  calculateEffectivePrice(contract, spotPrice) {
    if (!contract) return spotPrice;

    switch (contract.type) {
      case 'fixed':
        return parseFloat(contract.fixed_price);
      
      case 'spot':
        // Spot price + margin
        return spotPrice + parseFloat(contract.spot_margin || 0);
      
      case 'tiered':
        // Tiered pricing based on consumption level
        return this.calculateTieredPrice(spotPrice, contract.tiered_pricing);
      
      default:
        return spotPrice;
    }
  }

  /**
   * Calculate tiered pricing
   * @param {number} spotPrice - Current spot price
   * @param {Object} tiers - Tier configuration
   * @returns {number} Effective price
   */
  calculateTieredPrice(spotPrice, tiers) {
    if (!tiers || !Array.isArray(tiers)) {
      return spotPrice;
    }

    // Find applicable tier based on spot price range
    for (const tier of tiers) {
      if (spotPrice >= tier.min_price && spotPrice <= tier.max_price) {
        return parseFloat(tier.price);
      }
    }

    // Default to highest tier if no match
    return tiers[tiers.length - 1]?.price || spotPrice;
  }

  /**
   * Get cost summary for all rooms
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Total costs across all rooms
   */
  async getTotalCosts(startDate, endDate) {
    try {
      const Room = (await import('../models/Room.js')).default;
      const rooms = await Room.findAll();
      
      let totalEnergy = 0;
      let totalCost = 0;
      const roomBreakdown = [];

      for (const room of rooms) {
        const costs = await this.calculateRoomCosts(room.id, startDate, endDate);
        totalEnergy += costs.totalEnergy;
        totalCost += costs.totalCost;
        
        roomBreakdown.push({
          roomId: room.id,
          roomName: room.name,
          ...costs
        });
      }

      return {
        totalEnergy: Math.round(totalEnergy * 1000) / 1000,
        totalCost: Math.round(totalCost * 100) / 100,
        avgPricePerKwh: totalEnergy > 0 ? Math.round((totalCost / totalEnergy) * 10000) / 10000 : 0,
        roomBreakdown
      };
    } catch (error) {
      logger.error('Error calculating total costs:', error);
      throw error;
    }
  }

  /**
   * Get time-series cost/energy/price data for charting.
   * Fills ALL time slots so the chart always has a complete axis.
   * Day   → 24 hourly buckets.  Week/Month → daily buckets.  Year → monthly buckets.
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Timeseries data points
   */
  async getTimeseries(startDate, endDate) {
    try {
      const Room = (await import('../models/Room.js')).default;
      const rooms = await Room.findAll();
      const rangeDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

      const contract = await ElectricityContract.findActive();

      // Decide bucket strategy
      let generateSlots, slotLabel;
      if (rangeDays <= 1) {
        // Day: 24 hourly slots 0-23
        generateSlots = () => {
          const slots = [];
          const base = new Date(startDate);
          for (let h = 0; h < 24; h++) {
            const slot = new Date(base);
            slot.setHours(h, 0, 0, 0);
            slots.push(slot);
          }
          return slots;
        };
        slotLabel = (d) => `${String(d.getHours()).padStart(2, '0')}:00`;
      } else if (rangeDays <= 31) {
        // Week/Month: daily slots
        generateSlots = () => {
          const slots = [];
          const cur = new Date(startDate);
          while (cur < endDate) {
            slots.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
          }
          return slots;
        };
        slotLabel = (d) => {
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${m}-${day}`;
        };
      } else {
        // Year: monthly slots
        generateSlots = () => {
          const slots = [];
          const cur = new Date(startDate.getFullYear(), 0, 1);
          const end = new Date(endDate);
          while (cur < end) {
            slots.push(new Date(cur));
            cur.setMonth(cur.getMonth() + 1);
          }
          return slots;
        };
        slotLabel = (d) => {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return months[d.getMonth()];
        };
      }

      const slots = generateSlots();

      // Fetch all raw data for every room in one pass
      const allRawData = [];
      for (const room of rooms) {
        const rows = await HistoricalData.findByRoomAndDateRange(room.id, startDate, endDate);
        for (const row of rows) {
          allRawData.push({ ...row, roomId: room.id, roomName: room.name });
        }
      }

      // Build result: one entry per slot, all rooms as flat keys
      const result = [];
      for (const slotStart of slots) {
        const slotEnd = new Date(slotStart);
        if (rangeDays <= 1) slotEnd.setHours(slotEnd.getHours() + 1);
        else if (rangeDays <= 31) slotEnd.setDate(slotEnd.getDate() + 1);
        else slotEnd.setMonth(slotEnd.getMonth() + 1);

        const bucket = allRawData.filter((row) => {
          const t = new Date(row.timestamp);
          return t >= slotStart && t < slotEnd;
        });

        const entry = {
          label: slotLabel(slotStart),
          timestamp: slotStart.toISOString(),
        };

        // Per-room energy
        let totalEnergy = 0;
        let spotPriceSum = 0;
        let spotPriceCount = 0;

        for (const room of rooms) {
          const roomRows = bucket.filter((r) => r.roomId === room.id);
          const energy = roomRows.reduce((sum, r) => sum + parseFloat(r.energy_consumption || 0), 0);
          entry[`room_${room.id}`] = Math.round(energy * 1000) / 1000;
          totalEnergy += energy;
        }

        // Spot price from bucket data
        for (const row of bucket) {
          if (spotPriceCount === 0 && row.spot_price != null) {
            spotPriceSum = parseFloat(row.spot_price);
            spotPriceCount = 1;
          }
        }

        // If no spot price in bucket, fallback to closest
        if (spotPriceCount === 0) {
          const midPoint = new Date((slotStart.getTime() + slotEnd.getTime()) / 2);
          const spotPrice = await SpotPrice.findClosestToTimestamp(midPoint);
          if (spotPrice) {
            spotPriceSum = parseFloat(spotPrice.price);
            spotPriceCount = 1;
          }
        }

        const avgSpotPrice = spotPriceCount > 0 ? spotPriceSum / spotPriceCount : 0;
        const totalCost = totalEnergy * (contract ? this.calculateEffectivePrice(contract, avgSpotPrice) : avgSpotPrice);

        entry.totalEnergy = Math.round(totalEnergy * 1000) / 1000;
        entry.totalCost = Math.round(totalCost * 100) / 100;
        entry.spotPrice = Math.round(avgSpotPrice * 10000) / 10000;

        result.push(entry);
      }
      return result;
    } catch (error) {
      logger.error('Error getting timeseries data:', error);
      throw error;
    }
  }

  /**
   * Get daily cost breakdown for a period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Daily cost data
   */
  async getDailyCostBreakdown(startDate, endDate) {
    try {
      const Room = (await import('../models/Room.js')).default;
      const rooms = await Room.findAll();
      
      const dailyData = new Map();
      
      // Initialize date range
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0];
        dailyData.set(dateKey, {
          date: dateKey,
          totalEnergy: 0,
          totalCost: 0,
          byRoom: {}
        });
        current.setDate(current.getDate() + 1);
      }

      // Calculate costs per room per day
      for (const room of rooms) {
        const historicalData = await HistoricalData.findByRoomAndDateRange(room.id, startDate, endDate);
        
        for (const data of historicalData) {
          const dateKey = new Date(data.timestamp).toISOString().split('T')[0];
          if (!dailyData.has(dateKey)) continue;

          const dayData = dailyData.get(dateKey);
          const energy = parseFloat(data.energy_consumption || 0);
          
          // Get spot price
          const spotPrice = await SpotPrice.findClosestToTimestamp(data.timestamp);
          const pricePerKwh = spotPrice ? parseFloat(spotPrice.price) : 0;

          // Get contract
          const contract = await ElectricityContract.findActive();
          const effectivePrice = this.calculateEffectivePrice(contract, pricePerKwh);

          const cost = energy * effectivePrice;

          dayData.totalEnergy += energy;
          dayData.totalCost += cost;
          
          if (!dayData.byRoom[room.id]) {
            dayData.byRoom[room.id] = {
              roomName: room.name,
              energy: 0,
              cost: 0
            };
          }
          dayData.byRoom[room.id].energy += energy;
          dayData.byRoom[room.id].cost += cost;
        }
      }

      // Convert to array and round values
      return Array.from(dailyData.values()).map(day => ({
        ...day,
        totalEnergy: Math.round(day.totalEnergy * 1000) / 1000,
        totalCost: Math.round(day.totalCost * 100) / 100,
        byRoom: Object.fromEntries(
          Object.entries(day.byRoom).map(([roomId, data]) => [
            roomId,
            {
              ...data,
              energy: Math.round(data.energy * 1000) / 1000,
              cost: Math.round(data.cost * 100) / 100
            }
          ])
        )
      }));
    } catch (error) {
      logger.error('Error getting daily cost breakdown:', error);
      throw error;
    }
  }
}

export default new CostService();
