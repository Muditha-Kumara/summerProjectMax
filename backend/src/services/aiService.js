import SystemSettings from '../models/SystemSettings.js';
import Room from '../models/Room.js';
import WeatherService from './weatherService.js';
import logger from '../utils/logger.js';

const DEFAULT_AI_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

class AIService {
  /**
   * Get the AI API key from admin settings (DB) or environment
   */
  static async getApiKey() {
    let key = await SystemSettings.get('openai_api_key');
    if (!key) {
      key = process.env.OPENAI_API_KEY || '';
    }
    return key;
  }

  /**
   * Get the AI model from admin settings or default
   */
  static async getModel() {
    let model = await SystemSettings.get('ai_model');
    if (!model) {
      model = process.env.AI_MODEL || 'qwen-turbo';
    }
    return model;
  }

  /**
   * Get the AI API endpoint from admin settings or default
   */
  static async getEndpoint() {
    let endpoint = await SystemSettings.get('ai_endpoint');
    if (!endpoint) {
      endpoint = process.env.AI_ENDPOINT || DEFAULT_AI_ENDPOINT;
    }
    return endpoint;
  }

  /**
   * Build system prompt with real room data and control capabilities
   */
  static async buildSystemPrompt(language = 'en') {
    const rooms = await Room.findAll();
    const weather = await WeatherService.getCurrentWeather();

    const roomSummary = rooms
      .map(
        (r) =>
          `- ${r.name} (id: ${r.id}): current ${r.current_temp ?? '?'}°C, target ${r.target_temp ?? '?'}°C, mode: ${r.control_mode ?? 'auto'}, allowed range: ${r.min_temp ?? '?'}-${r.max_temp ?? '?'}°C`
      )
      .join('\n');

    const weatherInfo = weather.success
      ? `Outdoor: ${weather.data.temperature}°C, ${weather.data.description}, wind ${weather.data.windSpeed} m/s`
      : 'Weather data unavailable';

    const langInstructions = {
      fi: 'Vastaa suomeksi. Ole ystävällinen ja auttava. Pidä vastaukset lyhyinä.',
      sv: 'Svara på svenska. Var vänlig och hjälpsam. Håll svaren korta.',
      en: 'Respond in English. Be friendly and helpful. Keep responses short.',
    };

    return `You are a friendly voice assistant for a smart summer cottage heating system in Finland.

${langInstructions[language] || langInstructions.en}

## Current Room Data
${roomSummary}

## Current Weather
${weatherInfo}

## What You Can Do
- Report current temperatures in any room
- Set specific temperatures for rooms
- Change heating modes (home, away, eco, comfort)
- Set temporary away mode with duration (e.g., "I'm going out for 2 hours")
- Give weather-based recommendations
- Answer questions about the cottage heating system

## CRITICAL: Response Format
YOU MUST ALWAYS RESPOND WITH VALID JSON. NO EXCEPTIONS.
Your entire response must be a single JSON object. Do not include any text outside the JSON.

Required format:
{
  "text": "Your spoken response here (1-2 sentences max)",
  "action": null
}

The "action" field is REQUIRED - set it to null for questions, or include an action object for commands.

### Action Types:
1. Set temperature: { "type": "setTemperature", "roomId": <number>, "temperature": <number> }
2. Set mode: { "type": "setMode", "mode": "home" | "eco" | "comfort" | "away" }
3. Set away with duration: { "type": "setAwayMode", "durationHours": <number> }

## Room IDs
${rooms.map(r => `- ${r.name}: id ${r.id}`).join('\n')}

## Examples (YOU MUST FOLLOW THIS EXACT FORMAT):
- User: "What's the temperature?"
  → {"text": "The living room is 21°C and the bedroom is 19°C.", "action": null}

- User: "Set living room to 23 degrees"
  → {"text": "Setting the living room to 23 degrees.", "action": {"type": "setTemperature", "roomId": 4, "temperature": 23}}

- User: "Change to home mode"
  → {"text": "I've set the system to home mode.", "action": {"type": "setMode", "mode": "home"}}

- User: "Deactivate eco mode"
  → {"text": "I've deactivated eco mode and set it to home mode.", "action": {"type": "setMode", "mode": "home"}}

- User: "Which mode did you set?"
  → {"text": "I set the system to home mode.", "action": null}

- User: "I'm going out for 2 hours"
  → {"text": "Activating away mode for 2 hours.", "action": {"type": "setAwayMode", "durationHours": 2}}

- User: "I'm leaving for 3 hours"
  → {"text": "Setting away mode for 3 hours. See you soon!", "action": {"type": "setAwayMode", "durationHours": 3}}

- User: "Make it warmer"
  → {"text": "I'll set the living room to 23 degrees.", "action": {"type": "setTemperature", "roomId": 4, "temperature": 23}}

## Rules:
- Keep responses SHORT (1-2 sentences) - this is voice, not chat
- ALWAYS respond with valid JSON - no exceptions, no plain text
- ALWAYS include both "text" and "action" fields in your JSON response
- Set "action" to null for questions, include action object for commands
- Use ONLY the room data provided above - never make up temperatures
- If unsure which room, ask for clarification and set action to null
- NEVER set a temperature outside the allowed range for a room
- When user mentions going out/away/leaving with a duration, use "setAwayMode" action
- If user says "I'm leaving" without duration, ask how long and set action to null
`;
  }

