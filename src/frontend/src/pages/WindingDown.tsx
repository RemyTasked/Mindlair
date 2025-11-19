import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';
import AmbientSound from '../components/AmbientSound';

type Phase = 'opening' | 'breathing' | 'visualization' | 'closing' | 'complete';

export default function WindingDown() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState<Phase>('opening');
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    localStorage.setItem('meetcute_autoplay_sound', 'true');
    window.dispatchEvent(new CustomEvent('ambient-sound-play', {
      detail: { source: 'winding-down-page' }
    }));

    return () => {
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'winding-down-page' }
      }));
    };
  }, []);

  useEffect(() => {
    fetchSessionData();
  }, [userId]);

  const fetchSessionData = async () => {
    try {
      const response = await api.get(`/api/winding-down/${userId}`);
      setSessionData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching winding down session:', error);
      setLoading(false);
    }
  };

  const handlePhaseTransition = (nextPhase: Phase) => {
    if (transitioning) return; // Prevent double-clicks
    
    setTransitioning(true);
    setTimeout(() => {
      setCurrentPhase(nextPhase);
      setTransitioning(false);
    }, 300); // Small delay for smooth transition
  };

  const completeSession = async () => {
    if (transitioning) return;
    
    setTransitioning(true);
    try {
      const duration = Math.floor((Date.now() - startTime) / 1000); // Duration in seconds
      await api.post(`/api/winding-down/complete/${userId}`, { duration });
      console.log('Winding down session marked as complete');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing winding down session:', error);
      // Navigate anyway
      navigate('/dashboard');
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-teal-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your winding down session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-teal-900 to-indigo-900 text-white overflow-hidden relative">
      {/* Ambient Sound */}
      <AmbientSound
        soundType={sessionData?.focusSoundType || 'calm-ocean'}
        enabled={sessionData?.enableFocusSound !== false}
        stopOnNavigation={false}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {/* Opening Scene */}
          {currentPhase === 'opening' && (
            <motion.div
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto text-center min-h-screen flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl mb-8"
              >
                🌙
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent"
              >
                Time to Wind Down
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl sm:text-2xl text-teal-200 mb-12 max-w-2xl"
              >
                The day is done. Let's release the tension, quiet your mind, and prepare your body for restful sleep.
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => handlePhaseTransition('breathing')}
                disabled={transitioning}
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-indigo-600 rounded-full text-lg font-semibold hover:from-teal-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Begin Winding Down →
              </motion.button>
            </motion.div>
          )}

          {/* Extended Breathing Phase */}
          {currentPhase === 'breathing' && (
            <motion.div
              key="breathing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto text-center min-h-screen flex flex-col items-center justify-center"
            >
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-indigo-200 to-teal-200 bg-clip-text text-transparent"
              >
                Deep Breathing
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-teal-200 mb-12 max-w-2xl mx-auto"
              >
                Let's release the day's tension with a longer, deeper breathing exercise. 
                Allow yourself to fully relax and prepare for restful sleep.
              </motion.p>

              {/* Extended Breathing Circle - Slower, Longer */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 12, // Longer breath cycles
                  repeat: 8,    // More cycles for deeper relaxation
                  ease: "easeInOut",
                }}
                className="mx-auto w-56 h-56 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-indigo-500/40 to-teal-500/40 backdrop-blur-xl border-4 border-indigo-400/60 flex items-center justify-center mb-12 relative overflow-hidden"
              >
                {/* Inner glow effect */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 12,
                    repeat: 8,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-teal-400/30 to-indigo-400/30 rounded-full blur-2xl"
                />

                <div className="relative z-10 text-center">
                  <motion.div
                    animate={{
                      opacity: [1, 0.6, 1],
                    }}
                    transition={{
                      duration: 12,
                      repeat: 8,
                      ease: "easeInOut",
                    }}
                    className="text-6xl mb-4"
                  >
                    🌙
                  </motion.div>
                  <div className="text-lg text-indigo-100 font-medium">
                    Breathe deeply
                  </div>
                </div>
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
                className="text-teal-200 text-lg mb-12"
              >
                Inhale for 4 seconds • Hold for 4 seconds • Exhale for 4 seconds
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 30 }}
                onClick={() => handlePhaseTransition('visualization')}
                disabled={transitioning}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Visualization →
              </motion.button>
            </motion.div>
          )}

          {/* Visualization Phase */}
          {currentPhase === 'visualization' && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto text-center min-h-screen flex flex-col items-center justify-center px-4"
            >
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl sm:text-5xl font-bold mb-8 bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent"
              >
                Release & Rest
              </motion.h2>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-8 text-lg text-teal-100 max-w-2xl"
              >
                <p className="leading-relaxed">
                  Imagine the day's energy gently flowing out of your body with each exhale...
                </p>

                <p className="leading-relaxed">
                  Your shoulders drop, your jaw relaxes, your mind quiets...
                </p>

                <p className="leading-relaxed">
                  You did what you could today. Tomorrow is a new scene, a fresh start.
                </p>

                <p className="leading-relaxed">
                  For now, rest. You've earned it.
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 20 }}
                onClick={() => handlePhaseTransition('closing')}
                disabled={transitioning}
                className="mt-12 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Session →
              </motion.button>
            </motion.div>
          )}

          {/* Closing Scene */}
          {currentPhase === 'closing' && (
            <motion.div
              key="closing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto text-center min-h-screen flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl mb-8"
              >
                ✨
              </motion.div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-teal-200 to-indigo-200 bg-clip-text text-transparent"
              >
                Rest Well
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-teal-200 mb-12 max-w-2xl"
              >
                Your mind and body are ready for restorative sleep. Dream well, and we'll see you tomorrow.
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={completeSession}
                disabled={transitioning}
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-indigo-600 rounded-full text-lg font-semibold hover:from-teal-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transitioning ? 'Completing...' : 'Return to Dashboard'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}

