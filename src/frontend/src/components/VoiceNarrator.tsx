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

    // Configure voice settings for natural, conversational narration
    // Add natural pauses by inserting commas and periods in the text
    const naturalText = text
      .replace(/\. /g, '... ') // Longer pauses after sentences
      .replace(/\, /g, ',, '); // Slight pauses after commas
    
    utterance.text = naturalText;
    utterance.rate = 0.92; // Slightly slower for more natural flow (was 0.95)
    utterance.pitch = 1.08; // Higher pitch for warmth and less robotic
    utterance.volume = 0.8; // Quieter for calm, gentle presence

    // Try to use a natural, conversational voice
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for most natural-sounding voices
    const preferredVoiceNames = [
      'Samantha',           // macOS - Most natural, warm voice
      'Ava',                // macOS - Natural, clear
      'Allison',            // macOS - Professional, natural
      'Susan',              // macOS - Warm, conversational
      'Karen',              // macOS - Australian English, natural
      'Google US English',  // Chrome - Neural voice (more natural)
      'Microsoft Aria Online (Natural)', // Windows - Neural voice
      'Microsoft Jenny Online (Natural)', // Windows - Neural voice
      'Google UK English Female', // Chrome
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

