import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import AmbientSound from '../components/AmbientSound';

interface PresleyFlowData {
  openingScene: string;
  meetingPreviews: Array<{
    title: string;
    time: string;
    focusCue: string;
  }>;
  mindsetTheme: string;
  visualizationScript: string;
  closingMessage: string;
  date: string;
  timeOfDay?: string;
  meetingDay?: string;
  dailyOutcomes?: string; // AI summary of today's meetings (evening only)
  isWeekendFlow?: boolean; // Weekend intermission flow
}

type Phase = 'opening' | 'wrapup' | 'reflection' | 'lineup' | 'mindset' | 'visualization' | 'unwind-breathing' | 'extended-visualization' | 'closing' | 'complete';

export default function PresleyFlow() {
  const { userId, date } = useParams();
  const navigate = useNavigate();
  const [flowData, setFlowData] = useState<PresleyFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<Phase>('opening');
  const [journalNote, setJournalNote] = useState('');
  const [performanceRating, setPerformanceRating] = useState<number | null>(null);
  const [improvementNotes, setImprovementNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('meetcute_autoplay_sound', 'true');
    window.dispatchEvent(new CustomEvent('ambient-sound-play', {
      detail: { source: 'presley-flow-page' }
    }));

    return () => {
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'presley-flow-page' }
      }));
    };
  }, []);

  useEffect(() => {
    loadFlowData();
  }, [userId, date]);

  const loadFlowData = async () => {
    try {
      const response = await api.get(`/api/presley-flow/${userId}/${date}`);
      const flow = response.data.flow;
      setFlowData(flow);
      setLoading(false);
      
      // Auto-progress from opening
      setTimeout(() => {
        if (flow.isWeekendFlow) {
          // Weekend flow: skip to mindset (no meetings to review)
          setCurrentPhase('mindset');
        } else if (flow.timeOfDay === 'evening' && flow.dailyOutcomes) {
          // Evening with wrap-up
          setCurrentPhase('wrapup');
        } else {
          // Normal flow: go to lineup
          setCurrentPhase('lineup');
        }
      }, 5000);
    } catch (error) {
      console.error('Error loading Presley Flow:', error);
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/api/presley-flow/${userId}/${date}/complete`, {
        journalNote: journalNote.trim() || undefined,
        completedAt: new Date(),
        performanceRating: performanceRating || undefined,
        improvementNotes: improvementNotes.trim() || undefined,
      });
      setCurrentPhase('complete');
      
      // Auto-redirect to dashboard after 4 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 4000);
    } catch (error) {
      console.error('Error completing Presley Flow:', error);
    }
  };

  if (loading) {
    const currentHour = new Date().getHours();
    const isMorning = currentHour < 14;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl text-center mb-4"
          >
            {isMorning ? '🌅' : '🌙'}
          </motion.div>
          {isMorning ? 'Preparing your morning flow...' : 'Preparing your evening rehearsal...'}
        </motion.div>
      </div>
    );
  }

  if (!flowData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold mb-2">No Presley Flow Available</h2>
          <p className="text-purple-200">No meetings scheduled for tomorrow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Ambient Sound - calm ocean for Presley Flow morning ritual */}
      <AmbientSound 
        soundType="calm-ocean" 
        enabled={true}
        stopOnNavigation={false}
      />
      
      {/* Ambient background stars */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Opening Scene */}
        {currentPhase === 'opening' && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
              className="text-8xl mb-8"
            >
              {flowData.timeOfDay === 'morning' ? '🌅' : '🌙'}
            </motion.div>
            
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center max-w-3xl"
            >
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 bg-clip-text text-transparent">
                Presley Flow Session
              </h1>
              <p className="text-2xl text-purple-200 leading-relaxed">
                {flowData.openingScene}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="absolute bottom-12 text-purple-300 text-sm"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {flowData.meetingDay === 'today' 
                  ? "Preparing today's scenes..." 
                  : "Preparing tomorrow's scenes..."}
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Daily Wrap-Up (Evening Only) */}
        {currentPhase === 'wrapup' && flowData.dailyOutcomes && (
          <motion.div
            key="wrapup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-4xl"
            >
              <div className="flex items-center justify-center gap-3 mb-12">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="text-6xl"
                >
                  ☀️
                </motion.div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-200 via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Today's Reflection
                </h2>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8"
              >
                <p className="text-xl text-purple-100 leading-relaxed whitespace-pre-line">
                  {flowData.dailyOutcomes}
                </p>
              </motion.div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => setCurrentPhase('reflection')}
                className="mt-12 mx-auto block px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-semibold text-lg hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
              >
                Reflect & Plan Ahead →
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Evening Reflection (Evening Only) */}
        {currentPhase === 'reflection' && flowData.timeOfDay === 'evening' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-4xl"
            >
              <div className="flex items-center justify-center gap-3 mb-12">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl"
                >
                  💭
                </motion.div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 bg-clip-text text-transparent">
                  How Did Today Go?
                </h2>
              </div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-8"
              >
                {/* Performance Rating */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                  <h3 className="text-xl font-semibold mb-4 text-purple-200">
                    Rate Your Performance Today
                  </h3>
                  <p className="text-purple-100 mb-6">
                    How satisfied are you with how you showed up in today's meetings?
                  </p>
                  <div className="flex gap-4 justify-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <motion.button
                        key={rating}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPerformanceRating(rating)}
                        className={`w-16 h-16 rounded-full font-bold text-2xl transition-all ${
                          performanceRating === rating
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/50'
                            : 'bg-white/10 text-purple-200 hover:bg-white/20'
                        }`}
                      >
                        {rating}⭐
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-center text-purple-300 text-sm mt-4">
                    1 = Struggled • 5 = Thrived
                  </p>
                </div>

                {/* Improvement Notes */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                  <h3 className="text-xl font-semibold mb-4 text-purple-200">
                    What Would Help Next Time?
                  </h3>
                  <p className="text-purple-100 mb-6">
                    Reflect on what you'd like to improve or adjust for your next meetings.
                  </p>
                  <textarea
                    value={improvementNotes}
                    onChange={(e) => setImprovementNotes(e.target.value)}
                    placeholder="I want to work on... I need to focus more on... Next time I'll try..."
                    className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <p className="text-purple-300 text-sm mt-3">
                    💡 Your insights help our AI provide better support and track your growth over time
                  </p>
                </div>

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={() => setCurrentPhase('lineup')}
                  disabled={performanceRating === null}
                  className={`mt-8 mx-auto block px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg ${
                    performanceRating === null
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 shadow-purple-500/30'
                  }`}
                >
                  {performanceRating === null ? 'Rate Your Day First' : 'Continue to Tomorrow →'}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Tomorrow's Line-Up (skip for weekend flow) */}
        {currentPhase === 'lineup' && !flowData.isWeekendFlow && (
          <motion.div
            key="lineup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-4xl"
            >
              <div className="flex items-center justify-center gap-3 mb-12">
                <Calendar className="w-8 h-8 text-purple-300" />
                <h2 className="text-4xl font-bold">
                  {flowData.meetingDay === 'today' ? "Today's Line-Up" : "Tomorrow's Line-Up"}
                </h2>
              </div>

              <div className="space-y-6">
                {flowData.meetingPreviews.map((meeting, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg"
                      >
                        {index + 1}
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-purple-300" />
                          <span className="text-purple-300 text-sm">{meeting.time}</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
                        <p className="text-purple-200 italic">"{meeting.focusCue}"</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: flowData.meetingPreviews.length * 0.2 + 0.5 }}
                onClick={() => setCurrentPhase('mindset')}
                className="mt-12 mx-auto block px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
              >
                Set {flowData.meetingDay === 'today' ? "Today's" : "Tomorrow's"} Mindset →
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Mindset Setup */}
        {currentPhase === 'mindset' && (
          <motion.div
            key="mindset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <div className="max-w-3xl w-full">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold text-center mb-8"
              >
                {flowData.isWeekendFlow ? "Weekend Mindset" : flowData.meetingDay === 'today' ? "Today's Mindset" : "Tomorrow's Mindset"}
              </motion.h2>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-md border border-purple-500/30 rounded-3xl p-12 mb-8"
              >
                <p className="text-2xl text-center leading-relaxed text-purple-100">
                  {flowData.mindsetTheme}
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-purple-200 mb-3 text-center">
                  {flowData.isWeekendFlow 
                    ? "What would feel good this weekend?" 
                    : `What intention will you carry ${flowData.meetingDay === 'today' ? 'today' : 'tomorrow'}?`}
                </label>
                <textarea
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder={flowData.isWeekendFlow 
                    ? "Optional: What brings you joy? What helps you recharge?..." 
                    : `Optional: Write your intention for ${flowData.meetingDay === 'today' ? 'today' : 'tomorrow'}...`}
                  className="w-full h-32 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => setCurrentPhase('visualization')}
                className="mt-8 mx-auto block px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
              >
                Begin Visualization →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Visualization */}
        {currentPhase === 'visualization' && (
          <motion.div
            key="visualization"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <div className="max-w-3xl w-full text-center">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-12"
              >
                Visualization Moment
              </motion.h2>

              {/* Breathing Circle */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: 5,
                  ease: "easeInOut",
                }}
                className="mx-auto w-64 h-64 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 backdrop-blur-xl border-4 border-purple-500/50 flex items-center justify-center mb-12"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 6,
                    repeat: 5,
                    ease: "easeInOut",
                  }}
                  className="text-6xl"
                >
                  ✨
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl leading-relaxed text-purple-100 max-w-2xl mx-auto"
              >
                {flowData.visualizationScript}
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 30 }}
                onClick={() => {
                  // Evening flows get extended unwind breathing + visualization
                  if (flowData.timeOfDay === 'evening') {
                    setCurrentPhase('unwind-breathing');
                  } else {
                    setCurrentPhase('closing');
                  }
                }}
                className="mt-12 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-all"
              >
                {flowData.timeOfDay === 'evening' ? 'Begin Evening Unwind →' : 'Continue →'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Evening Unwind Breathing */}
        {currentPhase === 'unwind-breathing' && (
          <motion.div
            key="unwind-breathing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <div className="max-w-3xl w-full text-center">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-6"
              >
                🌙 Evening Unwind
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto"
              >
                Let's release the day's tension with a longer, deeper breathing exercise. 
                Allow yourself to fully relax and prepare for restful sleep.
              </motion.p>

              {/* Extended Breathing Circle - Slower, Longer */}
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                }}
                transition={{
                  duration: 12, // Longer breath cycles (was 6)
                  repeat: 8,    // More cycles for deeper relaxation
                  ease: "easeInOut",
                }}
                className="mx-auto w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 backdrop-blur-xl border-4 border-indigo-400/60 flex items-center justify-center mb-12 relative overflow-hidden"
              >
                {/* Pulsing inner glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 12,
                    repeat: 8,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full"
                />
                
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 12,
                    repeat: 8,
                    ease: "easeInOut",
                  }}
                  className="text-7xl z-10"
                >
                  🌊
                </motion.div>
              </motion.div>

              {/* Breathing Instructions */}
              <motion.div
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 12,
                  repeat: 8,
                  ease: "easeInOut",
                }}
                className="text-2xl font-light text-purple-100 mb-8"
              >
                Breathe deeply... Release... Relax...
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-purple-300 mb-8"
              >
                8 slow breath cycles • 12 seconds each • Total: ~2 minutes
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 96 }} // After 8 cycles * 12 seconds
                onClick={() => setCurrentPhase('extended-visualization')}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-all"
              >
                Continue to Visualization →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Extended Evening Visualization */}
        {currentPhase === 'extended-visualization' && (
          <motion.div
            key="extended-visualization"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <div className="max-w-3xl w-full text-center">
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-bold mb-6"
              >
                ✨ Extended Visualization
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto"
              >
                {flowData.isWeekendFlow 
                  ? "See yourself letting go of the week's tension... Your shoulders drop, your breath deepens... You're free to enjoy this time however you wish."
                  : `Now, see yourself in ${flowData.meetingDay === 'today' ? "today's" : "tomorrow's"} meetings. Confident, calm, and in control. Watch yourself succeed with clarity and grace.`}
              </motion.p>

              {/* Larger, More Immersive Visualization Circle */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: 3,
                  ease: "linear",
                }}
                className="mx-auto w-96 h-96 rounded-full bg-gradient-to-br from-purple-600/30 via-indigo-600/30 to-pink-600/30 backdrop-blur-xl border-4 border-purple-400/60 flex items-center justify-center mb-12 relative overflow-hidden"
              >
                {/* Animated gradient overlay */}
                <motion.div
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 10,
                    repeat: 6,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full"
                />
                
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, -360, 0],
                  }}
                  transition={{
                    duration: 20,
                    repeat: 3,
                    ease: "easeInOut",
                  }}
                  className="text-8xl z-10"
                >
                  🌟
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-6 text-xl leading-relaxed text-purple-100 max-w-2xl mx-auto mb-12"
              >
                <p>
                  You walk into each meeting feeling prepared and confident...
                </p>
                <p>
                  You communicate clearly, listen deeply, and contribute meaningfully...
                </p>
                <p>
                  You handle challenges with calm and creativity...
                </p>
                <p>
                  You leave each meeting feeling accomplished and energized...
                </p>
                <p className="text-purple-200 font-semibold">
                  {flowData.meetingDay === 'today' ? 'Today' : 'Tomorrow'} is already a success. You've got this. 🌙
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 60 }} // After ~1 minute of visualization
                onClick={() => setCurrentPhase('closing')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 rounded-full font-semibold transition-all shadow-lg"
              >
                Complete Evening Flow →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Closing */}
        {currentPhase === 'closing' && (
          <motion.div
            key="closing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="text-8xl mb-8"
            >
              🌟
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center max-w-2xl"
            >
              <p className="text-3xl leading-relaxed text-purple-100 mb-8">
                {flowData.closingMessage}
              </p>

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                onClick={handleComplete}
                className="px-12 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
              >
                Complete Session
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Complete */}
        {currentPhase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="text-8xl mb-8"
            >
              🌙
            </motion.div>

            <h2 className="text-4xl font-bold mb-4">Session Complete</h2>
            <p className="text-xl text-purple-200 mb-8 text-center max-w-md">
              {flowData?.timeOfDay === 'evening' 
                ? "Tomorrow's rehearsal is complete. Rest well—your morning recap awaits." 
                : "You're ready. Go show them what you've got."}
            </p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Return to Dashboard
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

