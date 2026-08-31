import ElectricityContract from '../models/ElectricityContract.js';
import SpotPrice from '../models/SpotPrice.js';
import logger from '../utils/logger.js';

class ContractService {
  /**
   * Get current active contract
   */
  async getCurrentContract() {
    try {
      const contract = await ElectricityContract.findActive();
      return contract;
    } catch (error) {
      logger.error('Error fetching current contract:', error);
      return null;
    }
  }

  /**
   * Calculate effective price based on contract type
   * @param {string} contractType - 'fixed', 'spot', or 'tiered'
   * @param {number} spotPrice - Current spot price in EUR/kWh
   * @param {Object} contract - Contract details
   * @returns {number} Effective price in EUR/kWh
   */
  calculateEffectivePrice(contractType, spotPrice, contract) {
    switch (contractType) {
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
   * Get price history with contract applied
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Price history with effective prices
   */
  async getPriceHistory(startDate, endDate) {
    try {
      const contract = await this.getCurrentContract();
      const spotPrices = await SpotPrice.findByDateRange(startDate, endDate);

      if (!contract) {
        // No contract, return spot prices as-is
        return spotPrices.map(sp => ({
          timestamp: sp.timestamp,
          spot_price: sp.price,
          effective_price: sp.price,
          contract_type: 'none'
        }));
      }

      return spotPrices.map(sp => ({
        timestamp: sp.timestamp,
        spot_price: sp.price,
        effective_price: this.calculateEffectivePrice(contract.type, sp.price, contract),
        contract_type: contract.type,
        contract_name: contract.name
      }));
    } catch (error) {
      logger.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Create or update contract
   */
  async saveContract(contractData) {
    try {
      // If setting as active, deactivate others
      if (contractData.is_active) {
        await ElectricityContract.deactivateAll();
      }

      if (contractData.id) {
        return await ElectricityContract.update(contractData.id, contractData);
      } else {
        return await ElectricityContract.create(contractData);
      }
    } catch (error) {
      logger.error('Error saving contract:', error);
      throw error;
    }
  }

  /**
   * Get all contracts
   */
  async getAllContracts() {
    try {
      return await ElectricityContract.findAll();
    } catch (error) {
      logger.error('Error fetching contracts:', error);
      return [];
    }
  }

  /**
   * Delete contract
   */
  async deleteContract(id) {
    try {
      return await ElectricityContract.delete(id);
    } catch (error) {
      logger.error('Error deleting contract:', error);
      throw error;
    }
  }
}

export default new ContractService();
