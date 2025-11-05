import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VoiceNarratorProps {
  text: string;
  enabled: boolean;
  onToggle: () => void;
  onSpeaking?: (isSpeaking: boolean) => void;
  autoPlay?: boolean;
}

export default function VoiceNarrator({ 
  text, 
  enabled, 
  onToggle, 
  onSpeaking,
  autoPlay = true 
}: VoiceNarratorProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // Check if speech synthesis is available
    setIsAvailable('speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (!isAvailable || !enabled || !text) return;

    // Don't speak again if we've already spoken this text
    if (hasSpokenRef.current) return;

    if (autoPlay) {
      speakText();
      hasSpokenRef.current = true;
    }

    return () => {
      stopSpeaking();
    };
  }, [text, enabled, isAvailable, autoPlay]);

  // Reset hasSpoken when text changes
  useEffect(() => {
    hasSpokenRef.current = false;
  }, [text]);

  const speakText = () => {
    if (!isAvailable || !text) return;

    // Cancel any ongoing speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice settings for warm, nurturing, professional narration
    // Add natural pauses and breathing space
    const naturalText = text
      .replace(/\. /g, '. ... ')    // Longer, natural pause after sentences (breathing space)
      .replace(/\? /g, '? ... ')    // Pause after questions for reflection
      .replace(/\! /g, '! ... ')    // Pause after exclamations for emphasis
      .replace(/\, /g, ', ,, ')     // Brief pause after commas (natural rhythm)
      .replace(/: /g, ': ,, ')      // Slight pause after colons
      .replace(/\n/g, ' ... ');     // Pause at line breaks
    
    utterance.text = naturalText;
    utterance.rate = 0.85; // Much slower, calm, meditative pace (was 0.92)
    utterance.pitch = 1.15; // Warmer, more soothing pitch (was 1.08)
    utterance.volume = 0.75; // Softer, more intimate volume (was 0.8)

    // Try to use the most natural, calm, nurturing voice available
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for calm, nurturing, professional voices
    const preferredVoiceNames = [
      'Samantha',                           // macOS - Most natural, warm, nurturing
      'Ava',                                // macOS - Soft, clear, professional
      'Allison',                            // macOS - Calm, professional
      'Serena',                             // macOS - Soothing, gentle
      'Susan',                              // macOS - Warm, conversational
      'Fiona',                              // macOS - Scottish, very natural
      'Microsoft Aria Online (Natural)',    // Windows - Neural, very human-like
      'Microsoft Jenny Online (Natural)',   // Windows - Neural, warm
      'Microsoft Michelle Online (Natural)',// Windows - Neural, professional
      'Google US English',                  // Chrome - Neural (premium quality)
      'Google UK English Female',           // Chrome - Natural British accent
    ];
    
    let selectedVoice = voices.find(voice => 
      preferredVoiceNames.some(name => voice.name.includes(name))
    );
    
    // Fallback: Look for 'natural' or 'neural' in voice name
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('natural') ||
        voice.name.toLowerCase().includes('neural')
      );
    }
    
    // Final fallback: First available English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.lang.includes('en')
      ) || voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('🎙️ Selected voice:', selectedVoice.name);
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeaking?.(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeaking?.(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeaking?.(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    onSpeaking?.(false);
  };

  if (!isAvailable) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => {
          if (isSpeaking) {
            stopSpeaking();
          }
          onToggle();
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg ${
          enabled
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
        title={enabled ? 'Voice narration enabled (click to disable)' : 'Voice narration disabled (click to enable)'}
      >
        {enabled ? (
          <>
            <Volume2 className="w-5 h-5" />
            {isSpeaking && (
              <span className="flex gap-1">
                <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
          </>
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

