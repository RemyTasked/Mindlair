import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdaptiveBreathingFlow from '../components/AdaptiveBreathingFlow';
import CountdownTimer from '../components/CountdownTimer';
import AmbientSound from '../components/AmbientSound';
import { LOGO_PATHS } from '../config/constants';

export default function FocusSceneDemo() {
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'breathing' | 'reflection' | 'complete'>('intro');
  const [reflectionNotes, setReflectionNotes] = useState('');

  // Demo meeting data
  const meeting = {
    title: 'Product Strategy Meeting',
    startTime: new Date(Date.now() + 5 * 60 * 1000),
    cueContent: 'This is your moment to center yourself. Take a deep breath, review your goals for this conversation, and step in with confidence and clarity.',
  };

  const handleBreathingComplete = () => {
    setTimeout(() => setCurrentPhase('reflection'), 1000);
  };

  const handleComplete = () => {
    setCurrentPhase('complete');
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  };

  const startBreathing = () => {
    setCurrentPhase('breathing');
  };

  useEffect(() => {
    localStorage.setItem('meetcute_autoplay_sound', 'true');
    window.dispatchEvent(new CustomEvent('ambient-sound-play', {
      detail: { source: 'focus-scene-demo' }
    }));

    return () => {
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-scene-demo' }
      }));
    };
  }, []);

  if (currentPhase === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="text-8xl mb-6"
          >
            ✨
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            You're Ready
          </h1>
          <p className="text-xl text-purple-200">
            Step into your meeting with confidence
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white overflow-hidden">
      <AmbientSound soundType="calm-ocean" enabled stopOnNavigation={false} />
      <AnimatePresence mode="wait">
        {/* Intro Phase */}
        {currentPhase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center max-w-2xl"
            >
              <img
                src={LOGO_PATHS.main}
                alt="Meet Cute Logo"
                className="w-20 h-20 mx-auto mb-8"
              />
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
                {meeting.title}
              </h1>
              <CountdownTimer startTime={meeting.startTime} />
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20"
              >
                <p className="text-xl md:text-2xl leading-relaxed text-purple-100">
                  {meeting.cueContent}
                </p>
              </motion.div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={startBreathing}
                className="mt-12 px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xl font-semibold hover:scale-105 transition-transform shadow-2xl"
              >
                Begin Focus Ritual
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Breathing Phase */}
        {currentPhase === 'breathing' && (
          <motion.div
            key="breathing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <motion.h2
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl md:text-4xl font-bold mb-12 text-center"
            >
              Breathe & Center
            </motion.h2>
            
            <AdaptiveBreathingFlow duration={4000} onComplete={handleBreathingComplete} />
            
            <motion.p
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-xl text-purple-200 text-center max-w-md"
            >
              Follow the circle. Breathe in as it expands, breathe out as it contracts.
            </motion.p>
          </motion.div>
        )}

        {/* Reflection Phase */}
        {currentPhase === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-2xl"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Set Your Intention
              </h2>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <textarea
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  placeholder="What do you want to achieve in this meeting? (optional)"
                  className="w-full h-40 p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 text-white placeholder-purple-300 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </motion.div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={handleComplete}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xl font-semibold hover:scale-105 transition-transform shadow-2xl"
              >
                I'm Ready
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

