import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceAssistant = () => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse('Voice recognition is not supported in this browser.');
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

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      processVoiceCommand(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setResponse('Sorry, I could not understand that.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (text) => {
    const lowerText = text.toLowerCase();
    
    // Simple command processing
    if (lowerText.includes('lämpötila') || lowerText.includes('temperature') || lowerText.includes('temperatur')) {
      setResponse('Current living room temperature is 21°C. Would you like to adjust it?');
    } else if (lowerText.includes('poissa') || lowerText.includes('away') || lowerText.includes('borta')) {
      setResponse('Activating away mode. Temperature will be reduced to 16°C.');
    } else if (lowerText.includes('kotona') || lowerText.includes('home') || lowerText.includes('hemma')) {
      setResponse('Activating home mode. Temperature set to 21°C.');
    } else if (lowerText.includes('apua') || lowerText.includes('help') || lowerText.includes('hjälp')) {
      setResponse('You can ask me to: change temperature, set modes like home or away, or check the weather.');
    } else {
      setResponse(`I heard: "${text}". You can ask about temperature, modes, or weather.`);
    }
  };

  return (
    <>
      {/* Floating Mic Button */}
      <motion.button
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={startListening}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={t('actions.voiceAssistant')}
      >
        <span className="text-4xl">
          {isListening ? '🔴' : '🎤'}
        </span>
      </motion.button>

      {/* Voice Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="fixed bottom-32 right-8 w-80 bg-white rounded-3xl shadow-2xl p-6 z-40"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                🎤 {t('actions.voiceAssistant')}
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {isListening && (
              <div className="text-center py-4">
                <div className="text-4xl animate-pulse mb-2">🎙️</div>
                <p className="text-lg text-primary-600 font-semibold">
                  {t('actions.listening')}
                </p>
              </div>
            )}

            {transcript && (
              <div className="bg-gray-100 rounded-xl p-3 mb-3">
                <p className="text-sm text-gray-500">You said:</p>
                <p className="text-lg font-medium text-gray-800">"{transcript}"</p>
              </div>
            )}

            {response && (
              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-lg text-primary-800">{response}</p>
              </div>
            )}

            {!isListening && !transcript && !response && (
              <p className="text-gray-500 text-center py-4">
                Tap the microphone and speak a command
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
