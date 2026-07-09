import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import axios from 'axios';

const VoiceAssistant = ({ rooms }) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognitionInstance = new window.webkitSpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'fi-FI';

      recognitionInstance.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        parseCommand(text);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const parseCommand = async (text) => {
    const lowerText = text.toLowerCase();
    
    const tempMatch = lowerText.match(/(\d+)/);
    const targetTemp = tempMatch ? parseInt(tempMatch[1]) : null;

    const matchedRoom = rooms.find(room => 
      lowerText.includes(room.name.toLowerCase())
    );

    if (matchedRoom && targetTemp) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`/api/rooms/${matchedRoom.id}/temp`, 
          { temperature: targetTemp },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Voice command failed:', err);
      }
    }
  };

  const toggleListening = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <>
      {transcript && (
        <div className="fixed bottom-28 right-6 bg-white rounded-2xl shadow-lg p-4 max-w-xs">
          <p className="text-xl text-gray-900">{transcript}</p>
        </div>
      )}
      
      <motion.button
        onClick={toggleListening}
        animate={isListening ? { scale: [1, 1.2, 1] } : {}}
        transition={isListening ? { repeat: Infinity, duration: 1 } : {}}
        className="fixed bottom-6 right-6 w-20 h-20 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center z-50"
      >
        <span className="text-3xl">{isListening ? '🔴' : '🎤'}</span>
      </motion.button>
    </>
  );
};

export default VoiceAssistant;