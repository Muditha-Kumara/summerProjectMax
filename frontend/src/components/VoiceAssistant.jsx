import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

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
  const voiceSpeedRef = useRef(voiceSpeed);
  const selectedVoiceRef = useRef(selectedVoice);

  // Keep refs in sync with state so speak() always uses latest values
  useEffect(() => { voiceSpeedRef.current = voiceSpeed; }, [voiceSpeed]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

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

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      synthRef.current?.cancel();
    };
  }, []);

  const speak = (text) => {
    if (!synthRef.current || !text) return;

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
      // Always read from refs to get the latest values
      utterance.rate = voiceSpeedRef.current;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        // Ignore 'canceled' and 'interrupted' errors — they are expected
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('Speech error:', e.error);
        }
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    }, 50);
  };

  const testVoice = () => {
    const testText = i18n.language === 'fi' 
      ? 'Tämä on testiääni.' 
      : i18n.language === 'sv' 
      ? 'Detta är ett testljud.'
      : 'This is a test voice.';
    speak(testText);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse(t('voice.notSupported') || 'Speech recognition not supported');
      setShowPanel(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'fi' ? 'fi-FI' : i18n.language === 'sv' ? 'sv-SE' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setShowPanel(true);
      setTranscript('');
      setResponse('');
    };

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      await processVoiceCommand(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setResponse(t('voice.couldNotUnderstand') || 'Could not understand');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const processVoiceCommand = async (text) => {
    try {
      // Add user message to history
      const newHistory = [...conversationHistory, { role: 'user', content: text }];
      
      // Send to AI backend with longer timeout for voice chat
      const apiResponse = await api.post('/ai/chat', {
        message: text,
        language: i18n.language,
        history: newHistory.slice(-6) // Keep last 6 messages
      }, {
        timeout: 30000 // 30 second timeout for AI responses
      });

      if (apiResponse.data.success) {
        const aiText = apiResponse.data.text;
        const action = apiResponse.data.action;

        // Update conversation history first
        const updatedHistory = [...newHistory, { role: 'assistant', content: aiText }];
        setConversationHistory(updatedHistory);
        setResponse(aiText);

        // Execute action if present (before speaking to avoid delays)
        if (action) {
          await executeAction(action);
        }

        // Speak the response last to avoid double-speaking
        speak(aiText);
      } else {
        // Show the actual error message from the API
        const errorMsg = apiResponse.data.message || 'AI service unavailable';
        setResponse(errorMsg);
        speak(errorMsg);
      }
    } catch (error) {
      console.error('Voice command failed:', error);
      
      // Extract and show the actual error message
      let errorMessage = 'Failed to process command';
      
      if (error.response) {
        // Server responded with an error
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (error.code === 'ECONNABORTED') {
        // Timeout
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setResponse(errorMessage);
      speak(errorMessage);
    }
  };

  const executeAction = async (action) => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      
      if (action.type === 'setTemperature' && action.roomId && action.temperature) {
        await api.put(`/rooms/${action.roomId}/temperature`, { targetTemp: action.temperature });
        if (onRoomUpdate) onRoomUpdate();
      } else if (action.type === 'setMode' && action.mode) {
        await api.post(`/optimization/quick-mode/${action.mode}`);
        if (onModeChange) onModeChange(action.mode);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      startListening();
    }
  };

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