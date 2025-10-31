import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import BreathingCircle from '../components/BreathingCircle';
import CountdownTimer from '../components/CountdownTimer';

interface MeetingData {
  title: string;
  startTime: string;
  cueContent: string;
}

export default function FocusScene() {
  const { userId, meetingId } = useParams();
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'breathing' | 'reflection' | 'complete'>('intro');
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [breathingCompleted, setBreathingCompleted] = useState(false);

  useEffect(() => {
    loadMeetingData();
  }, [userId, meetingId]);

  const loadMeetingData = async () => {
    try {
      const response = await axios.get(`/api/focus-scene/${userId}/${meetingId}`);
      setMeeting(response.data.meeting);
      setLoading(false);

      // Auto-progress through phases
      setTimeout(() => setCurrentPhase('breathing'), 3000);
    } catch (error) {
      console.error('Error loading meeting data:', error);
      setLoading(false);
    }
  };

  const handleBreathingComplete = () => {
    setBreathingCompleted(true);
    setTimeout(() => setCurrentPhase('reflection'), 1000);
  };

  const handleComplete = async () => {
    try {
      await axios.post(`/api/focus-scene/${userId}/${meetingId}/complete`, {
        breathingExerciseCompleted: breathingCompleted,
        reflectionNotes: reflectionNotes || undefined,
      });
      setCurrentPhase('complete');
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
      <AnimatePresence mode="wait">
        {currentPhase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center max-w-3xl"
            >
              <div className="text-6xl mb-8">🎬</div>
              <h1 className="text-5xl font-bold mb-6 text-balance">
                {meeting.title}
              </h1>
              <p className="text-2xl text-purple-200 leading-relaxed">
                {meeting.cueContent}
              </p>
            </motion.div>
          </motion.div>
        )}

        {currentPhase === 'breathing' && (
          <motion.div
            key="breathing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <CountdownTimer
              startTime={new Date(meeting.startTime)}
              className="absolute top-8 right-8"
            />

            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold mb-4">Take a Breath</h2>
              <p className="text-xl text-purple-200">Center yourself before you enter</p>
            </div>

            <BreathingCircle onComplete={handleBreathingComplete} />

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 15 }}
              onClick={() => setCurrentPhase('reflection')}
              className="mt-12 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
            >
              Skip to Reflection →
            </motion.button>
          </motion.div>
        )}

        {currentPhase === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <CountdownTimer
              startTime={new Date(meeting.startTime)}
              className="absolute top-8 right-8"
            />

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
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="Optional: Write your intention..."
                className="w-full h-32 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-8xl mb-8"
            >
              ✨
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold mb-4">Scene Wrapped</h2>
              <p className="text-2xl text-purple-200">
                Step in with confidence.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 text-center text-purple-300"
            >
              <p>You can close this window now.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

