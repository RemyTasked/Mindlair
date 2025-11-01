import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Calendar, Clock } from 'lucide-react';

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
}

type Phase = 'opening' | 'lineup' | 'mindset' | 'visualization' | 'closing' | 'complete';

export default function PresleyFlow() {
  const { userId, date } = useParams();
  const [flowData, setFlowData] = useState<PresleyFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<Phase>('opening');
  const [journalNote, setJournalNote] = useState('');
  const [isBreathing, setIsBreathing] = useState(false);

  useEffect(() => {
    loadFlowData();
  }, [userId, date]);

  const loadFlowData = async () => {
    try {
      const response = await axios.get(`/api/presley-flow/${userId}/${date}`);
      setFlowData(response.data.flow);
      setLoading(false);
      
      // Auto-progress from opening to lineup after 5 seconds
      setTimeout(() => setCurrentPhase('lineup'), 5000);
    } catch (error) {
      console.error('Error loading Presley Flow:', error);
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await axios.post(`/api/presley-flow/${userId}/${date}/complete`, {
        journalNote: journalNote.trim() || undefined,
        completedAt: new Date(),
      });
      setCurrentPhase('complete');
    } catch (error) {
      console.error('Error completing Presley Flow:', error);
    }
  };

  if (loading) {
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
            🌙
          </motion.div>
          Preparing your evening rehearsal...
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
              🌙
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
                Preparing tomorrow's scenes...
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* Tomorrow's Line-Up */}
        {currentPhase === 'lineup' && (
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
                <h2 className="text-4xl font-bold">Tomorrow's Line-Up</h2>
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
                Set Tomorrow's Mindset →
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
                Tomorrow's Mindset
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
                  What intention will you carry tomorrow?
                </label>
                <textarea
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder="Optional: Write your intention for tomorrow..."
                  className="w-full h-32 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => {
                  setCurrentPhase('visualization');
                  setIsBreathing(true);
                }}
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
                onClick={() => setCurrentPhase('closing')}
                className="mt-12 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-all"
              >
                Continue →
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
              Tomorrow's rehearsal is complete. Rest well—your morning recap awaits.
            </p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-purple-300 text-sm"
            >
              You can close this window now
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

