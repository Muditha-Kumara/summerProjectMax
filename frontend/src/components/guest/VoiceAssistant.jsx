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
      setResponse(t('voice.notSupported'));
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
      setResponse(t('voice.couldNotUnderstand'));
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
      setResponse(t('voice.tempResponse'));
    } else if (lowerText.includes('poissa') || lowerText.includes('away') || lowerText.includes('borta')) {
      setResponse(t('voice.awayResponse'));
    } else if (lowerText.includes('kotona') || lowerText.includes('home') || lowerText.includes('hemma')) {
      setResponse(t('voice.homeResponse'));
    } else if (lowerText.includes('apua') || lowerText.includes('help') || lowerText.includes('hjälp')) {
      setResponse(t('voice.helpResponse'));
    } else {
      setResponse(`${t('voice.heardResponse')} "${text}". ${t('voice.askAbout')}`);
    }
  };

  return (
    <>
      {/* Floating Mic Button */}
      <motion.button
        className={`voice-btn ${isListening ? 'listening' : ''} w-24 h-24 sm:w-28 sm:h-28`}
        onClick={startListening}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={t('actions.voiceAssistant')}
      >
        <span className="text-5xl sm:text-6xl">
          {isListening ? '🔴' : '🎤'}
        </span>
      </motion.button>

      {/* Voice Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="fixed bottom-32 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-96 bg-white rounded-3xl shadow-2xl p-6 z-40 border-4 border-primary-200"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                🎤 {t('actions.voiceAssistant')}
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close voice assistant"
              >
                ✕
              </button>
            </div>

            {isListening && (
              <div className="text-center py-6">
                <div className="text-5xl animate-pulse mb-3">🎙️</div>
                <p className="text-xl text-primary-600 font-semibold">
                  {t('actions.listening')}
                </p>
              </div>
            )}

            {transcript && (
              <div className="bg-gray-100 rounded-xl p-4 mb-3">
                <p className="text-lg text-gray-500 mb-1">{t('voice.youSaid')}</p>
                <p className="text-xl font-medium text-gray-800">"{transcript}"</p>
              </div>
            )}

            {response && (
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-xl text-primary-800">{response}</p>
              </div>
            )}

            {!isListening && !transcript && !response && (
              <p className="text-gray-500 text-center py-6 text-lg">
                {t('voice.tapMic')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
