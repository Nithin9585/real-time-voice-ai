'use client';

import { useState, useRef } from "react";
import { Mic } from "lucide-react";

const SpeechRecognition = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const sendToAPI = async (text) => {
    try {
      const response = await fetch('/api/Geminires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      setResponseText(data.reply || "No response from Gemini.");
    } catch (error) {
      console.error("Error sending to API:", error);
      setResponseText("Error: Could not connect to AI.");
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsRecognizing(true);
        setIsListening(true);
        setTranscription('');
        setResponseText('');
        finalTranscriptRef.current = '';
      };

      recognitionRef.current.onend = () => {
        setIsRecognizing(false);
        setIsListening(false);
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          sendToAPI(finalText);
        }
      };

      recognitionRef.current.onresult = (event) => {
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

        setTranscription(final + interim);
        finalTranscriptRef.current += final;
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event);
        setTranscription("There was a problem with voice recognition.");
        setIsListening(false);
      };
    }

    if (!isRecognizing) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 px-4 cursor-pointer bg-black">
      <h1 className="text-4xl font-bold text-white mb-4">🎙️ Real Time Voice AI</h1>

      <div
        className="w-full max-w-md h-60 border-2 border-gray-600 rounded-lg hover:bg-gray-800 transition duration-300 ease-in-out"
        onClick={startListening}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className={`transition-all duration-500 ${isListening ? 'opacity-0' : 'opacity-100'}`}>
            <Mic size={48} color="white" />
          </div>

          <div className={`flex items-center justify-center space-x-2 transition-all duration-500 ${isListening ? 'opacity-100' : 'opacity-0'}`}>
            <div className="circle animate-ping w-3 h-3 bg-white rounded-full"></div>
            <div className="circle animate-ping w-3 h-3 bg-white rounded-full delay-150"></div>
            <div className="circle animate-ping w-3 h-3 bg-white rounded-full delay-300"></div>
          </div>
        </div>

        <h2 className="text-white mt-4 text-center">
          {isListening ? 'Listening... Speak now!' : 'Tap to speak with Gemini'}
        </h2>
      </div>

      {/* Transcription Display */}
      <div className="text-white mt-10 text-center max-w-xl">
        <h3 className="text-lg font-semibold"> You Said:</h3>
        <p className="text-base italic">{transcription || '...'}</p>
      </div>

      {/* Gemini Response Display */}
      <div className="text-green-400 mt-6 text-center max-w-xl">
        <h3 className="text-lg font-semibold"> Gemini Response:</h3>
        <p className="text-base">{responseText || '...'}</p>
      </div>

      {/* Optional Reset Button */}
      {(transcription || responseText) && (
        <button
          onClick={() => {
            setTranscription('');
            setResponseText('');
            finalTranscriptRef.current = '';
          }}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}
