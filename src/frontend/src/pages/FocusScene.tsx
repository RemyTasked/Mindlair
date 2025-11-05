import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import AdaptiveBreathingFlow from '../components/AdaptiveBreathingFlow';
import CountdownTimer from '../components/CountdownTimer';
import AmbientSound from '../components/AmbientSound';
import VoiceNarrator from '../components/VoiceNarrator';

type MindState = 'calm' | 'stressed' | 'focused' | 'unclear';

interface MeetingData {
  title: string;
  startTime: string;
  cueContent: string;
  soundPreferences?: {
    enabled: boolean;
    soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  };
}

export default function FocusScene() {
  const { userId, meetingId } = useParams();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'mindstate' | 'ai-message' | 'breathing' | 'reflection' | 'complete'>('intro');
  const [mindState, setMindState] = useState<MindState | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [loadingAiMessage, setLoadingAiMessage] = useState(false);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [breathingCompleted, setBreathingCompleted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Voice narration enabled by default
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  useEffect(() => {
    loadMeetingData();
  }, [userId, meetingId]);

  const loadMeetingData = async () => {
    try {
      const response = await api.get(`/api/focus-scene/${userId}/${meetingId}`);
      setMeeting(response.data.meeting);
      setLoading(false);

      // Auto-progress to mind state selector (increased from 3s to 5s for better pacing)
      setTimeout(() => setCurrentPhase('mindstate'), 5000);
    } catch (error: any) {
      console.error('Error loading meeting data:', error);
      setLoading(false);
      
      // If session is already completed, show message and redirect to dashboard
      if (error.response?.status === 403) {
        console.log('⚠️ Session already completed - redirecting to dashboard');
        // Immediately redirect without alert
        window.location.href = '/dashboard';
      }
    }
  };

  const handleBreathingComplete = () => {
    setBreathingCompleted(true);
    // Add 2-second pause after breathing before reflection (increased from 1s)
    setTimeout(() => setCurrentPhase('reflection'), 2000);
  };

  const handleMindStateSelect = async (state: MindState) => {
    setMindState(state);
    setLoadingAiMessage(true);
    setCurrentPhase('ai-message');
    
    try {
      // Generate AI message based on mind state
      // Fallback chain: OpenAI → Gemini → Template messages
      const response = await api.post(`/api/focus-scene/${userId}/${meetingId}/ai-message`, {
        mindState: state,
      });
      
      setAiMessage(response.data.message);
      setLoadingAiMessage(false);
      
      // Log which provider was used
      if (response.data.fallback) {
        console.log('⚠️ Using template message fallback (OpenAI & Gemini unavailable)');
      } else {
        console.log('✅ AI-generated message received');
      }
      
      // Auto-progress to breathing after showing message (10 seconds for reading)
      setTimeout(() => setCurrentPhase('breathing'), 10000);
    } catch (error) {
      console.error('❌ Error generating AI message:', error);
      // Client-side fallback (should rarely happen as server has fallbacks)
      setAiMessage(getFallbackMessage(state));
      setLoadingAiMessage(false);
      setTimeout(() => setCurrentPhase('breathing'), 10000);
    }
  };
  
  const getFallbackMessage = (state: MindState): string => {
    const messages = {
      calm: "You're already in a good place. Let's maintain that centered energy as you prepare.",
      stressed: "I see you're feeling the pressure. Let's take a moment to ground yourself and release that tension.",
      focused: "Great energy! Let's channel that focus and sharpen your presence for this meeting.",
      unclear: "Feeling foggy is normal. Let's bring some clarity and presence to this moment together.",
    };
    return messages[state];
  };

  const handleComplete = async () => {
    try {
      await api.post(`/api/focus-scene/${userId}/${meetingId}/complete`, {
        breathingExerciseCompleted: breathingCompleted,
        intention: reflectionNotes || undefined, // User's stated focus for the meeting
        mindState: mindState || undefined,
      });
      setCurrentPhase('complete');
      
      // Auto-close after 4 seconds to return user to their workflow
      setTimeout(() => {
        // Try to close the window/tab
        window.close();
        
        // If window.close() doesn't work (some browsers block it),
        // redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }, 4000);
    } catch (error) {
      console.error('Error completing focus session:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-2xl"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="text-white text-xl">Meeting not found</div>
      </div>
    );
  }

  // Get narration text based on current phase
  const getNarrationText = (): string => {
    switch (currentPhase) {
      case 'intro':
        return `Welcome to your focus session. You have a meeting coming up: ${meeting?.title}. Let's take a few minutes to prepare mentally.`;
      case 'mindstate':
        return 'How are you feeling right now? Take a moment to check in with yourself, and select the state that best describes your current mindset.';
      case 'ai-message':
        return aiMessage;
      case 'breathing':
        // Return intro text once, then the breathing component handles prompts
        return 'Now, let\'s begin your breathing exercise. Follow the visual guide and listen to the prompts. Breathe slowly and deeply, letting each breath ground you in this moment.';
      case 'reflection':
        return 'As you prepare to enter your meeting, take a moment to set your intention. What do you want to bring to this conversation?';
      case 'complete':
        return 'You\'re ready. Step into this meeting with clarity and presence.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white overflow-hidden">
      {/* Voice Narration - Active in ALL phases */}
      {meeting && (
        <VoiceNarrator
          text={getNarrationText()}
          enabled={voiceEnabled}
          onToggle={() => setVoiceEnabled(!voiceEnabled)}
          onSpeaking={setIsVoiceSpeaking}
          autoPlay={true}
        />
      )}

      {/* Ambient Sound Player - Show from mind state selection onwards, dim when voice speaks */}
      {(currentPhase === 'mindstate' || currentPhase === 'ai-message' || currentPhase === 'breathing' || currentPhase === 'reflection' || currentPhase === 'complete') && (
        <AmbientSound
          soundType={meeting?.soundPreferences?.soundType || 'calm-ocean'}
          enabled={meeting?.soundPreferences?.enabled ?? true}
          dimVolume={isVoiceSpeaking}
        />
      )}
      
      <AnimatePresence mode="wait">
        {currentPhase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative"
          >
            {/* Animated background particles */}
            <motion.div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ 
                delay: 0.3,
                duration: 0.8,
                type: "spring",
                stiffness: 100
              }}
              className="text-center max-w-3xl relative z-10"
            >
              <motion.div 
                className="text-6xl mb-8"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                🎬
              </motion.div>
              <motion.h1 
                className="text-5xl font-bold mb-6 text-balance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                {meeting.title}
              </motion.h1>
              <motion.p 
                className="text-2xl text-purple-200 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.8 }}
              >
                {meeting.cueContent}
              </motion.p>
            </motion.div>

            {/* Progress indicator */}
            <motion.div
              className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-white/40 text-sm"
              >
                Preparing your focus moment...
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {currentPhase === 'mindstate' && (
          <motion.div
            key="mindstate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8 sm:mb-12 max-w-2xl"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">How are you feeling right now?</h2>
              <p className="text-lg sm:text-xl text-purple-200">
                We'll adapt your breathing flow to support your current state
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl"
            >
              {[
                { state: 'calm' as MindState, emoji: '😌', label: 'Calm', description: 'Centered and peaceful', color: 'from-blue-500 to-cyan-500' },
                { state: 'stressed' as MindState, emoji: '😰', label: 'Stressed', description: 'Tense or overwhelmed', color: 'from-red-500 to-orange-500' },
                { state: 'focused' as MindState, emoji: '🎯', label: 'Focused', description: 'Alert and ready', color: 'from-amber-500 to-yellow-500' },
                { state: 'unclear' as MindState, emoji: '🌫️', label: 'Unclear', description: 'Foggy or uncertain', color: 'from-purple-500 to-pink-500' },
              ].map((option, index) => (
                <motion.button
                  key={option.state}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMindStateSelect(option.state)}
                  className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${option.color} text-white text-left transition-all hover:shadow-2xl`}
                >
                  <div className="text-4xl sm:text-5xl mb-3">{option.emoji}</div>
                  <div className="text-xl sm:text-2xl font-bold mb-2">{option.label}</div>
                  <div className="text-sm sm:text-base text-white/80">{option.description}</div>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {currentPhase === 'ai-message' && (
          <motion.div
            key="ai-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center max-w-2xl"
            >
              {loadingAiMessage ? (
                <>
                  <motion.div
                    className="text-6xl mb-6"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    ✨
                  </motion.div>
                  <p className="text-2xl text-purple-200">
                    Personalizing your experience...
                  </p>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                    className="text-6xl mb-6"
                  >
                    {mindState === 'calm' && '😌'}
                    {mindState === 'stressed' && '😰'}
                    {mindState === 'focused' && '🎯'}
                    {mindState === 'unclear' && '🌫️'}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl sm:text-3xl text-white leading-relaxed mb-8"
                  >
                    {aiMessage}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-purple-300 text-sm"
                  >
                    Preparing your breathing flow...
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {currentPhase === 'breathing' && mindState && (
          <motion.div
            key="breathing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pt-24 sm:pt-8"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute top-4 right-4 sm:top-8 sm:right-8"
            >
              <CountdownTimer
                startTime={new Date(meeting.startTime)}
              />
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <AdaptiveBreathingFlow
                mindState={mindState}
                onComplete={handleBreathingComplete}
              />
            </motion.div>
          </motion.div>
        )}

        {currentPhase === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 pt-24 sm:pt-8"
          >
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
              <CountdownTimer
                startTime={new Date(meeting.startTime)}
              />
            </div>

            <div className="max-w-2xl w-full">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-semibold mb-4">Set Your Intention</h2>
                <p className="text-xl text-purple-200">
                  What's your focus for this meeting?
                </p>
              </motion.div>

              <motion.textarea
                id="intention-notes"
                name="intention"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Optional: Write your intention..."
                className="w-full h-32 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                aria-label="Meeting intention notes"
              />

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-4 mt-8"
              >
                <button
                  onClick={handleComplete}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
                >
                  I'm Ready →
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {currentPhase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
          >
            {/* Confetti particles */}
            <motion.div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${50}%`,
                    top: '20%',
                    background: ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD'][i % 5],
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 0,
                    scale: 0 
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 1000,
                    y: Math.random() * 800 + 200,
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1, 1, 0.5],
                    rotate: Math.random() * 720,
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    ease: "easeOut",
                    delay: i * 0.02,
                  }}
                />
              ))}
            </motion.div>

            {/* Spotlight effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-radial from-white/10 via-transparent to-transparent"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* Main content */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 150, 
                damping: 12,
                delay: 0.2 
              }}
              className="text-9xl mb-8 relative z-10"
            >
              ✨
            </motion.div>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center relative z-10"
            >
              <motion.h2 
                className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Scene Wrapped
              </motion.h2>
              <motion.p 
                className="text-3xl text-purple-100 font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Step in with confidence.
              </motion.p>
            </motion.div>

            {/* Success checkmarks */}
            <motion.div
              className="mt-12 flex gap-6 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <span className="text-green-400 text-xl">✓</span>
                <span className="text-sm">Centered</span>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <span className="text-green-400 text-xl">✓</span>
                <span className="text-sm">Focused</span>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
              >
                <span className="text-green-400 text-xl">✓</span>
                <span className="text-sm">Ready</span>
              </motion.div>
            </motion.div>

            {/* Pulsing glow effect */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2, duration: 0.6 }}
              className="mt-16 text-center text-purple-300 relative z-10"
            >
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-lg"
              >
                You're ready to shine ⭐
              </motion.p>
              <motion.p 
                className="text-sm mt-4 opacity-60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
              >
                Returning to your meeting in a moment...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

