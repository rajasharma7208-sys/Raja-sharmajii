import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, AlertCircle, Sparkles } from 'lucide-react';
import { AudioStreamer } from '../lib/audio-streamer';
import { LiveSession } from '../lib/live-session';
import { RAJAMODS7_CONFIG } from '../lib/api-config';
import { RAJAMODS7_PRIVATE_KEY } from '../lib/api-key';

type AssistantState = 'idle' | 'connecting' | 'listening' | 'speaking';

export default function VoiceAssistant() {
  const [state, setState] = useState<AssistantState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioStreamerRef.current = new AudioStreamer();
    // Using the key from our new api-key.ts file
    const apiKey = RAJAMODS7_PRIVATE_KEY;
    
    // Check if the key is a placeholder or doesn't look like a real Gemini key
    const isPlaceholder = !apiKey || apiKey === "YOUR_MANUAL_KEY_HERE" || apiKey === "MY_GEMINI_API_KEY";
    const isValidFormat = apiKey && apiKey.startsWith("AIza");

    if (!isPlaceholder && isValidFormat) {
      console.log("rajamods7 AI: Valid Private Key detected, initializing...");
      liveSessionRef.current = new LiveSession(apiKey);
    } else {
      console.error("rajamods7 AI: Invalid or Missing API Key", { apiKey: isPlaceholder ? "PLACEHOLDER" : "INVALID_FORMAT" });
      setError(isPlaceholder ? 
        "rajamods7 API Key is missing. Please add your real key in src/lib/api-key.ts or Secrets panel." : 
        "rajamods7 API Key format is invalid. It should start with 'AIza'. Please check your key."
      );
    }

    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    console.log("rajamods7 AI: Starting session...");
    setError(null);

    // 1. Ensure AudioStreamer is initialized
    if (!audioStreamerRef.current) {
      console.log("rajamods7 AI: Initializing AudioStreamer...");
      audioStreamerRef.current = new AudioStreamer();
    }

    // 2. Ensure LiveSession is initialized with a valid key
    if (!liveSessionRef.current) {
      const apiKey = RAJAMODS7_PRIVATE_KEY;
      const isPlaceholder = !apiKey || apiKey === "YOUR_MANUAL_KEY_HERE" || apiKey === "MY_GEMINI_API_KEY";
      const isValidFormat = apiKey && apiKey.startsWith("AIza");

      if (!isPlaceholder && isValidFormat) {
        console.log("rajamods7 AI: Initializing LiveSession...");
        liveSessionRef.current = new LiveSession(apiKey);
      } else {
        const msg = isPlaceholder ? 
          "rajamods7 API Key is missing. Please add your real key in src/lib/api-key.ts or Secrets panel." : 
          "rajamods7 API Key format is invalid. It should start with 'AIza'. Please check your key.";
        
        setError(msg);
        console.error("rajamods7 AI: Session initialization failed:", msg);
        return;
      }
    }

    try {
      await liveSessionRef.current.connect({
        onAudioChunk: (base64) => {
          audioStreamerRef.current?.playChunk(base64);
          setState('speaking');
          
          // Reset speaking state after a delay if no more chunks arrive
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = setTimeout(() => {
            setState('listening');
          }, 2000);
        },
        onInterrupted: () => {
          audioStreamerRef.current?.stopPlayback();
          setState('listening');
        },
        onStateChange: (newState) => {
          setState(newState);
        },
        onError: (err) => {
          setError(err);
          stopSession();
        }
      });

      await audioStreamerRef.current.startCapturing((base64) => {
        liveSessionRef.current?.sendAudio(base64);
      });
    } catch (err: any) {
      setError(err.message || "Failed to start session");
      stopSession();
    }
  };

  const stopSession = () => {
    audioStreamerRef.current?.stopCapturing();
    liveSessionRef.current?.disconnect();
    setState('idle');
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
  };

  const toggleSession = () => {
    if (state === 'idle') {
      startSession();
    } else {
      stopSession();
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${
          state === 'idle' ? 'bg-zinc-900/20' :
          state === 'connecting' ? 'bg-blue-500/10' :
          state === 'listening' ? 'bg-purple-500/20' :
          'bg-pink-500/30'
        }`} />
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-sm font-medium tracking-widest uppercase text-zinc-400">rajamods7 AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Globe className="w-5 h-5 text-zinc-500 hover:text-white transition-colors cursor-pointer" />
          <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-500">
            PRIVATE API v1.0
          </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="relative flex flex-col items-center gap-12 z-10">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute -top-24 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Mic Button / Visualizer */}
        <div className="relative">
          {/* Waveform Rings */}
          <AnimatePresence>
            {(state === 'listening' || state === 'speaking') && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0.1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border border-pink-500"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.8, opacity: 0.05 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeOut", delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-purple-500"
                />
              </>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSession}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 group ${
              state === 'idle' ? 'bg-zinc-900 border-zinc-800' :
              state === 'connecting' ? 'bg-zinc-900 border-blue-500/50' :
              state === 'listening' ? 'bg-zinc-900 border-purple-500/50' :
              'bg-zinc-900 border-pink-500/50'
            } border-2 shadow-2xl`}
          >
            {/* Inner Glow */}
            <div className={`absolute inset-4 rounded-full blur-xl transition-colors duration-500 ${
              state === 'idle' ? 'bg-transparent' :
              state === 'connecting' ? 'bg-blue-500/20' :
              state === 'listening' ? 'bg-purple-500/20' :
              'bg-pink-500/30'
            }`} />

            {/* Icon */}
            <div className="relative z-10">
              {state === 'idle' ? (
                <Power className="w-12 h-12 text-zinc-500 group-hover:text-white transition-colors" />
              ) : state === 'connecting' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Sparkles className="w-12 h-12 text-blue-400" />
                </motion.div>
              ) : state === 'listening' ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Mic className="w-12 h-12 text-purple-400" />
                </motion.div>
              ) : (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [12, 32, 12] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1.5 bg-pink-400 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.button>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <motion.h1 
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-light tracking-tight"
          >
            {state === 'idle' ? "Ready to talk?" :
             state === 'connecting' ? "Waking up..." :
             state === 'listening' ? "I'm listening, babe" :
             "Just a sec..."}
          </motion.h1>
          <p className="text-zinc-500 text-sm font-medium tracking-wide">
            {state === 'idle' ? "Tap to start your rajamods7 session" :
             state === 'connecting' ? "Establishing secure connection" :
             state === 'listening' ? "Go ahead, tell me everything" :
             "rajamods7 AI is thinking..."}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-12 text-center z-10">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4">
          Developed & Owned by rajamods7
        </p>
        <div className="flex gap-8 justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-500 font-mono">LATENCY</span>
            <span className="text-xs font-mono text-pink-500/80">~120ms</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-500 font-mono">ENCRYPTION</span>
            <span className="text-xs font-mono text-pink-500/80">AES-256</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-500 font-mono">VOICE</span>
            <span className="text-xs font-mono text-pink-500/80">KORE-HD</span>
          </div>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
