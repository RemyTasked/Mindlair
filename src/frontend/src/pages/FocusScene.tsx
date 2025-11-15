import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import CountdownTimer from '../components/CountdownTimer';
import AmbientSound from '../components/AmbientSound';
import Level2CueCompanion from '../components/Level2CueCompanion';
import PrepModeFlow from '../components/PrepModeFlow';
import { LOGO_PATHS } from '../config/constants';

type PrepMode = 'clarity' | 'confidence' | 'connection' | 'composure' | 'momentum';

interface PrepModeInfo {
  id: PrepMode;
  name: string;
  tagline: string;
  icon: string;
  bestFor: string;
  color: string;
}

interface MeetingData {
  title: string;
  startTime: string;
  cueContent: string;
  recommendedMode?: PrepMode;
  recommendationReason?: string;
  soundPreferences?: {
    enabled: boolean;
    soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  };
}

const PREP_MODES: PrepModeInfo[] = [
  {
    id: 'clarity',
    name: 'Clarity Mode',
    tagline: 'What matters most?',
    icon: '🧠',
    bestFor: 'Messy agendas, decision meetings, fast-paced teams',
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'confidence',
    name: 'Confidence Mode',
    tagline: 'Steady & strong',
    icon: '💪',
    bestFor: 'Presentations, interviews, high-stakes rooms',
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'connection',
    name: 'Connection Mode',
    tagline: 'Human first',
    icon: '❤️',
    bestFor: '1:1s, feedback, conflict resolution',
    color: 'from-rose-600 to-orange-600',
  },
  {
    id: 'composure',
    name: 'Composure Mode',
    tagline: 'Protect your energy',
    icon: '🌿',
    bestFor: 'Stressful meetings, overwhelm, back-to-back days',
    color: 'from-green-600 to-teal-600',
  },
  {
    id: 'momentum',
    name: 'Momentum Mode',
    tagline: 'Let\'s move this forward',
    icon: '🏃',
    bestFor: 'Standups, status updates, projects you\'re stuck on',
    color: 'from-indigo-600 to-blue-600',
  },
];

export default function FocusScene() {
  const { userId, meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'mode-select' | 'prep-flow' | 'reflection' | 'complete'>('intro');
  const [selectedMode, setSelectedMode] = useState<PrepMode | null>(null);
  const [prepFlowResponses, setPrepFlowResponses] = useState<Record<string, string>>({});
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [level2Enabled, setLevel2Enabled] = useState(false); // Level 2 is opt-in per meeting
  const [isCalibrating, setIsCalibrating] = useState(false); // Track Level 2 calibration state

  useEffect(() => {
    loadMeetingData();
  }, [userId, meetingId]);

  useEffect(() => {
    if (!meeting) return;

    if (meeting.soundPreferences?.enabled === false) {
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-scene', meetingId: meetingId }
      }));
      return;
    }

    localStorage.setItem('meetcute_autoplay_sound', 'true');
    window.dispatchEvent(new CustomEvent('ambient-sound-play', {
      detail: { source: 'focus-scene', meetingId: meetingId, soundType: meeting.soundPreferences?.soundType }
    }));

    return () => {
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-scene', meetingId: meetingId }
      }));
    };
  }, [meeting, meetingId]);

  const loadMeetingData = async () => {
    try {
      const response = await api.get(`/api/focus-scene/${userId}/${meetingId}`);
      setMeeting(response.data.meeting);
      setLoading(false);

      // Auto-progress to mode selector (increased from 3s to 5s for better pacing)
      setTimeout(() => setCurrentPhase('mode-select'), 5000);
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

  const handleComplete = async () => {
    try {
      await api.post(`/api/focus-scene/${userId}/${meetingId}/complete`, {
        prepMode: selectedMode,
        prepFlowResponses: prepFlowResponses,
        intention: reflectionNotes || undefined, // User's stated focus for the meeting
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white overflow-hidden">
      {/* Ambient Sound Player - Primary calming element (muted during Level 2 calibration) */}
      {(currentPhase === 'prep-flow' || currentPhase === 'reflection' || currentPhase === 'complete') && (
        <AmbientSound
          soundType={meeting?.soundPreferences?.soundType || 'calm-ocean'}
          enabled={(meeting?.soundPreferences?.enabled ?? true) && !isCalibrating}
          stopOnNavigation={false}
        />
      )}

      {/* Level 2 Cue Companion - Real-time composure coach (opt-in during meeting) */}
      {(currentPhase === 'reflection' || currentPhase === 'complete') && (
        <Level2CueCompanion
          enabled={level2Enabled}
          onToggle={setLevel2Enabled}
          onCalibrationChange={setIsCalibrating}
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
                className="mb-8"
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
                <img
                  src={LOGO_PATHS.main}
                  alt="Meet Cute Logo"
                  className="w-20 h-20 mx-auto"
                />
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

        {/* Mode Selection Phase */}
        {currentPhase === 'mode-select' && (
          <motion.div
            key="mode-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-8 sm:mb-12 max-w-3xl"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Choose Your Prep Mode</h2>
              <p className="text-lg sm:text-xl text-purple-200">
                Different meetings need different preparation. What do you need most right now?
              </p>
              {meeting?.recommendedMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 max-w-md mx-auto"
                >
                  <div className="px-5 py-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">💡</span>
                      <span className="text-sm font-bold text-purple-300">
                        Recommended: {PREP_MODES.find(m => m.id === meeting.recommendedMode)?.name}
                      </span>
                    </div>
                    {meeting?.recommendationReason && (
                      <p className="text-xs text-purple-200/80 leading-relaxed">
                        {meeting.recommendationReason}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {PREP_MODES.map((mode, index) => (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => {
                    setSelectedMode(mode.id);
                    setCurrentPhase('prep-flow');
                  }}
                  className={`
                    relative p-6 rounded-2xl text-left transition-all duration-300
                    bg-white/5 backdrop-blur-sm border-2 border-white/10
                    hover:bg-white/10 hover:border-white/30 hover:scale-105
                    ${meeting?.recommendedMode === mode.id ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900' : ''}
                  `}
                >
                  {meeting?.recommendedMode === mode.id && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                      RECOMMENDED
                    </div>
                  )}
                  
                  <div className={`text-4xl mb-3 bg-gradient-to-br ${mode.color} bg-clip-text text-transparent`}>
                    {mode.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">{mode.name}</h3>
                  <p className="text-purple-300 text-sm mb-3 italic">"{mode.tagline}"</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Best for: {mode.bestFor}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Prep Mode Flow - 5-step scripted flow based on selected mode */}
        {currentPhase === 'prep-flow' && selectedMode && meeting && (
          <motion.div
            key="prep-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PrepModeFlow
              mode={selectedMode}
              onComplete={(responses) => {
                setPrepFlowResponses(responses);
                setCurrentPhase('reflection');
              }}
            />
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
                className="text-lg mb-6"
              >
                You're ready to shine ⭐
              </motion.p>
              
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5 }}
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-white"
              >
                Return to Dashboard
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