  /**
   * Parse AI response to extract text and action
   */
  static parseResponse(aiResponse) {
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      
      // Remove ```json and ``` markers
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to parse as JSON first
      const parsed = JSON.parse(cleanResponse);
      return {
        text: parsed.text || aiResponse,
        action: parsed.action || null,
      };
    } catch {
      // If not JSON, try to extract JSON from markdown code blocks
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return {
            text: parsed.text || aiResponse.replace(jsonMatch[0], '').trim(),
            action: parsed.action || null,
          };
        } catch {
          // Fall through to plain text
        }
      }
      
      // Try to find JSON object in the response
      const jsonObjectMatch = aiResponse.match(/\{[\s\S]*"text"[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          const parsed = JSON.parse(jsonObjectMatch[0]);
          return {
            text: parsed.text || aiResponse,
            action: parsed.action || null,
          };
        } catch {
          // Fall through to plain text
        }
      }
      
      // FALLBACK: Detect intent from plain text when AI doesn't return JSON
      const fallbackAction = this.detectIntentFromText(aiResponse);
      
      if (fallbackAction) {
        logger.warn('AI returned plain text, using fallback intent detection', { 
          text: aiResponse.substring(0, 100), 
          detectedAction: fallbackAction 
        });
      }
      
      return {
        text: aiResponse,
        action: fallbackAction,
      };
    }
  }

  /**
   * Fallback intent detection when AI doesn't return proper JSON
   * Detects mode changes and other actions from plain text responses
   */
  static detectIntentFromText(text) {
    const normalized = text.toLowerCase();
    
    // Mode detection - look for phrases indicating mode changes
    if (normalized.includes('set to home mode') || 
        normalized.includes('set the system to home') || 
        normalized.includes('changed to home mode') ||
        normalized.includes('switched to home mode') ||
        (normalized.includes('home mode') && (normalized.includes('set') || normalized.includes('change')))) {
      return { type: 'setMode', mode: 'home' };
    }
    
    if (normalized.includes('set to eco mode') || 
        normalized.includes('set the system to eco') || 
        normalized.includes('changed to eco mode') ||
        normalized.includes('switched to eco mode') ||
        normalized.includes('activat') && normalized.includes('eco mode') ||
        (normalized.includes('eco mode') && (normalized.includes('set') || normalized.includes('change')))) {
      return { type: 'setMode', mode: 'eco' };
    }
    
    if (normalized.includes('set to comfort mode') || 
        normalized.includes('set the system to comfort') || 
        normalized.includes('changed to comfort mode') ||
        normalized.includes('switched to comfort mode') ||
        (normalized.includes('comfort mode') && (normalized.includes('set') || normalized.includes('change')))) {
      return { type: 'setMode', mode: 'comfort' };
    }
    
    if (normalized.includes('set to away mode') || 
        normalized.includes('set the system to away') || 
        normalized.includes('changed to away mode') ||
        normalized.includes('switched to away mode') ||
        (normalized.includes('away mode') && (normalized.includes('set') || normalized.includes('change')))) {
      return { type: 'setMode', mode: 'away' };
    }
    
    // Deactivation patterns - map to home mode
    if (normalized.includes('deactivat') && normalized.includes('eco') ||
        normalized.includes('turn off') && normalized.includes('eco') ||
        normalized.includes('disable') && normalized.includes('eco')) {
      return { type: 'setMode', mode: 'home' };
    }
    
    return null;
  }

  /**
   * Send a chat message to AI via OpenAI-compatible API
   */
  static async chat(userMessage, language = 'en', conversationHistory = []) {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();
    const endpoint = await this.getEndpoint();

    if (!apiKey) {
      return {
        success: false,
        message: 'AI API key not configured. Please set it in Admin Settings.',
      };
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(language);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error('AI API error', { status: response.status, body: err });
        return {
          success: false,
          message: 'AI service temporarily unavailable.',
        };
      }

      const data = await response.json();
      const rawReply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      // Log raw response for debugging
      logger.info('AI raw response', { rawReply: rawReply.substring(0, 300) });
      
      // Parse the response to extract text and action
      const parsed = this.parseResponse(rawReply);
      
      // Log parsed result
      logger.info('AI parsed response', { 
        text: parsed.text.substring(0, 100), 
        hasAction: !!parsed.action, 
        action: parsed.action 
      });

      return {
        success: true,
        text: parsed.text,
        action: parsed.action,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      logger.error('AI chat error', error);
      return {
        success: false,
        message: 'Failed to connect to AI service.',
      };
    }
  }
}

export default AIService;
