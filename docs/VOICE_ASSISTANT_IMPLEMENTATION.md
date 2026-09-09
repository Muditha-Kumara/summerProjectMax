# Voice Assistant Implementation

## Overview
Implemented a natural voice chat interface with AI assistance for the guest dashboard at `https://192.168.1.101:5173/dashboard`.

## Features Implemented

### 1. **Natural Voice Conversation**
- Speech-to-text using Web Speech API
- Text-to-speech for AI responses
- Conversational AI powered by backend AI service
- Multi-language support (Finnish, Swedish, English)

### 2. **Voice Settings Panel**
- **Voice Speed Control**: Adjustable from 0.5x to 2.0x speed
- **Voice Selection**: Choose from available system voices
- **Test Voice Button**: Test the selected voice and speed
- **Clear Chat**: Reset conversation history
- Settings persist in localStorage

### 3. **AI Integration**
- Connects to backend `/api/v1/ai/chat` endpoint
- Maintains conversation history (last 6 messages)
- Executes actions returned by AI (set temperature, change mode)
- Real-time room data and weather context

### 4. **Visual Feedback**
- 🎤 Blue button: Ready to listen
- 🔴 Red button: Currently listening
- 🔊 Green button: AI is speaking
- Animated indicators for listening and speaking states
- Transcript display showing what user said
- Response display showing AI's reply

### 5. **Action Execution**
The AI can control the system via voice commands:
- Set room temperatures: "Set living room to 23 degrees"
- Change modes: "I'm leaving" → activates away mode
- Get information: "What's the temperature?"

## Files Modified

### Frontend Components
1. **`frontend/src/components/VoiceAssistant.jsx`**
   - Complete rewrite with AI integration
   - Added TTS with speech synthesis
   - Added settings panel with speed/voice controls
   - Added conversation history management

2. **`frontend/src/components/guest/VoiceAssistant.jsx`**
   - Updated to match main VoiceAssistant functionality
   - Same features as above

3. **`frontend/src/pages/guest/GuestDashboard.jsx`**
   - Passes `rooms`, `onRoomUpdate`, and `onModeChange` props to VoiceAssistant
   - Enables AI to control rooms and modes

4. **`frontend/src/i18n/translations.js`**
   - Added voice-related translations for all 3 languages:
     - `voice.notSupported`
     - `voice.couldNotUnderstand`
     - `voice.error`
     - `voice.youSaid`
     - `voice.speaking`
     - `voice.tapMic`
     - `voice.voiceSpeed`
     - `voice.selectVoice`
     - `voice.testVoice`
     - `voice.clearChat`
     - `actions.voiceAssistant`
     - `actions.listening`

## How to Use

### Basic Conversation
1. Click the microphone button (🎤) on the dashboard
2. Speak your command or question
3. AI will respond with text and voice
4. Continue the conversation naturally

### Adjusting Voice Settings
1. Click the microphone button to open the panel
2. Click the settings icon (⚙️)
3. Adjust voice speed slider (0.5x - 2.0x)
4. Select a different voice from the dropdown
5. Click "🔊 Test Voice" to hear the settings
6. Settings are saved automatically

### Example Voice Commands
- "What's the temperature in the living room?"
- "Set the bedroom to 22 degrees"
- "I'm leaving for a while"
- "What's the weather like?"
- "Turn on eco mode"

## Technical Details

### Speech Recognition
- Uses `webkitSpeechRecognition` or `SpeechRecognition` API
- Language automatically matches UI language
- Continuous mode disabled (single utterance)

### Speech Synthesis
- Uses `SpeechSynthesis` API
- Configurable rate (0.5 - 2.0)
- Voice selection from available system voices
- Automatic language matching

### AI Backend
- Endpoint: `POST /api/v1/ai/chat`
- Request body:
  ```json
  {
    "message": "user text",
    "language": "en|fi|sv",
    "history": [...]
  }
  ```
- Response includes:
  - `text`: Spoken response
  - `action`: Optional action to execute

### Action Execution
AI can return actions like:
```json
{
  "type": "setTemperature",
  "roomId": 1,
  "temperature": 23
}
```
or
```json
{
  "type": "setMode",
  "mode": "away"
}
```

## Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Speech recognition may require extension
- Safari: Partial support

## Future Enhancements
- Wake word detection ("Hey Cottage")
- Continuous listening mode
- Voice feedback for errors
- More natural voice synthesis (cloud TTS)
- Voice commands for bookings and schedules
