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

## How to Respond
IMPORTANT: Always respond with valid JSON in this exact format:
{
  "text": "Your spoken response here (1-2 sentences max)",
  "action": { "type": "setTemperature", "roomId": 4, "temperature": 23 }
}

The "action" field is OPTIONAL - only include it when the user wants to change something.

### Action Types:
1. Set temperature: { "type": "setTemperature", "roomId": <id>, "temperature": <number> }
2. Set mode: { "type": "setMode", "mode": "home" | "eco" | "comfort" }
3. Set away with duration: { "type": "setAwayMode", "durationHours": <number> }

## Room IDs
${rooms.map(r => `- ${r.name}: id ${r.id}`).join('\n')}

## Examples:
- User: "What's the temperature?" → {"text": "The living room is 21°C and the bedroom is 19°C."}
- User: "Set living room to 23 degrees" → {"text": "Setting the living room to 23 degrees.", "action": {"type": "setTemperature", "roomId": 4, "temperature": 23}}
- User: "I'm going out for 2 hours" → {"text": "Activating away mode for 2 hours. I'll restore the temperature when you return.", "action": {"type": "setAwayMode", "durationHours": 2}}
- User: "I'm leaving for 3 hours" → {"text": "Setting away mode for 3 hours. See you soon!", "action": {"type": "setAwayMode", "durationHours": 3}}
- User: "Make it warmer" → {"text": "I'll set the living room to 23 degrees.", "action": {"type": "setTemperature", "roomId": 4, "temperature": 23}}

## Rules:
- Keep responses SHORT (1-2 sentences) - this is voice, not chat
- Always respond with valid JSON
- Only include "action" when the user wants to change something
- Use ONLY the room data provided above - never make up temperatures
- If unsure which room, ask for clarification
- NEVER set a temperature outside the allowed range for a room
- If the user says "set it" without specifying which room, ask for clarification
- If the requested temperature is outside the allowed range, explain the valid range and ask for a new value
- When user mentions going out/away/leaving with a duration, use "setAwayMode" action with durationHours
- If user says "I'm leaving" without duration, ask how long they'll be gone
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
      
      // Return as plain text
      return {
        text: aiResponse,
        action: null,
      };
    }
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
      
      // Parse the response to extract text and action
      const parsed = this.parseResponse(rawReply);

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
