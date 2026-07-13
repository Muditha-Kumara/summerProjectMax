import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

// Voice assistant states: IDLE -> LISTENING -> PROCESSING -> SPEAKING -> COOLDOWN -> IDLE
const VA_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  COOLDOWN: 'cooldown',
};

const COOLDOWN_MS = 3000; // Time after speech ends before mic can listen again (3 seconds to prevent feedback)

const VoiceAssistant = ({ rooms, onRoomUpdate, onModeChange }) => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const speechTimeoutRef = useRef(null);
  const cooldownTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null); // Wait for silence before processing
  const waitingForSilenceRef = useRef(false); // Track if we're waiting for silence timeout
  const voiceSpeedRef = useRef(voiceSpeed);
  const selectedVoiceRef = useRef(selectedVoice);
  const vaStateRef = useRef(VA_STATE.IDLE);
  const lastSpokenTextRef = useRef('');
  const currentTranscriptRef = useRef('');
  const conversationHistoryRef = useRef([]);
  const lastAIResponseRef = useRef(''); // Track last AI response to filter feedback
  const speechActiveRef = useRef(false); // CRITICAL: Block recognition during speech

  // Keep refs in sync with state so speak() always uses latest values
  useEffect(() => { voiceSpeedRef.current = voiceSpeed; }, [voiceSpeed]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { conversationHistoryRef.current = conversationHistory; }, [conversationHistory]);

  // Helper function to check if transcript is likely feedback from AI speech
  const isLikelyFeedback = useCallback((transcript, lastResponse) => {
    if (!lastResponse || !transcript) return false;
    
    const normalizedTranscript = transcript.toLowerCase().trim();
    const normalizedResponse = lastResponse.toLowerCase().trim();
    
    // Check if transcript is a substring of the last AI response
    if (normalizedResponse.includes(normalizedTranscript)) {
      console.log('[VoiceAssistant] 🔄 Detected feedback loop - transcript matches AI response');
      return true;
    }
    
    // Check if transcript contains significant portions of AI response
    const words = normalizedTranscript.split(/\s+/);
    const responseWords = normalizedResponse.split(/\s+/);
    let matchCount = 0;
    
    for (const word of words) {
      if (word.length > 3 && responseWords.includes(word)) {
        matchCount++;
      }
    }
    
    // If more than 60% of words match, likely feedback
    if (words.length > 0 && matchCount / words.length > 0.6) {
      console.log('[VoiceAssistant] 🔄 Detected feedback loop - high word overlap');
      return true;
    }
    
    return false;
  }, []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (!voices || voices.length === 0) return;
      setAvailableVoices(voices);

      // Load saved voice preference
      const savedVoiceName = localStorage.getItem('selectedVoice');
      const savedSpeed = localStorage.getItem('voiceSpeed');

      if (savedSpeed) {
        const parsed = parseFloat(savedSpeed);
        if (!isNaN(parsed)) setVoiceSpeed(parsed);
      }

      // Resolve voice: saved > language match > first available
      let resolvedVoice = null;
      if (savedVoiceName) {
        resolvedVoice = voices.find(v => v.name === savedVoiceName);
      }
      if (!resolvedVoice) {
        const lang = i18n.language === 'fi' ? 'fi-FI' : i18n.language === 'sv' ? 'sv-SE' : 'en-US';
        resolvedVoice = voices.find(v => v.lang === lang) || voices[0];
      }
      if (resolvedVoice) {
        setSelectedVoice(resolvedVoice);
      }
    };

    loadVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }

    return () => {
      synthRef.current.onvoiceschanged = null;
    };
  }, [i18n.language]);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('voiceSpeed', voiceSpeed.toString());
  }, [voiceSpeed]);

  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('selectedVoice', selectedVoice.name);
    }
  }, [selectedVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const speak = useCallback((text) => {
    if (!synthRef.current || !text) return;

    // Prevent duplicate speech: skip if same text was just spoken
    if (text === lastSpokenTextRef.current) {
      console.log('[VoiceAssistant] Skipping duplicate speech:', text);
      return;
    }

    console.log('[VoiceAssistant] 🗣️ Speaking:', text);
    lastSpokenTextRef.current = text;
    
    // CRITICAL: Set speech active flag to block all recognition
    speechActiveRef.current = true;
    
    // CRITICAL: Immediately abort any active recognition to prevent feedback
    if (recognitionRef.current) {
      console.log('[VoiceAssistant] 🛑 Aborting recognition to prevent feedback');
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.log('[VoiceAssistant] Recognition abort error (expected):', e.message);
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
    
    // Set state to SPEAKING immediately to block any new recognition
    vaStateRef.current = VA_STATE.SPEAKING;

    // Clear any pending speech to prevent double-speaking
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // Cancel any ongoing speech immediately
    synthRef.current.cancel();

    // Use a short delay to let cancel() fully process, then speak
    speechTimeoutRef.current = setTimeout(() => {
      speechTimeoutRef.current = null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSpeedRef.current;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      utterance.onstart = () => {
        console.log('[VoiceAssistant] Speech started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('[VoiceAssistant] Speech ended');
        setIsSpeaking(false);
        // Enter cooldown period to prevent feedback loop
        vaStateRef.current = VA_STATE.COOLDOWN;
        console.log('[VoiceAssistant] ⏳ Entering cooldown period...');
        cooldownTimeoutRef.current = setTimeout(() => {
          cooldownTimeoutRef.current = null;
          vaStateRef.current = VA_STATE.IDLE;
          // CRITICAL: Clear speech active flag after cooldown
          speechActiveRef.current = false;
          console.log('[VoiceAssistant] ✅ Cooldown complete, ready for next command');
        }, COOLDOWN_MS);
      };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('[VoiceAssistant] Speech error:', e.error);
        }
        setIsSpeaking(false);
        vaStateRef.current = VA_STATE.COOLDOWN;
        cooldownTimeoutRef.current = setTimeout(() => {
          cooldownTimeoutRef.current = null;
          vaStateRef.current = VA_STATE.IDLE;
          // CRITICAL: Clear speech active flag after cooldown
          speechActiveRef.current = false;
        }, COOLDOWN_MS);
      };

      synthRef.current.speak(utterance);
    }, 50);
  }, []);

  const testVoice = () => {
    const testText = i18n.language === 'fi' 
      ? 'Tämä on testiääni.' 
      : i18n.language === 'sv' 
      ? 'Detta är ett testljud.'
      : 'This is a test voice.';
    speak(testText);
  };

  const startListening = useCallback(() => {
    // Only allow listening when in IDLE state
    if (vaStateRef.current !== VA_STATE.IDLE) {
      console.log('[VoiceAssistant] Cannot listen: current state is', vaStateRef.current);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse(t('voice.notSupported') || 'Speech recognition not supported');
      setShowPanel(true);
      return;
    }

    // Cancel any ongoing speech before listening
    synthRef.current.cancel();

    console.log('[VoiceAssistant] 🎤 Starting to listen...');
    vaStateRef.current = VA_STATE.LISTENING;
    
    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'fi' ? 'fi-FI' : i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    recognition.continuous = true; // Keep listening until user stops speaking
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[VoiceAssistant] Listening started');
      setIsListening(true);
      setShowPanel(true);
      setTranscript('');
      setResponse('');
      currentTranscriptRef.current = '';
      
      // Set maximum listening time (10 seconds) to prevent infinite listening
      silenceTimeoutRef.current = setTimeout(() => {
        console.log('[VoiceAssistant] ⏱️ Max listening time reached, stopping');
        recognition.stop();
      }, 10000);
    };

    recognition.onresult = (event) => {
      // CRITICAL: Block all processing while speech is active
      if (speechActiveRef.current) {
        console.log('[VoiceAssistant] 🚫 Blocking recognition - speech is active');
        return;
      }
      
      // CRITICAL: Ignore results if we're not in LISTENING state
      if (vaStateRef.current !== VA_STATE.LISTENING) {
        console.log('[VoiceAssistant] Ignoring result - not in LISTENING state:', vaStateRef.current);
        return;
      }

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        // Accumulate final transcripts
        currentTranscriptRef.current += ' ' + finalTranscript;
        console.log('[VoiceAssistant] 👂 Final:', finalTranscript);
        setTranscript(currentTranscriptRef.current.trim());
        
        // Mark that we're waiting for silence timeout
        waitingForSilenceRef.current = true;
        
        // Reset silence timer - wait 2 seconds of silence before processing
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('[VoiceAssistant] ⏱️ Silence detected (2s), stopping recognition');
          waitingForSilenceRef.current = false;
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      } else if (interimTranscript) {
        // Show interim in UI for live feedback
        setTranscript(currentTranscriptRef.current.trim() + ' ' + interimTranscript);
        
        // Mark that we're waiting for silence timeout
        waitingForSilenceRef.current = true;
        
        // Reset silence timer on interim results too
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('[VoiceAssistant] ⏱️ Silence detected (2s), stopping recognition');
          waitingForSilenceRef.current = false;
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.error('[VoiceAssistant] Recognition error:', event.error);
      setIsListening(false);
      vaStateRef.current = VA_STATE.IDLE;
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setResponse(t('voice.couldNotUnderstand') || 'Could not understand');
      }
    };

    recognition.onend = async () => {
      console.log('[VoiceAssistant] Listening ended');
      setIsListening(false);
      
      // CRITICAL: If we're still waiting for silence timeout, don't process yet
      // This prevents processing when browser ends recognition on brief pauses
      if (waitingForSilenceRef.current) {
        console.log('[VoiceAssistant] ⏳ Waiting for silence timeout, not processing yet');
        // Don't clear the silence timeout - let it complete naturally
        return;
      }
      
      // Only clear silence timeout if we're NOT waiting for it
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // CRITICAL: Block processing if speech is active
      if (speechActiveRef.current) {
        console.log('[VoiceAssistant] 🚫 Blocking onend - speech is active');
        vaStateRef.current = VA_STATE.IDLE;
        return;
      }
      
      // CRITICAL: Only process if we're still in LISTENING state
      if (vaStateRef.current !== VA_STATE.LISTENING) {
        console.log('[VoiceAssistant] Ignoring onend - state is:', vaStateRef.current);
        return;
      }
      
      const finalText = currentTranscriptRef.current.trim();
      
      // CRITICAL: Only process if we have a meaningful transcript
      // Require at least 3 words OR 15 characters to avoid processing partial speech
      const wordCount = finalText.split(/\s+/).filter(w => w.length > 0).length;
      if (!finalText || wordCount < 3 || finalText.length < 15) {
        console.log('[VoiceAssistant] Transcript too short, restarting recognition:', finalText, `(words: ${wordCount}, chars: ${finalText.length})`);
        
        // AUTO-RESTART: If transcript is too short, restart recognition to keep listening
        // This handles the case where browser ends recognition on brief pauses
        if (vaStateRef.current === VA_STATE.LISTENING && !speechActiveRef.current) {
          try {
            console.log('[VoiceAssistant] 🔄 Auto-restarting recognition to continue listening');
            recognition.start();
            setIsListening(true);
            return;
          } catch (err) {
            console.error('[VoiceAssistant] Failed to restart recognition:', err);
          }
        }
        
        vaStateRef.current = VA_STATE.IDLE;
        return;
      }
      
      // CRITICAL: Check if this is feedback from AI speech
      if (isLikelyFeedback(finalText, lastAIResponseRef.current)) {
        console.log('[VoiceAssistant] 🚫 Filtering out feedback in onend:', finalText);
        vaStateRef.current = VA_STATE.IDLE;
        return;
      }
      
      console.log('[VoiceAssistant] ✅ Valid transcript, processing:', finalText);
      vaStateRef.current = VA_STATE.PROCESSING;
      await processVoiceCommand(finalText);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [i18n.language, t]);

  const processVoiceCommand = useCallback(async (text) => {
    // Guard: only process if we're in PROCESSING state
    if (vaStateRef.current !== VA_STATE.PROCESSING) {
      console.log('[VoiceAssistant] Not in processing state, ignoring');
      return;
    }

    console.log('[VoiceAssistant] 🤖 Processing command:', text);

    try {
      // Add user message to history (use ref for latest value)
      const newHistory = [...conversationHistoryRef.current, { role: 'user', content: text }];
      
      console.log('[VoiceAssistant] 📤 Sending to AI backend...');
      
      const apiResponse = await api.post('/ai/chat', {
        message: text,
        language: i18n.language,
        history: newHistory.slice(-6)
      }, {
        timeout: 30000
      });

      if (apiResponse.data.success) {
        const aiText = apiResponse.data.text;
        const action = apiResponse.data.action;

        console.log('[VoiceAssistant] 📥 AI Response:', aiText);
        if (action) {
          console.log('[VoiceAssistant] 🎯 AI Action:', action);
        }

        // Store the AI response for feedback detection
        lastAIResponseRef.current = aiText;

        // Update conversation history
        const updatedHistory = [...newHistory, { role: 'assistant', content: aiText }];
        setConversationHistory(updatedHistory);
        setResponse(aiText);

        // Execute action if present
        if (action) {
          console.log('[VoiceAssistant] ⚡ Executing action...');
          await executeAction(action, aiText);
          console.log('[VoiceAssistant] ✅ Action completed');
        }

        // Speak the response
        speak(aiText);
      } else {
        const errorMsg = apiResponse.data.message || 'AI service unavailable';
        console.log('[VoiceAssistant] ❌ AI Error:', errorMsg);
        setResponse(errorMsg);
        speak(errorMsg);
      }
    } catch (error) {
      console.error('[VoiceAssistant] ❌ Voice command failed:', error);
      
      let errorMessage = 'Failed to process command';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('[VoiceAssistant] ❌ Error message:', errorMessage);
      setResponse(errorMessage);
      speak(errorMessage);
    } finally {
      console.log('[VoiceAssistant] 🏁 Processing complete');
      // State will be set by speak() -> SPEAKING -> COOLDOWN -> IDLE
      // If speak wasn't called (shouldn't happen), reset to idle
      if (vaStateRef.current === VA_STATE.PROCESSING) {
        vaStateRef.current = VA_STATE.IDLE;
      }
    }
  }, [i18n.language, speak]);

  const getRoomDisplayNames = (room) => [room?.name, room?.name_en, room?.name_fi, room?.name_sv].filter(Boolean);

  const normalizeText = (value) =>
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const isTemperatureAllowed = (room, temperature) => {
    if (!room || !Number.isFinite(temperature)) {
      return false;
    }

    const minTemp = Number(room.min_temp);
    const maxTemp = Number(room.max_temp);
    const criticalMinTemp = Number(room.critical_min_temp);

    if (Number.isFinite(minTemp) && temperature < minTemp) {
      return false;
    }

    if (Number.isFinite(maxTemp) && temperature > maxTemp) {
      return false;
    }

    if (room.is_critical && Number.isFinite(criticalMinTemp) && temperature < criticalMinTemp) {
      return false;
    }

    return true;
  };

  const findRoomByVoiceText = (voiceText, temperature) => {
    const normalizedVoiceText = normalizeText(voiceText);

    return rooms?.find((room) =>
      isTemperatureAllowed(room, temperature) &&
      getRoomDisplayNames(room).some((roomName) => normalizedVoiceText.includes(normalizeText(roomName)))
    ) || null;
  };

  const executeAction = async (action, voiceText = '') => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      
      if (action.type === 'setTemperature' && action.roomId != null && action.temperature != null) {
        const targetTemp = Number(action.temperature);
        const roomById = rooms?.find((room) => room.id === Number(action.roomId)) || null;
        const roomByVoiceText = findRoomByVoiceText(voiceText, targetTemp);
        const targetRoom = isTemperatureAllowed(roomById, targetTemp) ? roomById : roomByVoiceText || roomById;

        if (!targetRoom || !isTemperatureAllowed(targetRoom, targetTemp)) {
          console.warn('[VoiceAssistant] Skipping temperature action due to unresolved room or invalid temperature:', action);
          return;
        }

        await api.put(`/rooms/${targetRoom.id}/temperature`, { targetTemp });
        if (onRoomUpdate) onRoomUpdate();
      } else if (action.type === 'setMode' && action.mode) {
        await api.post(`/optimization/quick-mode/${action.mode}`);
        if (onModeChange) onModeChange(action.mode);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
    }
  };

  const toggleListening = useCallback(() => {
    // Only allow manual toggle when in IDLE state
    if (vaStateRef.current !== VA_STATE.IDLE) {
      console.log('[VoiceAssistant] Cannot toggle: current state is', vaStateRef.current);
      
      // If currently listening, allow stopping
      if (isListening && recognitionRef.current) {
        console.log('[VoiceAssistant] Stopping active recognition');
        recognitionRef.current.abort();
        recognitionRef.current = null;
        setIsListening(false);
        vaStateRef.current = VA_STATE.IDLE;
      }
      return;
    }
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
      vaStateRef.current = VA_STATE.IDLE;
    } else {
      startListening();
    }
  }, [isListening, startListening]);

  const clearConversation = () => {
    setConversationHistory([]);
    setTranscript('');
    setResponse('');
  };

  return (
    <>
      {/* Floating Mic Button */}
      <motion.button
        onClick={toggleListening}
        animate={isListening ? { scale: [1, 1.2, 1] } : {}}
        transition={isListening ? { repeat: Infinity, duration: 1 } : {}}
        className={`fixed bottom-6 right-6 w-20 h-20 rounded-full shadow-2xl flex items-center justify-center z-50 ${
          isListening ? 'bg-red-600' : isSpeaking ? 'bg-green-600' : 'bg-blue-600'
        } text-white`}
        aria-label={t('actions.voiceAssistant') || 'Voice Assistant'}
      >
        <span className="text-3xl">
          {isListening ? '🔴' : isSpeaking ? '🔊' : '🎤'}
        </span>
      </motion.button>

      {/* Voice Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="fixed bottom-32 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-96 bg-white rounded-3xl shadow-2xl p-6 z-40 border-4 border-blue-200"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                🎤 {t('actions.voiceAssistant') || 'Voice Assistant'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                  aria-label="Settings"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => {
                    setShowPanel(false);
                    setShowSettings(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('voice.voiceSpeed') || 'Voice Speed'}: {voiceSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('voice.selectVoice') || 'Select Voice'}
                  </label>
                  {availableVoices.length > 0 ? (
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        if (voice) setSelectedVoice(voice);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-100">
                      {t('voice.loadingVoices') || 'Loading voices...'}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={testVoice}
                    disabled={isSpeaking || availableVoices.length === 0}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSpeaking ? '🔊 Speaking...' : (t('voice.testVoice') || '🔊 Test Voice')}
                  </button>

                  <button
                    onClick={clearConversation}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    {t('voice.clearChat') || '🗑️ Clear Chat'}
                  </button>
                </div>
              </div>
            )}

            {/* Listening Indicator */}
            {isListening && (
              <div className="text-center py-6">
                <div className="text-5xl animate-pulse mb-3">🎙️</div>
                <p className="text-xl text-blue-600 font-semibold">
                  {t('actions.listening') || 'Listening...'}
                </p>
              </div>
            )}

            {/* Speaking Indicator */}
            {isSpeaking && (
              <div className="text-center py-4">
                <div className="text-4xl animate-pulse mb-2">🔊</div>
                <p className="text-lg text-green-600 font-semibold">
                  {t('voice.speaking') || 'Speaking...'}
                </p>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="bg-gray-100 rounded-xl p-4 mb-3">
                <p className="text-lg text-gray-500 mb-1">{t('voice.youSaid') || 'You said:'}</p>
                <p className="text-xl font-medium text-gray-800">"{transcript}"</p>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xl text-blue-800">{response}</p>
              </div>
            )}

            {/* Empty State */}
            {!isListening && !isSpeaking && !transcript && !response && !showSettings && (
              <p className="text-gray-500 text-center py-6 text-lg">
                {t('voice.tapMic') || 'Tap the microphone to start'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;