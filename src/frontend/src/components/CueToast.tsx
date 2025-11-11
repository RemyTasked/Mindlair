import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../lib/axios';

interface CueAction {
  label: string;
  action: string;
}

interface CueData {
  cueId: string;
  text: string;
  actions: CueAction[];
  meetingId?: string;
}

interface CueToastProps {
  cue: CueData;
  onDismiss: () => void;
}

export function CueToast({ cue, onDismiss }: CueToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (action: string) => {
    try {
      // Record telemetry
      await api.post('/api/cues/telemetry', {
        cueId: cue.cueId,
        meetingId: cue.meetingId,
        action: 'clicked',
        actionType: action,
        timestamp: new Date().toISOString(),
      });

      // Handle specific actions
      if (action === 'breathe') {
        // TODO: Trigger breathing exercise modal
        console.log('🫁 Starting breathing exercise...');
      } else if (action === 'focus-note') {
        // TODO: Open quick note modal
        console.log('📝 Opening focus note...');
      } else if (action === 'hide') {
        handleDismiss();
      } else if (action === 'snooze') {
        // Snooze for 5 minutes
        console.log('⏰ Snoozed for 5 minutes');
        handleDismiss();
      }
    } catch (error) {
      console.error('Failed to record cue action:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      // Record telemetry
      await api.post('/api/cues/telemetry', {
        cueId: cue.cueId,
        meetingId: cue.meetingId,
        action: 'dismissed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record cue dismissal:', error);
    }

    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-[9999] max-w-sm"
      >
        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-2xl border-2 border-indigo-200 p-4 space-y-3">
          {/* Meet Cute Branding + Close Button */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              <span className="text-xs font-semibold text-indigo-900">Meet Cute</span>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-full transition-colors group"
              aria-label="Dismiss"
              title="Dismiss cue"
            >
              <X className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
          
          {/* Cue Message */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 leading-relaxed">
                {cue.text}
              </p>
            </div>
          </div>

          {/* Actions */}
          {cue.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cue.actions.map((actionItem) => (
                <button
                  key={actionItem.action}
                  onClick={() => handleAction(actionItem.action)}
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  {actionItem.label}
                </button>
              ))}
            </div>
          )}

          {/* Progress bar */}
          <motion.div
            className="h-1 bg-indigo-600 rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 15, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Toast Manager Component
export function CueToastManager() {
  const [activeCue, setActiveCue] = useState<CueData | null>(null);

  useEffect(() => {
    const handleCueEvent = (event: Event) => {
      const customEvent = event as CustomEvent<CueData>;
      console.log('🔔 Cue received:', customEvent.detail);
      setActiveCue(customEvent.detail);
    };

    window.addEventListener('cue-toast', handleCueEvent);

    return () => {
      window.removeEventListener('cue-toast', handleCueEvent);
    };
  }, []);

  if (!activeCue) return null;

  return (
    <CueToast
      cue={activeCue}
      onDismiss={() => setActiveCue(null)}
    />
  );
}

