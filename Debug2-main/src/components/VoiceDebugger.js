import React, { useState, useRef, useEffect } from 'react';

const VOICE_COMMANDS = {
  'debug this': 'Analyze the current code for bugs',
  'explain this': 'Provide a detailed explanation of the code',
  'optimize this': 'Suggest performance improvements',
  'fix this': 'Apply automatic bug fixes',
  'step through': 'Start step-by-step debugging',
  'visualize this': 'Create algorithm visualization',
  'what is wrong': 'Identify issues in the code',
  'how does this work': 'Explain the code logic',
  'make it faster': 'Suggest performance optimizations',
  'check for bugs': 'Comprehensive bug detection'
};

export default function VoiceDebugger({ onVoiceCommand, isListening, setIsListening, currentCode }) {
  // Validate required props
  if (typeof onVoiceCommand !== 'function') {
    console.error('VoiceDebugger: onVoiceCommand prop is required and must be a function');
    return null;
  }

  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Ensure setIsListening is a function
  const safeSetIsListening = (value) => {
    if (typeof setIsListening === 'function') {
      setIsListening(value);
    }
  };

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        safeSetIsListening(true);
        setError('');
      };
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
        
        // Check for voice commands
        if (finalTranscript) {
          const command = finalTranscript.toLowerCase().trim();
          const matchedCommand = Object.keys(VOICE_COMMANDS).find(cmd => 
            command.includes(cmd)
          );
          
          if (matchedCommand) {
            handleVoiceCommand(matchedCommand, finalTranscript);
          }
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        safeSetIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        safeSetIsListening(false);
      };
    } else {
      setError('Speech recognition is not supported in this browser');
    }
  }, []);

  const handleVoiceCommand = (command, fullTranscript) => {
    // Stop recording
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Execute the command
    onVoiceCommand(command, fullTranscript);
    
    // Provide audio feedback
    speakResponse(`Executing ${VOICE_COMMANDS[command]}`);
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Check for microphone permission
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'microphone' }).then((result) => {
            if (result.state === 'denied') {
              setError('Microphone access is denied. Please allow microphone access in your browser settings.');
              return;
            }
          });
        }
        
        recognitionRef.current.start();
        speakResponse('Listening for voice commands');
      } catch (error) {
        setError(`Failed to start listening: ${error.message}`);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        speakResponse('Stopped listening');
      } catch (error) {
        setError(`Failed to stop listening: ${error.message}`);
      }
    }
  };

  const speakAvailableCommands = () => {
    const commands = Object.entries(VOICE_COMMANDS)
      .map(([cmd, desc]) => `${cmd}: ${desc}`)
      .join('. ');
    speakResponse(`Available commands: ${commands}`);
  };

  if (!isSupported) {
    return (
      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center text-white">
            🎤
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Voice Debugger</h3>
        </div>
        <p className="text-red-700 dark:text-red-300 text-sm">
          Voice recognition is not supported in this browser. Please use Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
            🎤
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Voice Debugger</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Use voice commands to debug your code
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={speakAvailableCommands}
            className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Hear available commands"
          >
            📋 Commands
          </button>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${
            isListening
              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-red-500/25'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-blue-500/25'
          } hover:scale-105`}
        >
          <div className={`w-6 h-6 rounded-full ${
            isListening ? 'bg-red-400 animate-pulse' : 'bg-white'
          }`}></div>
          {isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
        </button>
        
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Listening...
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="mb-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
          <div className="text-sm text-slate-400 mb-2">Transcript:</div>
          <div className="text-slate-300 font-mono text-sm">{transcript}</div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
        </div>
      )}

      {/* Available Commands */}
      <div className="mt-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Available Voice Commands:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(VOICE_COMMANDS).map(([command, description]) => (
            <div key={command} className="p-3 rounded-xl bg-slate-900/30 border border-slate-700/30">
              <div className="font-mono text-sm text-blue-400 mb-1">"{command}"</div>
              <div className="text-xs text-slate-400">{description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Quick Actions:</h4>
        <div className="flex flex-wrap gap-2">
          {Object.keys(VOICE_COMMANDS).slice(0, 5).map((command) => (
            <button
              key={command}
              onClick={() => handleVoiceCommand(command, command)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:scale-105 transition-all duration-300"
            >
              {command}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 