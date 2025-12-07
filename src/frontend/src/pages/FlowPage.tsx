/**
 * Mind Garden - Flow Page
 * 
 * Page that loads and displays a specific flow based on URL parameter.
 */

import { useParams, useNavigate } from 'react-router-dom';
import FlowPlayer from '../components/FlowPlayer';
import api from '../lib/axios';

// Flow definitions (should match backend)
const FLOWS = {
  'pre-meeting-focus': {
    id: 'pre-meeting-focus',
    name: 'Pre-Meeting Focus',
    shortName: 'Focus',
    description: 'Center yourself before any meeting with focused breathing and intention setting.',
    duration: 180,
    bestFor: ['Standard meetings', 'Check-ins', 'One-on-ones', 'Team syncs'],
    breathingPattern: 'box' as const,
    spotifyMood: 'neutral-instrumental',
    icon: '🎯',
    benefits: ['Increased presence', 'Better listening', 'Clearer thinking'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 15, text: "Let's take a few minutes to prepare.", guidance: "Find a comfortable position. Close your eyes if you'd like. You're about to step into an important moment.", animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 48, text: 'Box Breathing', guidance: 'Breathe in slowly for 4 counts. Hold gently for 4. Breathe out slowly for 4. Hold for 4.', animation: 'breathe' as const },
      { id: 'body-scan', type: 'body-scan' as const, duration: 40, text: 'Quick Body Scan', guidance: 'Notice any tension in your shoulders. Your jaw. Your hands. Invite each area to soften and release.', animation: 'pulse' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 48, text: 'Continue Breathing', guidance: 'Another round of box breathing. In. Hold. Out. Hold. Let each breath deepen your calm.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 20, text: 'Set Your Intention', guidance: "What's your focus for this meeting? What do you want to bring to this conversation? Hold that intention clearly.", animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 9, text: "You're ready.", guidance: 'Take a final deep breath. Enter your meeting with presence and confidence.', animation: 'fade' as const },
    ],
  },
  'pre-presentation-power': {
    id: 'pre-presentation-power',
    name: 'Pre-Presentation Power',
    shortName: 'Power Up',
    description: 'Build confidence and presence before presentations, pitches, and speeches.',
    duration: 180,
    bestFor: ['Presentations', 'Pitches', 'Speeches', 'Demos', 'Interviews'],
    breathingPattern: 'energizing' as const,
    spotifyMood: 'confidence-uplifting',
    icon: '⚡',
    benefits: ['Increased confidence', 'Better projection', 'Reduced anxiety'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 10, text: "Let's build your presence for this moment.", guidance: "Stand tall if you can. You have something valuable to share.", animation: 'expand' as const },
      { id: 'power-pose', type: 'movement' as const, duration: 40, text: 'Power Pose', guidance: 'Stand with feet shoulder-width apart, hands on hips or raised. Expand your body. Take up space.', animation: 'expand' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 32, text: 'Energizing Breath', guidance: 'Quick, energizing breaths. In for 4... quick hold... out for 4... quick hold.', animation: 'breathe' as const },
      { id: 'visualization', type: 'visualization' as const, duration: 40, text: 'See Your Success', guidance: "Picture yourself delivering with confidence. See the audience engaged. Feel their attention.", animation: 'pulse' as const },
      { id: 'voice-warmup', type: 'movement' as const, duration: 30, text: 'Voice Warm-Up', guidance: 'Hum gently. Roll your shoulders. Loosen your jaw. Your voice is your instrument.', animation: 'pulse' as const },
      { id: 'affirmation', type: 'affirmation' as const, duration: 20, text: 'I am prepared and capable.', guidance: 'Say to yourself: "I am prepared. I am capable. I have value to share."', animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 8, text: "Go share your brilliance.", guidance: "You've got this.", animation: 'fade' as const },
    ],
  },
  'quick-reset': {
    id: 'quick-reset',
    name: 'Quick Reset',
    shortName: 'Reset',
    description: 'A 2-minute reset to clear your mind between meetings.',
    duration: 120,
    bestFor: ['Between meetings', 'Context switching', 'Mental fatigue', 'After stress'],
    breathingPattern: 'cleansing' as const,
    spotifyMood: 'energizing-refresh',
    icon: '🔄',
    benefits: ['Mental clarity', 'Energy boost', 'Context shift'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 8, text: "Let's do a quick reset.", guidance: 'Stand up if you can. Roll your shoulders back.', animation: 'fade' as const },
      { id: 'shake-out', type: 'movement' as const, duration: 25, text: 'Shake It Out', guidance: 'Gently shake your hands. Your arms. Your shoulders. Release any tension from the last meeting.', animation: 'pulse' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 48, text: 'Cleansing Breaths', guidance: 'Deep breath in through your nose. Long, slow exhale through your mouth. Let everything go.', animation: 'breathe' as const },
      { id: 'mental-clear', type: 'visualization' as const, duration: 28, text: 'Clear Your Mind', guidance: "Imagine a gentle breeze clearing away thoughts. Each exhale releases what you no longer need. You're in the present now.", animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 11, text: 'Reset complete.', guidance: "Fresh start. You're ready for what's next.", animation: 'fade' as const },
    ],
  },
  'post-meeting-decompress': {
    id: 'post-meeting-decompress',
    name: 'Post-Meeting Decompress',
    shortName: 'Decompress',
    description: 'Release tension and transition after difficult or long meetings.',
    duration: 120,
    bestFor: ['After difficult meetings', 'After long meetings', 'Emotionally draining sessions'],
    breathingPattern: 'calming' as const,
    spotifyMood: 'soothing-release',
    icon: '🌊',
    benefits: ['Tension release', 'Emotional processing', 'Return to baseline'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 8, text: "Let's release what just happened.", guidance: 'That meeting is over. Allow yourself to transition.', animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 32, text: 'Tension Release Breathing', guidance: 'Breathe in... hold... long exhale, releasing tension.', animation: 'breathe' as const },
      { id: 'body-release', type: 'body-scan' as const, duration: 30, text: 'Release Physical Tension', guidance: 'Roll your shoulders back... release your jaw... unclench your hands.', animation: 'pulse' as const },
      { id: 'acknowledgment', type: 'visualization' as const, duration: 20, text: 'Acknowledge & Release', guidance: "Whatever happened, acknowledge it without judgment. Then let it go.", animation: 'expand' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 20, text: 'Final Release', guidance: 'One more deep breath. In... and release everything on the exhale.', animation: 'breathe' as const },
      { id: 'closing', type: 'closing' as const, duration: 10, text: "You're back in the present.", guidance: 'Take this clarity with you.', animation: 'fade' as const },
    ],
  },
  'breathing': {
    id: 'breathing',
    name: 'Simple Breathing',
    shortName: 'Breathe',
    description: 'A simple breathing exercise to calm your mind.',
    duration: 90,
    bestFor: ['Quick calm', 'Anxiety relief', 'Focus boost'],
    breathingPattern: 'box' as const,
    spotifyMood: 'neutral-instrumental',
    icon: '🌬️',
    benefits: ['Calm mind', 'Reduced anxiety', 'Better focus'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 10, text: 'Take a moment to breathe.', guidance: 'Find a comfortable position. Let your shoulders drop. Relax your jaw.', animation: 'fade' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 64, text: 'Box Breathing', guidance: 'Breathe in slowly for 4 counts. Hold gently for 4. Exhale slowly for 4. Rest for 4. Continue at your own pace.', animation: 'breathe' as const },
      { id: 'closing', type: 'closing' as const, duration: 16, text: 'Well done.', guidance: 'Notice how you feel now. Carry this calm with you into your next moment.', animation: 'fade' as const },
    ],
  },
  'difficult-conversation-prep': {
    id: 'difficult-conversation-prep',
    name: 'Difficult Conversation Prep',
    shortName: 'Ground',
    description: 'Ground yourself before challenging discussions with emotional regulation techniques.',
    duration: 180,
    bestFor: ['Performance reviews', 'Conflicts', 'Hard feedback', 'Negotiations', 'Sensitive topics'],
    breathingPattern: 'calming' as const,
    spotifyMood: 'calming-reassuring',
    icon: '🌿',
    benefits: ['Emotional regulation', 'Better listening', 'Clearer communication'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 10, text: 'Prepare for this conversation with compassion.', guidance: "Difficult conversations are opportunities for growth. Let's approach this one grounded.", animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 48, text: 'Calming Breath', guidance: 'Extended exhale calms your nervous system. In for 4... hold for 6... out for 8.', animation: 'breathe' as const },
      { id: 'perspective', type: 'visualization' as const, duration: 40, text: 'Perspective Taking', guidance: "Consider the other person's position. What might they be feeling? What do they need?", animation: 'pulse' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 32, text: 'Continue Calming', guidance: 'In for 4... hold for 6... out for 8.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 30, text: 'Communication Intention', guidance: 'What outcome would serve everyone? Hold that intention. Speak from your values.', animation: 'expand' as const },
      { id: 'grounding', type: 'body-scan' as const, duration: 15, text: 'Ground in Values', guidance: 'Feel your feet on the ground. You are grounded in your integrity.', animation: 'pulse' as const },
      { id: 'closing', type: 'closing' as const, duration: 5, text: 'Enter with compassion.', guidance: 'You are ready.', animation: 'fade' as const },
    ],
  },
  'end-of-day-transition': {
    id: 'end-of-day-transition',
    name: 'End-of-Day Transition',
    shortName: 'Transition',
    description: 'Create a mental boundary between work and personal life.',
    duration: 180,
    bestFor: ['After last meeting', 'Before commute', 'Work-from-home transition'],
    breathingPattern: 'calming' as const,
    spotifyMood: 'calming-transition',
    icon: '🌅',
    benefits: ['Work-life boundary', 'Mental closure', 'Evening presence'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 10, text: 'Time to close the work chapter.', guidance: 'The workday is complete. Honor what you accomplished.', animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 32, text: 'Transitional Breathing', guidance: 'Deep, slow breaths. In for 4... hold for 6... out for 8.', animation: 'breathe' as const },
      { id: 'acknowledgment', type: 'visualization' as const, duration: 40, text: 'Acknowledge Your Day', guidance: "What did you accomplish today? Give yourself credit without judgment. It's enough.", animation: 'pulse' as const },
      { id: 'letting-go', type: 'visualization' as const, duration: 40, text: 'Let Go of Work', guidance: "Visualize closing a door. Work stays on the other side. You're stepping into personal time.", animation: 'expand' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 32, text: 'Calming Breath', guidance: 'In for 4... hold for 6... out for 8.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 18, text: 'Evening Intention', guidance: 'What will make this evening meaningful? Hold that intention.', animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 8, text: 'Your evening begins now.', guidance: 'Be present for what matters.', animation: 'fade' as const },
    ],
  },
};

export default function FlowPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();

  const flow = flowId ? FLOWS[flowId as keyof typeof FLOWS] : null;

  const handleComplete = async (rating?: number, notes?: string) => {
    try {
      // Log flow completion to backend
      await api.post('/api/flows/complete', {
        flowType: flowId,
        duration: flow?.duration || 0,
        rating,
        notes,
      });
      
      // Track daily completion for once-per-day flows
      if (flowId && ['evening-wind-down', 'end-of-day-transition', 'morning-intention'].includes(flowId)) {
        const today = new Date().toDateString();
        const completedFlows = JSON.parse(localStorage.getItem('mindgarden_daily_flows') || '{}');
        completedFlows[flowId] = today;
        localStorage.setItem('mindgarden_daily_flows', JSON.stringify(completedFlows));
      }
    } catch (error) {
      console.warn('Failed to log flow completion:', error);
    }

    navigate('/garden');
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (!flow) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl text-emerald-200 mb-4">Flow not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <FlowPlayer flow={flow} onComplete={handleComplete} onClose={handleClose} />;
}

