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

    socket.onmessage = async (event) => {
      console.log('WebSocket message received:', event.data);
      const data = JSON.parse(event.data);

      if (data.partial) {
        if (data.partial === '[__END__]') {
          console.log('✅ Gemini finished responding.');
        } else {
          setResponseText((prev) => prev + data.partial);

          // Directly send each chunk to the browser's TTS
          try {
            console.log('Requesting TTS with chunk:', data.partial);
            speakText(data.partial);
          } catch (err) {
            console.error('Error in TTS:', err);
          }
        }
      }

      if (data.reply) {
        setResponseText(data.reply);
        // Send the complete reply to TTS
        try {
          console.log('Requesting TTS with full reply:', data.reply);
          speakText(data.reply);
        } catch (err) {
          console.error('Error in TTS:', err);
        }

        console.log('Response from Gemini:', data.reply);
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

  // const speakText = async (text) => {
  //   try {
  //     const res = await fetch("/api/Speak", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         text,
  //         voice_id: "EXAVITQu4vr4xnSDxMaL" 
  //       }),
  //     });
  
  //     if (!res.ok) {
  //       console.error("TTS API error:", await res.text());
  //       return;
  //     }
  
  //     const audioBlob = await res.blob();
  //     const audioUrl = URL.createObjectURL(audioBlob);
  //     const audio = new Audio(audioUrl);
  //     audio.play();
  
  //     audio.onended = () => {
  //       console.log("Speech has finished.");
  //     };
  //   } catch (err) {
  //     console.error("Error speaking text:", err);
  //   }
  // };
  // const speakText = async (text) => {
  //   try {
  //     const res = await fetch("/api/Speak_Sarvam", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         text,
  //         target_language_code: "en-IN",
  //         speaker: "meera",
  //       }),
  //     });
  
  //     if (!res.ok) {
  //       const errorText = await res.text();
  //       console.error("TTS API error:", errorText);
  //       return;
  //     }
  
  //     const data = await res.json();
  //     const base64Audio = data.audio;
  
  //     if (!base64Audio) {
  //       console.error("No audio received.");
  //       return;
  //     }
  
  //     const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
  //     const audio = new Audio(audioSrc);
  
  //     audio.onerror = function (e) {
  //       const error = e.target.error;
  //       console.error("Audio playback error:", error);
  //       switch (error?.code) {
  //         case MediaError.MEDIA_ERR_ABORTED:
  //           console.error("You aborted the audio playback.");
  //           break;
  //         case MediaError.MEDIA_ERR_NETWORK:
  //           console.error("A network error caused the audio download to fail.");
  //           break;
  //         case MediaError.MEDIA_ERR_DECODE:
  //           console.error("The audio playback was aborted due to a corruption or unsupported features.");
  //           break;
  //         case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
  //           console.error("The audio not supported.");
  //           break;
  //         default:
  //           console.error("An unknown audio error occurred.");
  //           break;
  //       }
  //     };
  
  //     audio.play().catch((err) => {
  //       console.error("Audio play failed:", err);
  //     });
  
  //     audio.onended = () => {
  //       console.log("Speech has finished.");
  //     };
  //   } catch (err) {
  //     console.error("Error speaking text:", err);
  //   }
  // };
  
  
  
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
        {/* <button onClick={() => speakText("Hello Nithin, this is working!")}>
  Speak
</button> */}

      </div>
    </div>
  );
}
