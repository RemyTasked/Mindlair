/**
 * Level 2 Cue Companion - UI Component
 * 
 * Real-time composure coaching with on-device audio analysis
 * Privacy-first: No recording, no transcription, no cloud processing
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Activity, Loader } from 'lucide-react';
import { getAudioAnalyzer, type CueTrigger, type MeetingSummary } from '../services/audioAnalyzer';

interface Level2CueCompanionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  showSummary?: boolean;  // Show end-of-meeting summary
}

export default function Level2CueCompanion({
  enabled,
  onToggle,
  showSummary = false,
}: Level2CueCompanionProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentCue, setCurrentCue] = useState<CueTrigger | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const analyzer = useRef(getAudioAnalyzer());
  const cueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize analyzer when enabled
  useEffect(() => {
    const startAnalyzer = async () => {
      if (enabled && !isActive) {
        try {
          await analyzer.current.start();
          setIsActive(true);
          setIsCalibrating(true);
          setPermissionDenied(false);
          
          // Listen for cues
          analyzer.current.onCue((cue) => {
            setCurrentCue(cue);
            
            // Dispatch cue-toast event for CueToastManager (Level 1 system)
            // This shows the cue in the standard toast UI
            window.dispatchEvent(new CustomEvent('cue-toast', {
              detail: {
                cueId: `level2-${Date.now()}`,
                text: cue.message,
                actions: [], // Level 2 cues are brief, no actions needed
              }
            }));
            
            // Send browser notification for Level 2 cue (works even when tab is backgrounded)
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('💡 Level 2 Cue', {
                  body: cue.message,
                  tag: `level2-cue-${Date.now()}`,
                  requireInteraction: false, // Auto-dismiss
                  icon: '/icons/meetcute-logo-192.png',
                  badge: '/icons/meetcute-logo-96.png',
                });
              } catch (error: any) {
                console.warn('⚠️ Failed to send Level 2 notification:', error);
              }
            }
            
            // Auto-dismiss after 3 seconds
            if (cueTimeoutRef.current) {
              clearTimeout(cueTimeoutRef.current);
            }
            cueTimeoutRef.current = setTimeout(() => {
              setCurrentCue(null);
            }, 3000);
          });
          
          // Listen for features to track calibration
          analyzer.current.onFeatures((features) => {
            const baseline = analyzer.current.getBaseline();
            if (!baseline.calibrationComplete) {
              const progress = (baseline.samplesCollected / 60) * 100;
              setCalibrationProgress(Math.min(progress, 100));
            } else if (isCalibrating) {
              setIsCalibrating(false);
              setCalibrationProgress(100);
            }
            
            // Update speaking indicator
            setIsSpeaking(features.isSpeaking);
          });
          
        } catch (error) {
          console.error('❌ Failed to start audio analyzer:', error);
          setPermissionDenied(true);
          onToggle(false);
        }
      }
    };
    
    if (enabled) {
      startAnalyzer();
    } else if (isActive) {
      // Generate summary before stopping
      if (showSummary) {
        const meetingSummary = analyzer.current.getMeetingSummary();
        setSummary(meetingSummary);
      }
      
      analyzer.current.stop();
      setIsActive(false);
      setIsCalibrating(false);
      setCalibrationProgress(0);
      
      if (cueTimeoutRef.current) {
        clearTimeout(cueTimeoutRef.current);
      }
    }
    
    return () => {
      if (cueTimeoutRef.current) {
        clearTimeout(cueTimeoutRef.current);
      }
    };
  }, [enabled, isActive, showSummary, onToggle]);
  
  // Handle manual toggle
  const handleToggle = () => {
    onToggle(!enabled);
  };
  
  // Handle cue dismiss
  const dismissCue = () => {
    setCurrentCue(null);
    if (cueTimeoutRef.current) {
      clearTimeout(cueTimeoutRef.current);
    }
  };
  
  // Handle summary dismiss
  const dismissSummary = () => {
    setSummary(null);
  };
  
  // Permission denied state
  if (permissionDenied) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-red-700 max-w-sm"
      >
        <div className="flex items-center gap-3">
          <MicOff className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Microphone Access Denied</p>
            <p className="text-xs text-red-200 mt-0.5">
              Level 2 Companion needs microphone permission to function.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Meeting summary modal (after meeting ends)
  if (summary && !enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={dismissSummary}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-2xl border-2 border-indigo-200 p-6 max-w-md w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Meeting Summary</h3>
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          
          {/* Duration */}
          <div className="text-sm text-gray-600 mb-4">
            Duration: {Math.floor(summary.duration / 60)}m {summary.duration % 60}s
          </div>
          
          {/* Trends */}
          <div className="space-y-3 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Pace Trend
              </p>
              <p className="text-base font-medium text-gray-900">{summary.paceTrend}</p>
            </div>
            
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Volume Trend
              </p>
              <p className="text-base font-medium text-gray-900">{summary.volumeTrend}</p>
            </div>
          </div>
          
          {/* Cue Stats */}
          {summary.totalCues > 0 && (
            <div className="bg-white rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Cues Received
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.cueTypes).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Suggestion */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-90">
              💡 Best Next Step
            </p>
            <p className="text-sm font-medium">{summary.suggestion}</p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={dismissSummary}
            className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }
  
  return (
    <>
      {/* Toggle Button with Status Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={handleToggle}
          className={`
            relative flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl
            transition-all duration-300 border-2
            ${
              enabled
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 hover:from-purple-700 hover:to-indigo-700'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
            }
            text-white font-medium
          `}
        >
          {/* Status Dot */}
          <div className="relative">
            {enabled ? (
              <>
                <Mic className="w-5 h-5" />
                {isSpeaking && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -inset-1 bg-green-400 rounded-full -z-10"
                  />
                )}
              </>
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </div>
          
          <span className="text-sm whitespace-nowrap">
            {isCalibrating ? 'Calibrating...' : enabled ? 'Level 2 ON' : 'Level 2 OFF'}
          </span>
          
          {/* Status Indicator Dot */}
          <div
            className={`
              w-2 h-2 rounded-full
              ${
                !enabled
                  ? 'bg-gray-400'
                  : isCalibrating
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-green-400'
              }
            `}
          />
        </button>
        
        {/* Calibration Progress */}
        {isCalibrating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full mb-2 right-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 min-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Loader className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="text-xs font-semibold text-gray-700">
                Learning your baseline...
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calibrationProgress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-center">
              {Math.floor(calibrationProgress)}% • ~{Math.ceil((100 - calibrationProgress) * 0.6)}s
            </p>
          </motion.div>
        )}
      </motion.div>
      
      {/* Cue Toast - Appears at top center */}
      <AnimatePresence>
        {currentCue && (
          <motion.div
            key={currentCue.timestamp}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]"
            onClick={dismissCue}
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-purple-300 cursor-pointer hover:scale-105 transition-transform">
              <p className="text-lg font-bold tracking-wide text-center whitespace-nowrap">
                {currentCue.message}
              </p>
            </div>
            
            {/* Subtle hint */}
            <p className="text-center text-xs text-white/70 mt-2">
              tap to dismiss
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Privacy Notice (shows once per session on first enable) */}
      {enabled && isCalibrating && calibrationProgress < 10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-24 right-6 z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 max-w-xs border border-purple-200"
        >
          <p className="text-xs text-gray-700 leading-relaxed">
            <span className="font-semibold text-purple-600">🔒 Privacy:</span>{' '}
            Meet Cute analyzes your voice <span className="font-semibold">locally</span> to help with
            pace and calm. Audio <span className="font-semibold">never leaves your device</span>.
          </p>
        </motion.div>
      )}
    </>
  );
}
