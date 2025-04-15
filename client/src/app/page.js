'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_API_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ WebSocket connection established');
    };

    socket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      const data = JSON.parse(event.data);

      if (data.partial) {
        if (data.partial === '[__END__]') {
          console.log('✅ Gemini finished responding.');
        } else {
          setResponseText((prev) => prev + data.partial);
        }
      }

      if (data.reply) {
        setResponseText(data.reply);
        // Send response text to backend for text-to-speech conversion
        console.log('Response from Gemini:', data.reply);
       playResponseAsSpeech(data.reply);
      }

      if (data.error) {
        setErrorMessage(data.error);
        console.error('WebSocket error message:', data.error);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setErrorMessage('WebSocket error occurred');
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setErrorMessage('WebSocket connection lost.');
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendToWebSocket = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending message to WebSocket:', message);
      socketRef.current.send(JSON.stringify({ message, type: 'continue' }));
    } else {
      console.error('WebSocket not open. Message not sent.');
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      console.error('Speech recognition not supported');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecognizing(true);
        setIsListening(true);
        setTranscription('');
        setResponseText('');
        finalTranscriptRef.current = '';
        console.log('Speech recognition started');
      };

      recognition.onend = () => {
        if (!isPaused) {
          sendToWebSocket(finalTranscriptRef.current.trim());
        }
        setIsRecognizing(false);
        setIsListening(false);
        console.log('Speech recognition ended');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setTranscription(finalTranscriptRef.current + final + interim);
        finalTranscriptRef.current += final;

        if (final && !isPaused) {
          sendToWebSocket(final);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setErrorMessage('There was a problem with voice recognition.');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    if (!isRecognizing) {
      recognitionRef.current.start();
      console.log('Speech recognition started manually');
    }
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const newPaused = !prev;
      if (newPaused) {
        recognitionRef.current?.stop();
        console.log('Speech recognition paused');
      } else {
        recognitionRef.current?.start();
        console.log('Speech recognition resumed');
      }
      return newPaused;
    });
  };

  const endConversation = () => {
    setTranscription('');
    setResponseText('');
    finalTranscriptRef.current = '';
    socketRef.current?.send(JSON.stringify({ type: 'end' }));
    console.log('Ending conversation');
  };

  const playResponseAsSpeech = async (text) => {
    try {
      console.log('Sending response text for TTS:', text);
  
      const response = await fetch('/api/Speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
  
      const audioBlob = await response.blob();
      console.log('Audio Blob:', audioBlob); // Log the audio blob
  
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
  
      console.log('Audio is playing...');
    } catch (error) {
      console.error('Error playing speech:', error);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 px-4 cursor-pointer bg-black">
      <h1 className="text-4xl font-bold text-white mb-4">Real-Time Voice AI</h1>

      {errorMessage && <div className="text-red-500 mb-4">{errorMessage}</div>}

      <div
        className="w-full max-w-md h-60 border-2 border-gray-600 rounded-lg hover:bg-gray-800 transition duration-300 ease-in-out"
        onClick={startListening}
      >
        <div className="flex flex-col items-center justify-center h-full">
          {!isListening ? (
            <Mic size={48} color="white" />
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <div className="circle animate-ping w-3 h-3 bg-white rounded-full"></div>
              <div className="circle animate-ping w-3 h-3 bg-white rounded-full delay-150"></div>
              <div className="circle animate-ping w-3 h-3 bg-white rounded-full delay-300"></div>
            </div>
          )}
        </div>
        <h2 className="text-white mt-4 text-center">
          {isListening ? 'Listening... Speak now!' : 'Tap to speak with Gemini'}
        </h2>
      </div>

      <div className="text-white mt-10 text-center max-w-xl">
        <h3 className="text-lg font-semibold">You Said:</h3>
        <p className="text-base italic">{transcription || '...'}</p>
      </div>

      <div className="text-green-400 mt-6 text-center max-w-xl">
        <h3 className="text-lg font-semibold">Gemini Response:</h3>
        <p className="text-base whitespace-pre-wrap">{responseText || '...'}</p>
      </div>

      <div className="mt-4 flex space-x-4">
        <button
          onClick={togglePause}
          className="px-4 py-2 bg-yellow-600 text-white rounded cursor-pointer hover:bg-yellow-700 transition"
        >
          {isPaused ? 'Resume Conversation' : 'Pause Conversation'}
        </button>

        <button
          onClick={endConversation}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition cursor-pointer"
        >
          End Conversation
        </button>
      </div>
    </div>
  );
}
