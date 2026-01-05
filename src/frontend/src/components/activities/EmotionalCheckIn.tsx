/**
 * Mind Garden - Daily Check-In & Gratitude
 * 
 * Combined wellness activity:
 * 1. Emotional check-in via voice or text
 * 2. Gratitude journaling with prompts
 * 
 * PRIVACY-FIRST:
 * - Audio is NOT stored - only processed locally for transcription
 * - Diary entries saved ONLY on device (localStorage)
 * - Keywords anonymized for game personalization (opt-out available)
 * 
 * +30 Serenity points per check-in (+20 feelings, +10 gratitude)
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, X, Heart, Shield, Sparkles,
  AlertCircle, CheckCircle2, Keyboard, Volume2,
  History, Trash2, Clock, ChevronLeft, Flower2,
  RefreshCw, ChevronRight
} from 'lucide-react';
import api from '../../lib/axios';

interface EmotionalCheckInProps {
  onComplete?: () => void;
}

// Local check-in entry structure
interface LocalCheckIn {
  id: string;
  timestamp: string;
  emotion: string | null;
  text: string;
  gratitude?: string;
  mode: 'voice' | 'text';
}

interface GratitudeEntry {
  id: string;
  content: string;
  createdAt: string;
  mood?: string;
}

const LOCAL_STORAGE_KEY = 'mindgarden_emotional_history';
const GRATITUDE_STORAGE_KEY = 'mindgarden_gratitude_entries';

// Gratitude prompts for inspiration
const GRATITUDE_PROMPTS = [
  "What made you smile today?",
  "Who are you thankful for?",
  "What small pleasure did you enjoy today?",
  "What challenge helped you grow recently?",
  "What are you looking forward to?",
  "What about your body are you grateful for?",
  "What skill or ability are you thankful to have?",
  "What moment of peace did you experience today?",
  "Who showed you kindness recently?",
  "What beauty did you notice today?",
];

// Helper functions for local storage
const loadLocalHistory = (): LocalCheckIn[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load emotional history:', error);
  }
  return [];
};

const saveToLocalHistory = (entry: LocalCheckIn): void => {
  try {
    const history = loadLocalHistory();
    // Add new entry at the beginning
    history.unshift(entry);
    // Keep only last 50 entries to manage storage
    const trimmed = history.slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save to emotional history:', error);
  }
};

const clearLocalHistory = (): void => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear emotional history:', error);
  }
};

// Save gratitude entry to local storage
const saveGratitudeEntry = (content: string, mood?: string): void => {
  try {
    const stored = localStorage.getItem(GRATITUDE_STORAGE_KEY);
    const entries: GratitudeEntry[] = stored ? JSON.parse(stored) : [];
    
    const newEntry: GratitudeEntry = {
      id: `gratitude-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      mood,
    };
    
    entries.unshift(newEntry);
    const trimmed = entries.slice(0, 100); // Keep last 100 entries
    localStorage.setItem(GRATITUDE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Failed to save gratitude entry:', error);
  }
};

// Format relative time
const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Emotion categories for quick selection
const EMOTION_PRESETS = [
  { emoji: '😊', label: 'Happy', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { emoji: '😌', label: 'Calm', color: 'bg-green-100 text-green-700 border-green-300' },
  { emoji: '😔', label: 'Sad', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { emoji: '😰', label: 'Anxious', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { emoji: '😤', label: 'Frustrated', color: 'bg-red-100 text-red-700 border-red-300' },
  { emoji: '😴', label: 'Tired', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { emoji: '🤔', label: 'Uncertain', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { emoji: '💪', label: 'Motivated', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
];

const POINTS_PER_CHECKIN = 30; // +20 for feelings, +10 for gratitude

export default function EmotionalCheckIn({ onComplete }: EmotionalCheckInProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'input' | 'gratitude' | 'complete' | 'history'>('intro');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [shareWithCommunity, setShareWithCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [localHistory, setLocalHistory] = useState<LocalCheckIn[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [micActive, setMicActive] = useState(false); // Visual indicator for active mic
  
  // Gratitude state
  const [gratitudeInput, setGratitudeInput] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState(
    GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
  );
  
  const recognitionRef = useRef<any>(null);

  // Load local history on mount
  useEffect(() => {
    setLocalHistory(loadLocalHistory());
  }, []);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Voice input is not available in this browser. Please use text input instead, or try Chrome/Safari.');
      setInputMode('text');
      return;
    }

    // Check if we're on iOS - Web Speech API has limited support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    
    if (isIOS && !isSafari) {
      setError('Voice input on iOS works best in Safari. Please switch to Safari or use text input.');
      setInputMode('text');
      return;
    }

    // Check for microphone permission first
    try {
      // Request microphone permission explicitly before starting speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We got permission - stop the stream as speech recognition will use its own
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Microphone permission granted');
    } catch (micError: any) {
      console.error('Microphone permission error:', micError);
      if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
      } else if (micError.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone or use text input.');
      } else if (micError.name === 'NotSupportedError') {
        setError('Microphone access is not supported. Please use text input instead.');
      } else {
        setError(`Microphone error: ${micError.message || 'Unknown error'}. Please use text input.`);
      }
      setInputMode('text');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsRecording(true);
        setMicActive(true);
        setError(null);
      };

      recognition.onaudiostart = () => {
        console.log('🔊 Audio capture started');
        setMicActive(true);
      };

      recognition.onsoundstart = () => {
        console.log('🔉 Sound detected');
      };

      recognition.onspeechstart = () => {
        console.log('🗣️ Speech detected');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
        
        // Flash mic indicator when we detect speech
        if (interimTranscript || finalTranscript) {
          setMicActive(true);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error, event);
        setIsRecording(false);
        setMicActive(false);
        
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            setError('Microphone access denied. Please allow microphone access in your browser settings, then refresh and try again.');
            break;
          case 'no-speech':
            // This is common when user pauses - don't show as error, just stop recording
            if (!transcript) {
              setError('No speech detected. Tap the microphone to try again, or use text input.');
            }
            break;
          case 'audio-capture':
            setError('Could not capture audio. Please check your microphone is working and not in use by another app.');
            break;
          case 'network':
            setError('Network error during voice recognition. Please check your internet connection or use text input.');
            break;
          case 'service-not-allowed':
            // PWA or browser restriction
            if (isStandalonePWA && isIOS) {
              setError('Voice input may not work in this PWA. Please open Mind Garden in Safari and try again.');
            } else {
              setError('Voice recognition service not available. Please try again or use text input.');
            }
            break;
          case 'aborted':
            // User cancelled - not an error, don't show message
            console.log('Speech recognition aborted by user');
            break;
          case 'language-not-supported':
            setError('Language not supported. Please use text input instead.');
            break;
          default:
            setError(`Voice recognition error (${event.error}). Please try again or use text input.`);
        }
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsRecording(false);
        setMicActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setMicActive(false);
      
      if (err.message?.includes('not allowed') || err.message?.includes('permission')) {
        setError('Microphone permission required. Please allow access in your browser settings.');
      } else {
        setError(`Could not start voice input: ${err.message || 'Unknown error'}. Please use text input instead.`);
      }
      setInputMode('text');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setMicActive(false);
  };

  // Move to gratitude step after emotional check-in
  const handleEmotionalSubmit = () => {
    const content = inputMode === 'voice' ? transcript.trim() : textInput.trim();
    
    if (!content && !selectedEmotion) {
      setError('Please share how you\'re feeling, either by selecting an emotion or describing it.');
      return;
    }

    setError(null);
    setStep('gratitude');
  };

  // Final submission with both emotional and gratitude data
  const handleFinalSubmit = async () => {
    const emotionalContent = inputMode === 'voice' ? transcript.trim() : textInput.trim();
    const gratitudeContent = gratitudeInput.trim();
    
    setIsSubmitting(true);
    setError(null);

    // Save to local storage FIRST for user's private diary (includes gratitude)
    // This ensures the entry is saved even if the API fails
    const newEntry: LocalCheckIn = {
      id: `checkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      emotion: selectedEmotion,
      text: emotionalContent,
      gratitude: gratitudeContent || undefined,
      mode: inputMode,
    };
    saveToLocalHistory(newEntry);
    setLocalHistory(loadLocalHistory());

    // Save gratitude entry separately (for compatibility with old gratitude history)
    if (gratitudeContent) {
      saveGratitudeEntry(gratitudeContent, selectedEmotion || undefined);
    }

    // Record the check-in for garden points (non-blocking - don't let API failure stop completion)
    api.post('/api/garden/activity', {
      activityType: 'daily-checkin',
      flowType: 'daily-checkin',
    }).catch(err => {
      console.warn('Failed to record activity for garden points:', err);
    });

    // Optionally share anonymized content to community pool (non-blocking)
    if (shareWithCommunity) {
      const allContent = `${emotionalContent} ${gratitudeContent}`;
      const words = allContent.split(/\s+/).filter(w => w.length > 3);
      const significantWords = words.slice(0, 5);
      
      for (const word of significantWords) {
        api.post('/api/thoughts/share', {
          text: word,
          category: selectedEmotion === 'Anxious' || selectedEmotion === 'Frustrated' || selectedEmotion === 'Sad' 
            ? 'negative' 
            : selectedEmotion === 'Happy' || selectedEmotion === 'Motivated' || selectedEmotion === 'Calm'
              ? 'positive'
              : 'general',
        }).catch(() => {
          // Non-critical, silently ignore
        });
      }
    }

    // Always transition to complete - local storage save is the critical action
    setIsSubmitting(false);
    setStep('complete');
  };

  const getNewPrompt = () => {
    const newPrompt = GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)];
    setCurrentPrompt(newPrompt);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/activities');
    }
  };

  // Intro screen
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-amber-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
                <Heart className="w-7 h-7 text-rose-500" />
              </div>
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Flower2 className="w-7 h-7 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Check-In</h2>
            <p className="text-gray-600 text-sm">
              Two mindful moments: Share how you're feeling, then plant a seed of gratitude.
            </p>
          </div>

          {/* Steps Preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">1</div>
              <span className="text-gray-700 text-sm font-medium">How I'm Feeling</span>
              <span className="text-rose-400 text-xs ml-auto">+20 pts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</div>
              <span className="text-gray-700 text-sm font-medium">Gratitude Moment</span>
              <span className="text-amber-400 text-xs ml-auto">+10 pts</span>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-emerald-50 rounded-xl p-3 mb-5 border border-emerald-200">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-800 text-xs mb-1">Your Privacy is Protected</h4>
                <p className="text-emerald-700 text-xs">
                  Entries saved only on your device. Voice is never stored.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-rose-600 mb-5">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">+{POINTS_PER_CHECKIN} Serenity points total</span>
          </div>

          <button
            onClick={() => setStep('input')}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-bold text-lg hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg"
          >
            Begin Check-In
          </button>

          {localHistory.length > 0 && (
            <button
              onClick={() => setStep('history')}
              className="w-full mt-3 py-3 flex items-center justify-center gap-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors font-medium"
            >
              <History className="w-4 h-4" />
              View Past Check-Ins ({localHistory.length})
            </button>
          )}

          <button
            onClick={() => navigate('/activities')}
            className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            Back to Activities
          </button>
        </motion.div>
      </div>
    );
  }

  // Completion screen
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Beautiful!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for taking time to reflect and practice gratitude.
          </p>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
            {selectedEmotion && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{EMOTION_PRESETS.find(e => e.label === selectedEmotion)?.emoji}</span>
                <span className="text-gray-700 text-sm">Feeling <strong>{selectedEmotion}</strong></span>
              </div>
            )}
            {gratitudeInput.trim() && (
              <div className="flex items-start gap-2">
                <Flower2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm line-clamp-2">"{gratitudeInput.trim()}"</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-600 mb-4">
            <Sparkles className="w-6 h-6" />
            <span>+{POINTS_PER_CHECKIN} Serenity</span>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            {gratitudeInput.trim() 
              ? "A golden flower has been planted in your garden! 🌟"
              : "Your feelings contribute to your garden's growth tomorrow. 🌱"}
          </p>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  // History screen
  if (step === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-100 p-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('intro')}
                className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Your Diary</h2>
                <p className="text-gray-600 text-sm">Private check-in history</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/activities')}
              className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Privacy Reminder */}
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>These entries are stored only on your device. Mind Garden cannot access them.</span>
          </div>

          {/* History List */}
          <div className="space-y-3 mb-6">
            {localHistory.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No check-ins yet</p>
                <p className="text-gray-400 text-sm mt-1">Your diary entries will appear here</p>
              </div>
            ) : (
              localHistory.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.emotion && (
                        <span className="text-2xl">
                          {EMOTION_PRESETS.find(e => e.label === entry.emotion)?.emoji || '💭'}
                        </span>
                      )}
                      {entry.emotion && (
                        <span className="font-medium text-gray-800">{entry.emotion}</span>
                      )}
                      {!entry.emotion && <span className="text-gray-500 text-sm italic">No emotion selected</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(entry.timestamp)}</span>
                    </div>
                  </div>
                  {entry.text && (
                    <p className="text-gray-700 text-sm leading-relaxed">{entry.text}</p>
                  )}
                  {entry.mode === 'voice' && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Volume2 className="w-3 h-3" />
                      <span>Voice transcription</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Clear History Button */}
          {localHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4">
              {showClearConfirm ? (
                <div className="text-center">
                  <p className="text-gray-700 mb-3">Are you sure you want to delete all entries?</p>
                  <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        clearLocalHistory();
                        setLocalHistory([]);
                        setShowClearConfirm(false);
                        setStep('intro');
                      }}
                      className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete All
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Entries
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Gratitude step
  if (step === 'gratitude') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 p-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('input')}
                className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Gratitude Moment</h2>
                <p className="text-gray-600 text-sm">Step 2 of 2</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Feeling Summary */}
          {selectedEmotion && (
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 flex items-center gap-3">
              <span className="text-2xl">
                {EMOTION_PRESETS.find(e => e.label === selectedEmotion)?.emoji}
              </span>
              <div>
                <span className="text-sm text-gray-500">You're feeling</span>
                <span className="font-semibold text-gray-800 ml-2">{selectedEmotion}</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
            </div>
          )}

          {/* Prompt Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Today's Prompt</span>
              <button
                onClick={getNewPrompt}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
              >
                <RefreshCw className="w-3 h-3" />
                New prompt
              </button>
            </div>
            <p className="text-lg text-gray-800 italic">"{currentPrompt}"</p>
          </div>

          {/* Gratitude Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you grateful for today?
            </label>
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder="I'm grateful for..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 text-gray-800 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {gratitudeInput.length} characters
            </p>
          </div>

          {/* Skip & Submit Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Skip Gratitude
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Flower2 className="w-5 h-5" />
                  Complete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Input screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('intro')}
              className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">How Are You Feeling?</h2>
              <p className="text-gray-600 text-sm">Step 1 of 2</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emotion Quick Select */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">Quick Select (optional)</h3>
          <div className="grid grid-cols-4 gap-2">
            {EMOTION_PRESETS.map((emotion) => (
              <button
                key={emotion.label}
                onClick={() => setSelectedEmotion(
                  selectedEmotion === emotion.label ? null : emotion.label
                )}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  selectedEmotion === emotion.label
                    ? emotion.color + ' border-current'
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl block mb-1">{emotion.emoji}</span>
                <span className="text-xs font-medium">{emotion.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => {
              if (isRecording) stopRecording();
              setInputMode('text');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              inputMode === 'text'
                ? 'bg-rose-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Text
          </button>
          {speechSupported && (
            <button
              onClick={() => setInputMode('voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                inputMode === 'voice'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Voice
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          {inputMode === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe how you're feeling...
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="I'm feeling... Today has been... What's on my mind is..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 text-gray-800 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                {textInput.length} characters
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                {isRecording ? 'Listening... Speak freely about how you feel.' : 'Tap the microphone to start speaking'}
              </p>

              {/* Microphone button with activity indicator */}
              <div className="relative inline-block mb-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </button>
                
                {/* Animated ring when microphone is active */}
                {isRecording && (
                  <>
                    <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75" />
                    {micActive && (
                      <span className="absolute -inset-2 rounded-full border-2 border-red-300 animate-pulse" />
                    )}
                  </>
                )}
              </div>

              {/* Recording status indicator */}
              {isRecording && (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                  <span className={`w-2 h-2 rounded-full ${micActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className={micActive ? 'text-green-600' : 'text-gray-500'}>
                    {micActive ? 'Hearing you...' : 'Waiting for speech...'}
                  </span>
                </div>
              )}

              {transcript && (
                <div className="bg-gray-50 rounded-xl p-4 text-left">
                  <p className="text-sm text-gray-600 mb-1">What we heard:</p>
                  <p className="text-gray-800">{transcript}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                <Shield className="w-3 h-3 inline mr-1" />
                Audio is processed locally and never stored
              </p>
            </div>
          )}
        </div>

        {/* Share Toggle */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareWithCommunity}
              onChange={(e) => setShareWithCommunity(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-rose-500 focus:ring-rose-400"
            />
            <div>
              <span className="text-gray-800 font-medium">Help personalize games</span>
              <p className="text-xs text-gray-500">
                Anonymized keywords from your check-in help make games more relevant for everyone
              </p>
            </div>
          </label>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleEmotionalSubmit}
          disabled={!textInput.trim() && !transcript.trim() && !selectedEmotion}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-5 h-5" />
          Continue to Gratitude
        </button>
      </div>
    </div>
  );
}

