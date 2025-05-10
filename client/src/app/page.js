'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { handleLogout } from '../../utils/auth';
import Link from 'next/link';
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function Home() {
  
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const router = useRouter();
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const socketRef = useRef(null);
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        console.log('Logged in user:', data.user);
        setLoggedInUser(data.user);
      }else{
        router.push("/Login"); 
      }
    };
    getUser();
  }, []);
  useEffect(() => {
    const createWebSocket = () => {
      const socket = new WebSocket(process.env.NEXT_PUBLIC_API_URL);
      socketRef.current = socket;
  
      socket.onopen = () => {
        console.log('✅ WebSocket connection established');
        if (loggedInUser) {
          socket.send(
            JSON.stringify({
              type: 'init',
              user: {
                id: loggedInUser.id,
                email: loggedInUser.email,
              },
            })
          );
          console.log('👤 Sent user ID to WebSocket:', loggedInUser.id);
        }
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
  
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 Reconnecting to WebSocket...');
          createWebSocket();
        }, 3000);
      };
    };
  
    // Establish WebSocket connection when component mounts or loggedInUser changes
    if (loggedInUser) {
      createWebSocket();
    }
  
    // Cleanup WebSocket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [loggedInUser]);

let currentAudio = null; // Track the current audio
let isSpeakingAborted = false; // Track if speech was interrupted

const fillerWords = ["hmm", "okay", "continue", "right", "go on", "ha ha go on", "oo oo you are very fast "];

// Function to stop speaking immediately
const stopSpeaking = () => {
  isSpeakingAborted = true;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = ''; // Clear the audio source to stop it immediately
    currentAudio = null; // Reset the current audio
  }
};

// Function to play a single audio file
const playAudio = (audioSrc) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioSrc);
    currentAudio = audio;

    // Add this check right at the beginning of the playAudio function.
    if (isSpeakingAborted) {
      reject(new Error("Speech aborted before playing.")); // Reject if aborted
      return;
    }

    audio.onended = () => {
      currentAudio = null; // Reset after the audio ends
      resolve();
    };
    audio.onerror = (e) => {
      currentAudio = null; // Reset on error
      reject(e);
    };

    audio.play().then(() => {
         // Audio started playing
    }).catch(error => {
        // Check again if it was aborted during the async operation
        if (isSpeakingAborted) {
            reject(new Error("Speech aborted during playback."));
        }
        else{
          reject(error); // reject with the original error
        }

    });
  });
};

// Function to speak text
const speakText = async (text) => {
  try {
    stopSpeaking(); // 🛑 Immediately stop any existing speech
    isSpeakingAborted = false; // Reset for new speech

    const chunks = text.split('.').map(chunk => chunk.trim()).filter(chunk => chunk); // Remove empty chunks
    let allAudio = [];

    // Add filler words at random intervals
    chunks.forEach((chunk, index) => {
      if (index !== 0 && Math.random() > 0.5) {
        const filler = fillerWords[Math.floor(Math.random() * fillerWords.length)];
        allAudio.push(filler);
      }
      allAudio.push(chunk);
    });

    // Now play the speech with the fillers
    for (let sentence of allAudio) {
      if (isSpeakingAborted) {
        console.log('🎤 Speaking was aborted. Exiting...');
        return; // 🛑 Exit if interrupted
      }

      const res = await fetch("/api/Speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sentence,
          voice_id: "EXAVITQu4vr4xnSDxMaL",
        }),
      });

      if (!res.ok) {
        console.error("TTS API error:", await res.text());
        return;
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        await playAudio(audioUrl); // 🔊 Play audio
      } catch (error) {
          if (isSpeakingAborted){
               console.log("Play audio rejected because of abort", error)
               URL.revokeObjectURL(audioUrl); // Cleanup
               return;
          }
          else{
            console.error("Error playing audio:", error);
          }

      }
      URL.revokeObjectURL(audioUrl); // Cleanup
    }

    console.log("Speech has finished.");
  } catch (err) {
    console.error("Error speaking text:", err);
  }
};

// let currentAudio = null; // Track the current audio
// const fillerWords = ["hmm", "okay", "continue", "right", "go on"]; // Define fillers

// // Randomly pick a filler word
// const getRandomFiller = () => fillerWords[Math.floor(Math.random() * fillerWords.length)];

// const speakText = async (text) => {
//   try {
//     // 🛑 Stop any ongoing audio before starting a new one
//     if (currentAudio) {
//       currentAudio.pause();
//       currentAudio.src = ''; // Clear the audio source to release resources
//       currentAudio = null;
//     }

//     // 💬 Split the text into chunks (and add filler words)
//     const chunks = text.split(/(?<=[.?!])\s+/).filter(Boolean); // Split at punctuation followed by space
//     const fullSequence = [];

//     chunks.forEach((chunk, idx) => {
//       fullSequence.push(chunk); // Add the chunk
//       if (idx !== chunks.length - 1) fullSequence.push(getRandomFiller()); // Add filler between chunks
//     });

//     // 🔁 Play all chunks one by one
//     for (const part of fullSequence) {
//       const res = await fetch("/api/Speak_Sarvam", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           text: part,
//           target_language_code: "en-IN",
//           speaker: "meera", // Specify speaker
//         }),
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("TTS API error:", errorText);
//         continue;
//       }

//       const data = await res.json();
//       const base64Audio = data.audio;

//       if (!base64Audio) {
//         console.error("No audio received.");
//         continue;
//       }

//       // Create new audio object and set it to the current one
//       const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;
//       const audio = new Audio(audioSrc);

//       // Store the new audio as the current one
//       currentAudio = audio;

//       // Handle audio play and completion
//       const playPromise = new Promise((resolve) => {
//         audio.onended = () => {
//           currentAudio = null; // Reset current audio when it ends
//           resolve();
//         };
//         audio.onerror = (e) => {
//           console.error("Audio playback error:", e?.target?.error || e);
//           resolve();
//         };
//       });

//       // Attempt to play the audio and wait for it to finish
//       await audio.play().catch((err) => {
//         console.error("Audio play failed:", err);
//       });

//       await playPromise; // Wait until the current audio finishes
//     }

//     console.log("All speech chunks finished.");
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
    console.log('Recognition ended unexpectedly. Restarting...');
    recognition.start(); // Automatically restart if not paused
  } else {
    console.log('Speech recognition manually paused.');
  }
  setIsRecognizing(false);
  setIsListening(false);
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
     <div className="flex flex-row items-center justify-between max-w-md">
  {loggedInUser && (
    <>
            <h1 className="text-4xl font-bold text-white mb-4">{loggedInUser?.email}</h1>

      <button
        onClick={handleLogout}
        className="m-4 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow hover:bg-red-600 transition duration-200 cursor-pointer"
      >
        Logout
      </button>
    </>
  )}
</div>






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

      <div className="text-white mt-12 text-center max-w-xl border-2 p-4 rounded-md">
        <h3 className="text-lg font-semibold">You Said:</h3>
        <p className="text-base italic">{transcription || '...'}</p>
      </div>

      <div className="text-green-400 mt-6 text-center max-w-xl border-2 p-4 rounded-md">
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
        <button onClick={() => speakText("Hello Nithin, this is working!")}>
  Speak
</button>

      </div>
    </div>
  );
}
