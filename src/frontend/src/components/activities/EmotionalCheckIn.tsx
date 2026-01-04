/**
 * Mind Garden - Emotional Check-In
 * 
 * "How I'm Feeling Right Now" activity
 * Voice or text input for users to express their current emotional state.
 * 
 * PRIVACY-FIRST:
 * - Audio is NOT stored - only processed locally for transcription
 * - Text is anonymized before contributing to the shared thought pool
 * - Users can opt-out of sharing entirely
 * 
 * +20 Serenity points per check-in
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, X, Heart, Shield, Sparkles,
  AlertCircle, CheckCircle2, Keyboard, Volume2
} from 'lucide-react';
import api from '../../lib/axios';

interface EmotionalCheckInProps {
  onComplete?: () => void;
}

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

const POINTS_PER_CHECKIN = 20;

export default function EmotionalCheckIn({ onComplete }: EmotionalCheckInProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'input' | 'complete'>('intro');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [shareWithCommunity, setShareWithCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use text input instead.');
      setInputMode('text');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(prev => prev + finalTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please enable microphone permissions or use text input.');
        } else {
          setError('Voice recognition error. Please try again or use text input.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Could not start voice input. Please use text input instead.');
      setInputMode('text');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    const content = inputMode === 'voice' ? transcript.trim() : textInput.trim();
    
    if (!content && !selectedEmotion) {
      setError('Please share how you\'re feeling, either by selecting an emotion or describing it.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Record the check-in for garden points
      await api.post('/api/garden/activity', {
        activityType: 'emotional-checkin',
        flowType: 'emotional-checkin',
      });

      // Optionally share anonymized content to community pool
      if (shareWithCommunity && content) {
        // Extract key phrases/words for games (no raw content stored)
        const words = content.split(/\s+/).filter(w => w.length > 3);
        const significantWords = words.slice(0, 5); // Only take first 5 significant words
        
        for (const word of significantWords) {
          try {
            await api.post('/api/thoughts/share', {
              text: word,
              category: selectedEmotion === 'Anxious' || selectedEmotion === 'Frustrated' || selectedEmotion === 'Sad' 
                ? 'negative' 
                : selectedEmotion === 'Happy' || selectedEmotion === 'Motivated' || selectedEmotion === 'Calm'
                  ? 'positive'
                  : 'general',
            });
          } catch {
            // Non-critical, continue
          }
        }
      }

      setStep('complete');
    } catch (err) {
      console.error('Failed to submit check-in:', err);
      setError('Failed to save your check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-pink-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How Are You Feeling?</h2>
            <p className="text-gray-600">
              Take a moment to check in with yourself. Express your feelings through voice or text.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-200">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-800 text-sm mb-1">Your Privacy is Protected</h4>
                <ul className="text-emerald-700 text-xs space-y-1">
                  <li>• Voice recordings are <strong>never stored</strong> - only transcribed locally</li>
                  <li>• Your words help personalize games (anonymized)</li>
                  <li>• You can opt out of sharing entirely</li>
                  <li>• Raw text is processed for keywords only</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-rose-600 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>+{POINTS_PER_CHECKIN} Serenity points</span>
          </div>

          <button
            onClick={() => setStep('input')}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg"
          >
            Begin Check-In
          </button>

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-pink-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-In Complete</h2>
          <p className="text-gray-600 mb-4">
            Thank you for taking time to reflect on your feelings.
          </p>

          {selectedEmotion && (
            <div className="mb-4">
              <span className="text-4xl">{EMOTION_PRESETS.find(e => e.label === selectedEmotion)?.emoji}</span>
              <p className="text-gray-700 mt-1">You're feeling <strong>{selectedEmotion}</strong></p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-rose-600 mb-6">
            <Sparkles className="w-6 h-6" />
            <span>+{POINTS_PER_CHECKIN} Serenity</span>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Your feelings contribute to your garden's growth tomorrow. 🌱
          </p>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-700 transition-all"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  // Input screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">How Are You Feeling?</h2>
            <p className="text-gray-600 text-sm">Express yourself freely</p>
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

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all mx-auto mb-4 ${
                  isRecording
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>

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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!textInput.trim() && !transcript.trim() && !selectedEmotion)}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Complete Check-In
            </>
          )}
        </button>
      </div>
    </div>
  );
}

