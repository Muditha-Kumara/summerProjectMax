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
          `- ${r.name} (id: ${r.id}): current ${r.current_temp ?? '?'}°C, target ${r.target_temp ?? '?'}°C, mode: ${r.control_mode ?? 'auto'}`
      )
      .join('\n');

    const weatherInfo = weather.success
      ? `Outdoor: ${weather.data.temperature}°C, ${weather.data.description}, wind ${weather.data.windSpeed} m/s`
      : 'Weather data unavailable';

    const langInstructions = {
      fi: 'Vastaa suomeksi. Ole ystävällinen ja auttava.',
      sv: 'Svara på svenska. Var vänlig och hjälpsam.',
      en: 'Respond in English. Be friendly and helpful.',
    };

    return `You are a friendly voice assistant for a smart summer cottage heating system in Finland.

## Context
- This is a voice interface — keep responses SHORT (1-2 sentences max)
- Speak naturally, as if talking to a guest at the cottage
- The user may speak Finnish, Swedish, or English — respond in the SAME language they use

## Current Room Data
${roomSummary}

## Current Weather
${weatherInfo}

## What You Can Do
- Report current temperatures in any room
- Suggest temperature adjustments
- Control room temperatures (set specific temperatures)
- Change heating modes (home, away, eco, comfort)
- Explain heating modes and their effects
- Give weather-based recommendations
- Answer questions about the cottage heating system

## Available Actions
When the user wants to control something, include an "action" in your response using this JSON format:

### Set Temperature
\`\`\`json
{
  "text": "Setting the living room to 23 degrees.",
  "action": {
    "type": "setTemperature",
    "roomId": 4,
    "temperature": 23
  }
}
\`\`\`

### Set Mode
\`\`\`json
{
  "text": "Activating away mode. Temperatures will be reduced.",
  "action": {
    "type": "setMode",
    "mode": "away"
  }
}
\`\`\`

### Available Modes
- "home" - Normal comfort temperatures
- "away" - Reduced temperatures for when nobody is home
- "eco" - Energy saving mode
- "comfort" - Maximum comfort mode

## Room ID Reference
${rooms.map(r => `- ${r.name}: id ${r.id}`).join('\n')}

## Rules
- Keep responses SHORT (1-2 sentences) — this is voice, not chat
- If the user asks to change something, confirm the action in your text
- Always include the action JSON when the user wants to control something
- Do not make up temperature values — use ONLY the data provided above
- If unsure which room, ask for clarification
- Never execute actions without confirming in your text response

## Response Format
Always respond with JSON containing "text" and optional "action":
\`\`\`json
{
  "text": "Your spoken response here.",
  "action": { ... } // optional
}
\`\`\`

Example responses:
- User: "What's the temperature?" → {"text": "The living room is 21°C and the bedroom is 19°C."}
- User: "Set living room to 23" → {"text": "Setting the living room to 23 degrees.", "action": {"type": "setTemperature", "roomId": 4, "temperature": 23}}
- User: "I'm leaving" → {"text": "Activating away mode. See you soon!", "action": {"type": "setMode", "mode": "away"}}
`;
  }

  /**
   * Parse AI response to extract text and action
   */
  static parseResponse(aiResponse) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
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
