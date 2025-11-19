import { motion } from 'framer-motion';
import { LOGO_PATHS } from '../config/constants';

interface OnboardingWelcomeProps {
  onContinue: () => void;
}

export default function OnboardingWelcome({ onContinue }: OnboardingWelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-teal-900 to-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-10 text-center space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <img
              src={LOGO_PATHS.main}
              alt="Meet Cute"
              className="w-24 h-24 drop-shadow-lg"
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-200 via-teal-200 to-pink-200 bg-clip-text text-transparent">
              Welcome to Meet Cute
            </h1>
            <p className="text-lg text-indigo-100 max-w-2xl mx-auto leading-relaxed">
              Meet-Cute helps you align your intention, energy, and communication before every meeting.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-left text-sm text-indigo-100/80">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="text-2xl mb-2">🎬</div>
                <p className="font-semibold text-indigo-50">Opening Scene</p>
                <p>Set your work rhythm, timezone, and daily cadence.</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="text-2xl mb-2">🎧</div>
                <p className="font-semibold text-indigo-50">Focus blueprint</p>
                <p>Tell us how you want to feel heading into meetings.</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                <div className="text-2xl mb-2">🌙</div>
                <p className="font-semibold text-indigo-50">Evening wrap</p>
                <p>Choose when nightly Presley Flow sessions should roll.</p>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 transition-all shadow-lg text-white font-semibold"
          >
            Begin Cinematic Onboarding
          </motion.button>

          <p className="text-xs text-indigo-200/80">
            Takes under three minutes • Sets the tone for every flow • You can update these anytime in Settings
          </p>
        </div>
      </div>
    </div>
  );
}
