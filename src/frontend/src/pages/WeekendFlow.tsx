import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sparkles, Heart } from 'lucide-react';

type ResetTone = 'calm' | 'creative' | 'reflective';

export default function WeekendFlow() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [selectedTone, setSelectedTone] = useState<ResetTone | null>(null);
  const [phase, setPhase] = useState<'select' | 'experience' | 'complete'>('select');

  const tones = {
    calm: {
      icon: <Moon className="w-12 h-12" />,
      title: 'Calm',
      description: 'Gentle breathing and stillness',
      color: 'from-blue-500 to-indigo-500',
      prompt: 'Intermission begins — breathe, reset, and let the day unfold naturally.',
      closing: 'The stage rests. You\'ve earned the pause.',
    },
    creative: {
      icon: <Sparkles className="w-12 h-12" />,
      title: 'Creative',
      description: 'Open exploration and play',
      color: 'from-purple-500 to-pink-500',
      prompt: 'Intermission begins — explore, create, and let inspiration flow naturally.',
      closing: 'The stage rests. Your creativity has room to breathe.',
    },
    reflective: {
      icon: <Heart className="w-12 h-12" />,
      title: 'Reflective',
      description: 'Thoughtful pause and gratitude',
      color: 'from-rose-500 to-orange-500',
      prompt: 'Intermission begins — reflect, appreciate, and honor this moment of rest.',
      closing: 'The stage rests. You\'ve given yourself space to reflect.',
    },
  };

  const handleToneSelect = (tone: ResetTone) => {
    setSelectedTone(tone);
    setPhase('experience');
  };

  const handleComplete = () => {
    setPhase('complete');
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Moon className="w-20 h-20 mx-auto text-indigo-400 mb-6" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              The Intermission
            </h1>
            <p className="text-xl text-gray-300">
              No meetings today. Choose your reset tone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(Object.keys(tones) as ResetTone[]).map((tone) => {
              const config = tones[tone];
              return (
                <motion.button
                  key={tone}
                  onClick={() => handleToneSelect(tone)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all"
                >
                  <div className={`bg-gradient-to-br ${config.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
                    {config.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {config.title}
                  </h3>
                  <p className="text-gray-300">
                    {config.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'experience' && selectedTone) {
    const config = tones[selectedTone];
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl w-full text-center space-y-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className={`bg-gradient-to-br ${config.color} w-32 h-32 rounded-full flex items-center justify-center mx-auto text-white`}
          >
            {config.icon}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-relaxed">
              {config.prompt}
            </h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-gray-300 text-lg"
            >
              <p>Take this moment to breathe.</p>
              <p className="mt-4">No scripts. No calls. Just space.</p>
            </motion.div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            onClick={handleComplete}
            className="px-8 py-4 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-full text-white font-semibold transition-all border border-white/30"
          >
            Continue
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'complete' && selectedTone) {
    const config = tones[selectedTone];
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center space-y-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Moon className="w-24 h-24 mx-auto text-indigo-400" />
          </motion.div>

          <h2 className="text-4xl font-bold text-white">
            {config.closing}
          </h2>

          <p className="text-gray-400 text-sm">
            Returning to dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return null;
}

