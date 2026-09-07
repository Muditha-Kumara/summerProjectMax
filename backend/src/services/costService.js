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
   * The FULL period is always returned — 24 hourly buckets for a day, Mon–Sun
   * for a week, every day of the month, Jan–Dec for a year — so the X axis
   * spans the complete range. Slots after the current one carry null values,
   * which makes the chart lines stop at "now" while the axis stays complete.
   * Day   → hourly buckets.  Week/Month → daily buckets.  Year → monthly buckets.
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} [tzOffsetMinutes] - Viewer UTC offset in minutes (the
   *   inverse of `new Date().getTimezoneOffset()`), so buckets align with the
   *   browser's wall clock instead of the server's UTC clock.
   * @returns {Array} Timeseries data points
   */
  async getTimeseries(startDate, endDate, tzOffsetMinutes = 0) {
    try {
      const Room = (await import('../models/Room.js')).default;
      const rooms = await Room.findAll();
      const rangeDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const offsetMs = (Number(tzOffsetMinutes) || 0) * 60 * 1000;

      const contract = await ElectricityContract.findActive();

      // Shift helper: get the "local" wall-clock view of a UTC instant at the
      // viewer's offset. UTC getters on the shifted date read the viewer's
      // wall-clock fields regardless of the server's own timezone.
      const local = (d) => new Date(d.getTime() + offsetMs);

      // Bucket resolution: hour for day view, day for week/month, month for year
      const unit = rangeDays <= 1 ? 'hour' : rangeDays <= 31 ? 'day' : 'month';

      const floorToUnit = (d) => {
        const l = new Date(d);
        if (unit === 'hour') l.setUTCMinutes(0, 0, 0);
        else if (unit === 'day') l.setUTCHours(0, 0, 0, 0);
        else { l.setUTCDate(1); l.setUTCHours(0, 0, 0, 0); }
        return l;
      };
      const addUnit = (d, n = 1) => {
        const l = new Date(d);
        if (unit === 'hour') l.setUTCHours(l.getUTCHours() + n);
        else if (unit === 'day') l.setUTCDate(l.getUTCDate() + n);
        else l.setUTCMonth(l.getUTCMonth() + n);
        return l;
      };

      // Generate slot starts in "wall-clock space" (a Date whose UTC getters
      // read the viewer's local fields). The client sends bare local date
      // strings (YYYY-MM-DD) that parse to UTC-midnight, so startDate already
      // reads the intended wall-clock start and must NOT be shifted again.
      // Only real instants (now, DB timestamps) need the +offset shift.
      // Always emit the FULL requested period (endDate is exclusive), so the
      // X axis shows every hour/day/month. Slots beyond the current one are
      // nulled out below → lines stop at "now", axis spans the whole period.
      const lastWithDataSlot = floorToUnit(local(new Date()));
      const startFloor = floorToUnit(new Date(startDate));
      const endFloor = floorToUnit(new Date(endDate));
      const slots = [];
      let cur = startFloor;
      while (cur < endFloor && slots.length < 400) {
        slots.push(cur);
        cur = addUnit(cur);
      }
      if (slots.length === 0) slots.push(startFloor);

      const slotLabel = (d) => {
        if (unit === 'hour') {
          return `${String(d.getUTCHours()).padStart(2, '0')}:00`;
        }
        if (unit === 'day') {
          if (rangeDays <= 7) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${days[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
          }
          return `${String(d.getUTCDate()).padStart(2, '0')}`;
        }
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getUTCMonth()];
      };

      // Fetch all raw data for every room in one pass. The DB holds real UTC
      // instants, so widen the query to cover both the naive window and the
      // viewer-local window (for UTC+3, local midnight = 21:00 UTC the
      // previous day, which the naive range would drop).
      const offsetStartDate = new Date(startDate.getTime() - offsetMs);
      const offsetEndDate = new Date(endDate.getTime() - offsetMs);
      const queryStart = new Date(Math.min(startDate.getTime(), offsetStartDate.getTime()));
      const queryEnd = new Date(Math.max(endDate.getTime(), offsetEndDate.getTime()));
      const allRawData = [];
      for (const room of rooms) {
        const rows = await HistoricalData.findByRoomAndDateRange(room.id, queryStart, queryEnd);
        for (const row of rows) {
          allRawData.push({ ...row, roomId: room.id, roomName: room.name });
        }
      }

      // Load spot prices once for the (widened) window and resolve them in
      // memory, instead of a DB round-trip per bucket. Matches the original
      // "latest price at or before the bucket midpoint" behaviour.
      const priceRows = await SpotPrice.findByDateRange(
        new Date(queryStart.getTime() - 24 * 60 * 60 * 1000),
        new Date(queryEnd.getTime() + 60 * 60 * 1000)
      );
      const priceAt = (tsMs) => {
        let best = null;
        for (const p of priceRows) {
          const t = new Date(p.timestamp).getTime();
          if (t <= tsMs && (best === null || t > best.t)) best = { t, price: p.price };
        }
        if (best) return best.price;
        // Nothing at/before (e.g. very first bucket) → use earliest available
        return priceRows.length ? priceRows[0].price : null;
      };

      // Strict variant for FUTURE buckets: only accept a price that actually
      // covers the slot (recorded at/just before its start). Prevents the spot
      // line from flat-lining past the published day-ahead window.
      const priceForSlot = (slotStart, slotEnd) => {
        const realMid = (slotStart.getTime() + slotEnd.getTime()) / 2 - offsetMs;
        const notBefore = slotStart.getTime() - offsetMs - 30 * 60 * 1000;
        let best = null;
        for (const p of priceRows) {
          const t = new Date(p.timestamp).getTime();
          if (t <= realMid && t >= notBefore && (best === null || t > best.t)) best = { t, price: p.price };
        }
        return best ? best.price : null;
      };

      // Build result: one entry per slot, all rooms as flat keys
      const result = [];
      for (const slotStart of slots) {
        const slotEnd = addUnit(slotStart);
        const bucket = allRawData.filter((row) => {
          const t = local(new Date(row.timestamp));
          return t >= slotStart && t < slotEnd;
        });

        const entry = {
          label: slotLabel(slotStart),
          timestamp: new Date(slotStart.getTime() - offsetMs).toISOString(),
        };

        // Future slot → keep the axis label but return null data so the
        // chart lines end at the current time instead of extending forward.
        // Spot prices are published day-ahead, so they ARE known for future
        // buckets — the spot line spans the whole day/period.
        if (slotStart.getTime() > lastWithDataSlot.getTime()) {
          entry.totalEnergy = null;
          entry.totalCost = null;
          const futurePrice = priceForSlot(slotStart, slotEnd);
          entry.spotPrice = futurePrice != null
            ? Math.round(parseFloat(futurePrice) * 10000) / 10000
            : null;
          for (const room of rooms) {
            entry[`room_${room.id}`] = null;
            entry[`roomCost_${room.id}`] = null;
          }
          result.push(entry);
          continue;
        }

        // Per-room energy
        let totalEnergy = 0;
        for (const room of rooms) {
          const roomRows = bucket.filter((r) => r.roomId === room.id);
          const energy = roomRows.reduce((sum, r) => sum + parseFloat(r.energy_consumption || 0), 0);
          entry[`room_${room.id}`] = Math.round(energy * 1000) / 1000;
          totalEnergy += energy;
        }

        // Spot price: prefer a value recorded in the bucket, else the latest
        // published price at/before the bucket midpoint (real UTC instant).
        let avgSpotPrice = 0;
        const rowWithPrice = bucket.find((r) => r.spot_price != null);
        if (rowWithPrice) {
          avgSpotPrice = parseFloat(rowWithPrice.spot_price);
        } else {
          const midPoint = new Date((slotStart.getTime() + slotEnd.getTime()) / 2);
          const price = priceAt(midPoint.getTime() - offsetMs);
          if (price != null) avgSpotPrice = parseFloat(price);
        }

        const effectivePrice = contract
          ? this.calculateEffectivePrice(contract, avgSpotPrice)
          : avgSpotPrice;

        entry.totalEnergy = Math.round(totalEnergy * 1000) / 1000;
        entry.totalCost = Math.round(totalEnergy * effectivePrice * 100) / 100;
        entry.spotPrice = Math.round(avgSpotPrice * 10000) / 10000;

        // Per-room cost at this bucket's effective price (used by the tooltip)
        for (const room of rooms) {
          const roomEnergy = entry[`room_${room.id}`] || 0;
          entry[`roomCost_${room.id}`] = Math.round(roomEnergy * effectivePrice * 100) / 100;
        }

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
