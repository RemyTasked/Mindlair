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

    // Configure voice settings for calm, soothing narration
    utterance.rate = 0.85; // Slightly slower for calming effect
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Try to use a calm, professional female voice
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for female voices (calm, professional)
    const preferredVoiceNames = [
      'Samantha',           // macOS - warm, professional female
      'Karen',              // macOS - Australian English female
      'Moira',              // macOS - Irish English female
      'Microsoft Zira',     // Windows - US English female
      'Google US English Female', // Chrome
      'Google UK English Female', // Chrome
      'Fiona',              // macOS - Scottish English female
    ];
    
    let selectedVoice = voices.find(voice => 
      preferredVoiceNames.some(name => voice.name.includes(name))
    );
    
    // Fallback: Any female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.includes('Woman') ||
        !voice.name.toLowerCase().includes('male') // Exclude male voices
      );
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

