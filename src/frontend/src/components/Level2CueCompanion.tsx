/**
 * Level 2 Cue Companion Component
 * 
 * Real-time composure coach that provides subtle audio-based cues during meetings
 * Privacy-first: All processing on-device, no recording, no transcription
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, X, CheckCircle } from 'lucide-react';
import { getAudioAnalyzer, AudioFeatures, CueTrigger } from '../services/audioAnalyzer';

interface Level2CueCompanionProps {
  meetingId?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export default function Level2CueCompanion({
  meetingId,
  enabled = false,
  onToggle,
}: Level2CueCompanionProps) {
  const [isActive, setIsActive] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [currentCue, setCurrentCue] = useState<CueTrigger | null>(null);
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzer = getAudioAnalyzer();

  /**
   * Handle enabling Level 2
   */
  const handleEnable = async () => {
    if (!getAudioAnalyzer().constructor.isSupported()) {
      setError('Audio analysis not supported in this browser');
      return;
    }

    setShowConsent(true);
  };

  /**
   * User accepts consent - start audio analysis
   */
  const handleConsent = async () => {
    try {
      setShowConsent(false);
      setError(null);
      setIsCalibrating(true);
      setCalibrationProgress(0);

      // Reset analyzer for new meeting
      analyzer.reset();

      // Set up callbacks
      analyzer.onFeatures((f: AudioFeatures) => {
        setFeatures(f);
        
        // Update calibration progress
        const baseline = analyzer.getBaseline();
        if (!baseline.calibrationComplete) {
          setCalibrationProgress((baseline.samplesCollected / 60) * 100);
        } else if (isCalibrating) {
          setIsCalibrating(false);
          setCalibrationProgress(100);
        }
      });

      analyzer.onCue((cue: CueTrigger) => {
        setCurrentCue(cue);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          setCurrentCue(null);
        }, 3000);
      });

      // Start audio analysis
      await analyzer.start();
      
      setIsActive(true);
      setHasPermission(true);
      
      if (onToggle) {
        onToggle(true);
      }
      
      console.log('✅ Level 2 Cue Companion activated');
    } catch (err: any) {
      console.error('❌ Failed to start Level 2:', err);
      setError(err.message || 'Failed to access microphone');
      setIsActive(false);
      setIsCalibrating(false);
    }
  };

  /**
   * User denies consent or disables
   */
  const handleDisable = () => {
    setShowConsent(false);
    analyzer.stop();
    setIsActive(false);
    setIsCalibrating(false);
    setCalibrationProgress(0);
    setCurrentCue(null);
    setFeatures(null);
    
    if (onToggle) {
      onToggle(false);
    }
    
    console.log('🛑 Level 2 Cue Companion disabled');
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        analyzer.stop();
      }
    };
  }, [isActive]);

  return (
    <div className="fixed bottom-20 right-6 z-50">
      {/* Consent Modal */}
      <AnimatePresence>
        {showConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConsent(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Level 2 Cue Companion
                </h3>
                <p className="text-gray-600">
                  Your real-time composure coach
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">How you sound, not what you say</p>
                    <p className="text-sm text-gray-600">
                      Analyzes pace, volume, pauses, and energy
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">100% private</p>
                    <p className="text-sm text-gray-600">
                      All processing on your device. No recording, no cloud.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Subtle cues</p>
                    <p className="text-sm text-gray-600">
                      Max 1-3 gentle reminders per meeting
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConsent(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleConsent}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Activate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Cue Display */}
      <AnimatePresence>
        {currentCue && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="mb-4"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl px-6 py-4 shadow-2xl border-2 border-white/20">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-6 h-6" />
                  <p className="text-lg font-semibold">{currentCue.message}</p>
                </div>
                <button
                  onClick={() => setCurrentCue(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calibration Progress */}
      <AnimatePresence>
        {isCalibrating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4"
          >
            <div className="bg-white rounded-xl px-4 py-3 shadow-lg border border-indigo-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-gray-900">Learning your baseline...</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calibrationProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {Math.round(calibrationProgress)}% complete
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isActive ? handleDisable : handleEnable}
        className={`
          relative flex items-center gap-2 px-4 py-3 rounded-full font-semibold shadow-lg transition-all
          ${isActive 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300'
          }
        `}
      >
        {isActive ? (
          <>
            <Mic className="w-5 h-5" />
            <span>Level 2 Active</span>
            {features?.isSpeaking && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </>
        ) : (
          <>
            <MicOff className="w-5 h-5" />
            <span>Enable Level 2</span>
          </>
        )}
      </motion.button>

      {/* Error Display */}
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

