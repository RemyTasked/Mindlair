import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Clock, Target, Heart, Calendar, Sparkles, Film } from 'lucide-react';
import api from '../lib/axios';

interface OnboardingData {
  timezone: string;
  workStart: string;
  workEnd: string;
  focusGoals: string[];
  customGoal: string;
  meetingComfort: number;
  meetingsPerDay: string;
  directorsNote: string;
  presleyFlowTime: string;
}

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workStart: '08:00',
    workEnd: '17:30',
    focusGoals: [],
    customGoal: '',
    meetingComfort: 3,
    meetingsPerDay: '3-5',
    directorsNote: '',
    presleyFlowTime: '20:00',
  });

  const totalScenes = 7;

  const nextScene = () => {
    if (currentScene < totalScenes - 1) {
      setCurrentScene(currentScene + 1);
    } else {
      handleComplete();
    }
  };

  const prevScene = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1);
    }
  };

  const handleComplete = async () => {
    try {
      console.log('🎬 Onboarding: Saving preferences...');
      
      // Save onboarding data to user profile (using PUT not PATCH)
      const prefsResponse = await api.put(`/api/user/preferences`, {
        morningFlowTime: data.workStart,
        eveningFlowTime: data.presleyFlowTime,
        tone: data.meetingComfort <= 2 ? 'supportive' : data.meetingComfort >= 4 ? 'confident' : 'balanced',
      });
      console.log('✅ Preferences saved:', prefsResponse.data);

      console.log('🎬 Onboarding: Marking as completed...');
      const onboardingResponse = await api.post(`/api/user/onboarding`, {
        workStart: data.workStart,
        workEnd: data.workEnd,
        focusGoals: data.focusGoals,
        customGoal: data.customGoal,
        meetingComfort: data.meetingComfort,
        meetingsPerDay: data.meetingsPerDay,
        directorsNote: data.directorsNote,
        completedAt: new Date().toISOString(),
      });
      console.log('✅ Onboarding marked complete:', onboardingResponse.data);

      // Clear ALL caches to force fresh data
      localStorage.removeItem('meetcute_profile_cache');
      localStorage.removeItem('meetcute_session_active');
      
      console.log('✅ Onboarding complete! Calling onComplete callback...');
      onComplete();
    } catch (error: any) {
      console.error('❌ Failed to save onboarding data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const errorDetails = JSON.stringify(error.response?.data || error, null, 2);
      console.error('Error details:', errorDetails);
      
      // Ask user if they want to skip onboarding
      const skipOnboarding = confirm(
        `Failed to save onboarding data:\n\n${errorMessage}\n\n` +
        `This might be a temporary issue. Would you like to:\n\n` +
        `• Click OK to skip onboarding for now (you can access settings later)\n` +
        `• Click Cancel to try again`
      );
      
      if (skipOnboarding) {
        console.log('⚠️ User chose to skip onboarding');
        // Clear caches and proceed anyway
        localStorage.removeItem('meetcute_profile_cache');
        localStorage.removeItem('meetcute_session_active');
        onComplete();
      }
      // If they click Cancel, don't call onComplete - let them retry
    }
  };

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      focusGoals: prev.focusGoals.includes(goal)
        ? prev.focusGoals.filter(g => g !== goal)
        : [...prev.focusGoals, goal],
    }));
  };

  const scenes = [
    // Scene 1: Welcome & Mood Setting
    <motion.div
      key="scene1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 blur-3xl rounded-full"></div>
        <Film className="w-24 h-24 mx-auto text-indigo-600 relative z-10" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Scene Opens
        </h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
          You're the lead in every meeting you walk into.
        </p>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's set the stage for how Meet-Cute supports your flow.
        </p>
      </motion.div>
    </motion.div>,

    // Scene 2: The Basics (Timezone & Work Rhythm)
    <motion.div
      key="scene2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Clock className="w-16 h-16 mx-auto text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-900">The Basics</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          When does your workday typically begin and end? This helps us deliver pre-meeting prep and nightly reflections at the right moments.
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Day Starts
          </label>
          <input
            type="time"
            value={data.workStart}
            onChange={(e) => setData({ ...data, workStart: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Day Ends
          </label>
          <input
            type="time"
            value={data.workEnd}
            onChange={(e) => setData({ ...data, workEnd: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <input
            type="text"
            value={data.timezone}
            disabled
            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">Detected automatically</p>
        </div>
      </div>
    </motion.div>,

    // Scene 3: Focus & Intention Baseline
    <motion.div
      key="scene3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Target className="w-16 h-16 mx-auto text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-900">Focus & Intention</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          What do you most want to improve during meetings? Select all that apply.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {['Confidence', 'Calm', 'Clarity', 'Focus', 'Energy'].map((goal) => (
          <button
            key={goal}
            onClick={() => toggleGoal(goal)}
            className={`p-4 rounded-xl border-2 transition-all ${
              data.focusGoals.includes(goal)
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <span className="font-semibold">{goal}</span>
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Personal Goal (Optional)
        </label>
        <textarea
          value={data.customGoal}
          onChange={(e) => setData({ ...data, customGoal: e.target.value })}
          placeholder="I want to leave meetings feeling..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>
    </motion.div>,

    // Scene 4: Self-Awareness Snapshot
    <motion.div
      key="scene4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Heart className="w-16 h-16 mx-auto text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-900">Self-Awareness Snapshot</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          How do you typically feel about meetings?
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between text-4xl">
          {['😰', '😟', '😐', '🙂', '😊'].map((emoji, index) => (
            <button
              key={index}
              onClick={() => setData({ ...data, meetingComfort: index + 1 })}
              className={`transition-all ${
                data.meetingComfort === index + 1
                  ? 'scale-125 opacity-100'
                  : 'scale-100 opacity-40 hover:opacity-70'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>Nervous</span>
          <span>Comfortable</span>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          {data.meetingComfort <= 2 && "We'll provide extra calming cues and supportive language."}
          {data.meetingComfort === 3 && "We'll balance calm with confidence in your cues."}
          {data.meetingComfort >= 4 && "We'll focus on amplifying your natural confidence."}
        </p>
      </div>
    </motion.div>,

    // Scene 5: Experience Calibration
    <motion.div
      key="scene5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Calendar className="w-16 h-16 mx-auto text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-900">Experience Calibration</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          How many meetings do you typically have per day?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
        {[
          { value: '0-2', label: '0–2 meetings', desc: 'Light schedule' },
          { value: '3-5', label: '3–5 meetings', desc: 'Moderate pace' },
          { value: '6+', label: '6+ meetings', desc: 'High density' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setData({ ...data, meetingsPerDay: option.value })}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              data.meetingsPerDay === option.value
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="font-semibold text-lg">{option.label}</div>
            <div className="text-sm text-gray-600">{option.desc}</div>
          </button>
        ))}
      </div>
    </motion.div>,

    // Scene 6: Personal Signature Moment
    <motion.div
      key="scene6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Sparkles className="w-16 h-16 mx-auto text-indigo-600" />
        <h2 className="text-3xl font-bold text-gray-900">Your Director's Note</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Set a phrase or mindset you want to carry through the week. This will resurface during your nightly reflections.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <textarea
          value={data.directorsNote}
          onChange={(e) => setData({ ...data, directorsNote: e.target.value })}
          placeholder="Example: Lead with calm authority"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-lg"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-2">
          You can change this anytime in settings
        </p>
      </div>
    </motion.div>,

    // Scene 7: Technical & AI Setup
    <motion.div
      key="scene7"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-16 h-16 mx-auto text-indigo-600" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900">Setting the Stage</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          When would you like your evening Presley Flow reminder?
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evening Flow Time
          </label>
          <input
            type="time"
            value={data.presleyFlowTime}
            onChange={(e) => setData({ ...data, presleyFlowTime: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">
            We'll suggest adjustments based on your usage patterns
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-900">
            <strong>Your baseline profile is ready.</strong> Meet-Cute will now generate personalized cues, adjust tone suggestions, and refine timing based on your preferences.
          </p>
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Scene {currentScene + 1} of {totalScenes}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentScene + 1) / totalScenes) * 100)}% Complete
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentScene + 1) / totalScenes) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Scene Content */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 min-h-[500px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {scenes[currentScene]}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={prevScene}
                disabled={currentScene === 0}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <button
                onClick={nextScene}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                {currentScene === totalScenes - 1 ? 'Begin Your Journey' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

