/**
 * Cue Level Selector - Choose between Level 1 and Level 2
 * 
 * Level 1: Pre-scheduled cues (no microphone needed)
 * - Cues delivered at strategic times during meeting
 * - Based on meeting duration and user preferences
 * - No audio analysis, fully private
 * - Works everywhere, no permissions needed
 * 
 * Level 2: Real-time composure coach (requires microphone)
 * - Listens to how you sound (not what you say)
 * - Detects pace, volume, breathlessness in real-time
 * - Adaptive learning over time
 * - 100% on-device, no recording
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Mic, Lock, Zap, TrendingUp, Shield } from 'lucide-react';

interface CueLevelSelectorProps {
  currentLevel: 1 | 2;
  onLevelChange: (level: 1 | 2) => void;
}

export default function CueLevelSelector({
  currentLevel,
  onLevelChange,
}: CueLevelSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-4">
      {/* Level Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Level 1: Pre-Scheduled Cues */}
        <motion.button
          onClick={() => onLevelChange(1)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative p-6 rounded-xl border-2 text-left transition-all
            ${
              currentLevel === 1
                ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-indigo-300'
            }
          `}
        >
          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
              Recommended
            </span>
          </div>

          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-4
              ${currentLevel === 1 ? 'bg-indigo-600' : 'bg-gray-100'}
            `}
          >
            <Clock
              className={`w-6 h-6 ${currentLevel === 1 ? 'text-white' : 'text-gray-600'}`}
            />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Level 1: Smart Cues
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">
            AI-generated cues delivered during your meeting via push notifications. No microphone needed.
          </p>

          {/* Features */}
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">No microphone access required</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">AI-generated, context-aware cues</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">100% private, no audio processing</span>
            </li>
          </ul>

          {/* Selected Indicator */}
          {currentLevel === 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
          )}
        </motion.button>

        {/* Level 2: Real-Time Coach */}
        <motion.button
          onClick={() => onLevelChange(2)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative p-6 rounded-xl border-2 text-left transition-all
            ${
              currentLevel === 2
                ? 'border-teal-500 bg-teal-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-teal-300'
            }
          `}
        >
          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
              Advanced
            </span>
          </div>

          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-4
              ${currentLevel === 2 ? 'bg-teal-600' : 'bg-gray-100'}
            `}
          >
            <Mic
              className={`w-6 h-6 ${currentLevel === 2 ? 'text-white' : 'text-gray-600'}`}
            />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Level 2: Real-Time Coach
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">
            AI listens to how you sound (not what you say) and provides real-time composure cues.
          </p>

          {/* Features */}
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Real-time pace & volume detection</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Adaptive learning over time</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">100% on-device, no recording</span>
            </li>
          </ul>

          {/* Selected Indicator */}
          {currentLevel === 2 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-4 right-4 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Show More Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        {showDetails ? 'Hide Details' : 'Compare Features'}
      </button>

      {/* Detailed Comparison */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <h4 className="font-semibold text-gray-900 mb-4">Feature Comparison</h4>

              <div className="space-y-3">
                {/* Comparison Table */}
                <ComparisonRow
                  feature="Microphone Access"
                  level1="Not required"
                  level2="Required (with permission)"
                />
                <ComparisonRow
                  feature="Cue Timing"
                  level1="AI-generated push notifications"
                  level2="Real-time based on your speech"
                />
                <ComparisonRow
                  feature="Personalization"
                  level1="Based on preferences"
                  level2="Learns your patterns over time"
                />
                <ComparisonRow
                  feature="Privacy"
                  level1="No audio processing"
                  level2="On-device only, no recording"
                />
                <ComparisonRow
                  feature="Accuracy"
                  level1="Good for general guidance"
                  level2="Precise, moment-specific cues"
                />
                <ComparisonRow
                  feature="Battery Impact"
                  level1="Minimal"
                  level2="Low (pauses in background)"
                />
              </div>

              {/* Privacy Note */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Privacy Guarantee
                    </p>
                    <p className="text-xs text-blue-800">
                      Both levels are 100% private. Level 2 analyzes only prosody (how you
                      sound), never content (what you say). All processing happens on your
                      device. No audio is ever recorded or uploaded.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Comparison Row Component
 */
function ComparisonRow({
  feature,
  level1,
  level2,
}: {
  feature: string;
  level1: string;
  level2: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div className="font-medium text-gray-700">{feature}</div>
      <div className="text-gray-600">{level1}</div>
      <div className="text-gray-600">{level2}</div>
    </div>
  );
}

