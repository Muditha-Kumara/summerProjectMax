import AIService from '../services/aiService.js';
import logger from '../utils/logger.js';

class AIController {
  /**
   * POST /api/v1/ai/chat
   * Body: { message: string, language?: string, history?: array }
   */
  static async chat(req, res) {
    try {
      const { message, language = 'en', history = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: 'Message is required' 
        });
      }

      if (message.length > 500) {
        return res.status(400).json({ 
          success: false,
          message: 'Message too long (max 500 chars)' 
        });
      }

      // Limit history to last 6 messages to keep context small
      const trimmedHistory = history.slice(-6);

      const result = await AIService.chat(message, language, trimmedHistory);

      if (!result.success) {
        return res.status(503).json(result);
      }

      return res.json(result);
    } catch (error) {
      logger.error('AI controller error', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
      });
    }
  }
}

export default AIController;
