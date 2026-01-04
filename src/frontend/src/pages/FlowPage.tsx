/**
 * Mind Garden - Flow Page
 * 
 * Page that loads and displays a specific flow based on URL parameter.
 * All flows have been slowed down for a more meditative experience.
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import FlowPlayer from '../components/FlowPlayer';
import api from '../lib/axios';

// Flow definitions - SLOWED DOWN with ~40% longer durations
const FLOWS = {
  'pre-meeting-focus': {
    id: 'pre-meeting-focus',
    name: 'Pre-Meeting Focus',
    shortName: 'Focus',
    description: 'Center yourself before any meeting with focused breathing and intention setting.',
    duration: 250, // Increased from 180s
    bestFor: ['Standard meetings', 'Check-ins', 'One-on-ones', 'Team syncs'],
    breathingPattern: 'box' as const,
    icon: '🎯',
    benefits: ['Increased presence', 'Better listening', 'Clearer thinking'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 20, text: "Let's take a few minutes to prepare.", guidance: "Find a comfortable position. Close your eyes if you'd like. You're about to step into an important moment.", animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 72, text: 'Box Breathing', guidance: 'Breathe in slowly for 6 counts. Hold gently for 6. Breathe out slowly for 6. Hold for 6.', animation: 'breathe' as const },
      { id: 'body-scan', type: 'body-scan' as const, duration: 55, text: 'Quick Body Scan', guidance: 'Notice any tension in your shoulders. Your jaw. Your hands. Invite each area to soften and release.', animation: 'pulse' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 72, text: 'Continue Breathing', guidance: 'Another round of box breathing. In. Hold. Out. Hold. Let each breath deepen your calm.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 25, text: 'Set Your Intention', guidance: "What's your focus for this meeting? What do you want to bring to this conversation? Hold that intention clearly.", animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 12, text: "You're ready.", guidance: 'Take a final deep breath. Enter your meeting with presence and confidence.', animation: 'fade' as const },
    ],
  },
  'pre-presentation-power': {
    id: 'pre-presentation-power',
    name: 'Pre-Presentation Power',
    shortName: 'Power Up',
    description: 'Build confidence and presence before presentations, pitches, and speeches.',
    duration: 250, // Increased from 180s
    bestFor: ['Presentations', 'Pitches', 'Speeches', 'Demos', 'Interviews'],
    breathingPattern: 'energizing' as const,
    icon: '⚡',
    benefits: ['Increased confidence', 'Better projection', 'Reduced anxiety'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 15, text: "Let's build your presence for this moment.", guidance: "Stand tall if you can. You have something valuable to share.", animation: 'expand' as const },
      { id: 'power-pose', type: 'movement' as const, duration: 55, text: 'Power Pose', guidance: 'Stand with feet shoulder-width apart, hands on hips or raised. Expand your body. Take up space.', animation: 'expand' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 48, text: 'Energizing Breath', guidance: 'Quick, energizing breaths. In for 5... quick hold... out for 5... quick hold.', animation: 'breathe' as const },
      { id: 'visualization', type: 'visualization' as const, duration: 55, text: 'See Your Success', guidance: "Picture yourself delivering with confidence. See the audience engaged. Feel their attention.", animation: 'pulse' as const },
      { id: 'voice-warmup', type: 'movement' as const, duration: 40, text: 'Voice Warm-Up', guidance: 'Hum gently. Roll your shoulders. Loosen your jaw. Your voice is your instrument.', animation: 'pulse' as const },
      { id: 'affirmation', type: 'affirmation' as const, duration: 25, text: 'I am prepared and capable.', guidance: 'Say to yourself: "I am prepared. I am capable. I have value to share."', animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 12, text: "Go share your brilliance.", guidance: "You've got this.", animation: 'fade' as const },
    ],
  },
  'quick-reset': {
    id: 'quick-reset',
    name: 'Quick Reset',
    shortName: 'Reset',
    description: 'A gentle reset to clear your mind between meetings.',
    duration: 170, // Increased from 120s
    bestFor: ['Between meetings', 'Context switching', 'Mental fatigue', 'After stress'],
    breathingPattern: 'cleansing' as const,
    icon: '🔄',
    benefits: ['Mental clarity', 'Energy boost', 'Context shift'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 12, text: "Let's do a quick reset.", guidance: 'Stand up if you can. Roll your shoulders back.', animation: 'fade' as const },
      { id: 'shake-out', type: 'movement' as const, duration: 35, text: 'Shake It Out', guidance: 'Gently shake your hands. Your arms. Your shoulders. Release any tension from the last meeting.', animation: 'pulse' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 72, text: 'Cleansing Breaths', guidance: 'Deep breath in through your nose. Long, slow exhale through your mouth. Let everything go.', animation: 'breathe' as const },
      { id: 'mental-clear', type: 'visualization' as const, duration: 40, text: 'Clear Your Mind', guidance: "Imagine a gentle breeze clearing away thoughts. Each exhale releases what you no longer need. You're in the present now.", animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 15, text: 'Reset complete.', guidance: "Fresh start. You're ready for what's next.", animation: 'fade' as const },
    ],
  },
  'post-meeting-decompress': {
    id: 'post-meeting-decompress',
    name: 'Post-Meeting Decompress',
    shortName: 'Decompress',
    description: 'Release tension and transition after difficult or long meetings.',
    duration: 170, // Increased from 120s
    bestFor: ['After difficult meetings', 'After long meetings', 'Emotionally draining sessions'],
    breathingPattern: 'calming' as const,
    icon: '🌊',
    benefits: ['Tension release', 'Emotional processing', 'Return to baseline'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 12, text: "Let's release what just happened.", guidance: 'That meeting is over. Allow yourself to transition.', animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 46, text: 'Tension Release Breathing', guidance: 'Breathe in... hold... long exhale, releasing tension.', animation: 'breathe' as const },
      { id: 'body-release', type: 'body-scan' as const, duration: 42, text: 'Release Physical Tension', guidance: 'Roll your shoulders back... release your jaw... unclench your hands.', animation: 'pulse' as const },
      { id: 'acknowledgment', type: 'visualization' as const, duration: 28, text: 'Acknowledge & Release', guidance: "Whatever happened, acknowledge it without judgment. Then let it go.", animation: 'expand' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 28, text: 'Final Release', guidance: 'One more deep breath. In... and release everything on the exhale.', animation: 'breathe' as const },
      { id: 'closing', type: 'closing' as const, duration: 14, text: "You're back in the present.", guidance: 'Take this clarity with you.', animation: 'fade' as const },
    ],
  },
  'breathing': {
    id: 'breathing',
    name: 'Simple Breathing',
    shortName: 'Breathe',
    description: 'A simple breathing exercise to calm your mind.',
    duration: 130, // Increased from 90s
    bestFor: ['Quick calm', 'Anxiety relief', 'Focus boost'],
    breathingPattern: 'box' as const,
    icon: '🌬️',
    benefits: ['Calm mind', 'Reduced anxiety', 'Better focus'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 15, text: 'Take a moment to breathe.', guidance: 'Find a comfortable position. Let your shoulders drop. Relax your jaw.', animation: 'fade' as const },
      { id: 'breathing', type: 'breathing' as const, duration: 96, text: 'Box Breathing', guidance: 'Breathe in slowly for 6 counts. Hold gently for 6. Exhale slowly for 6. Rest for 6. Continue at your own pace.', animation: 'breathe' as const },
      { id: 'closing', type: 'closing' as const, duration: 20, text: 'Well done.', guidance: 'Notice how you feel now. Carry this calm with you into your next moment.', animation: 'fade' as const },
    ],
  },
  'difficult-conversation-prep': {
    id: 'difficult-conversation-prep',
    name: 'Difficult Conversation Prep',
    shortName: 'Ground',
    description: 'Ground yourself before challenging discussions with emotional regulation techniques.',
    duration: 250, // Increased from 180s
    bestFor: ['Performance reviews', 'Conflicts', 'Hard feedback', 'Negotiations', 'Sensitive topics'],
    breathingPattern: 'calming' as const,
    icon: '🌿',
    benefits: ['Emotional regulation', 'Better listening', 'Clearer communication'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 15, text: 'Prepare for this conversation with compassion.', guidance: "Difficult conversations are opportunities for growth. Let's approach this one grounded.", animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 69, text: 'Calming Breath', guidance: 'Extended exhale calms your nervous system. In for 5... hold for 8... out for 10.', animation: 'breathe' as const },
      { id: 'perspective', type: 'visualization' as const, duration: 55, text: 'Perspective Taking', guidance: "Consider the other person's position. What might they be feeling? What do they need?", animation: 'pulse' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 46, text: 'Continue Calming', guidance: 'In for 5... hold for 8... out for 10.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 42, text: 'Communication Intention', guidance: 'What outcome would serve everyone? Hold that intention. Speak from your values.', animation: 'expand' as const },
      { id: 'grounding', type: 'body-scan' as const, duration: 20, text: 'Ground in Values', guidance: 'Feel your feet on the ground. You are grounded in your integrity.', animation: 'pulse' as const },
      { id: 'closing', type: 'closing' as const, duration: 8, text: 'Enter with compassion.', guidance: 'You are ready.', animation: 'fade' as const },
    ],
  },
  'end-of-day-transition': {
    id: 'end-of-day-transition',
    name: 'End-of-Day Transition',
    shortName: 'Transition',
    description: 'Create a mental boundary between work and personal life.',
    duration: 250, // Increased from 180s
    bestFor: ['After last meeting', 'Before commute', 'Work-from-home transition'],
    breathingPattern: 'calming' as const,
    icon: '🌅',
    benefits: ['Work-life boundary', 'Mental closure', 'Evening presence'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 15, text: 'Time to close the work chapter.', guidance: 'The workday is complete. Honor what you accomplished.', animation: 'fade' as const },
      { id: 'breathing-1', type: 'breathing' as const, duration: 46, text: 'Transitional Breathing', guidance: 'Deep, slow breaths. In for 5... hold for 8... out for 10.', animation: 'breathe' as const },
      { id: 'acknowledgment', type: 'visualization' as const, duration: 55, text: 'Acknowledge Your Day', guidance: "What did you accomplish today? Give yourself credit without judgment. It's enough.", animation: 'pulse' as const },
      { id: 'letting-go', type: 'visualization' as const, duration: 55, text: 'Let Go of Work', guidance: "Visualize closing a door. Work stays on the other side. You're stepping into personal time.", animation: 'expand' as const },
      { id: 'breathing-2', type: 'breathing' as const, duration: 46, text: 'Calming Breath', guidance: 'In for 5... hold for 8... out for 10.', animation: 'breathe' as const },
      { id: 'intention', type: 'visualization' as const, duration: 25, text: 'Evening Intention', guidance: 'What will make this evening meaningful? Hold that intention.', animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 12, text: 'Your evening begins now.', guidance: 'Be present for what matters.', animation: 'fade' as const },
    ],
  },
  'morning-intention': {
    id: 'morning-intention',
    name: 'Morning Intention Flow',
    shortName: 'Morning',
    description: 'Start your day with gratitude, intention setting, and gentle energizing movement.',
    duration: 600,
    bestFor: ['Morning routine', '6:00-9:00 AM', 'Before workday begins'],
    breathingPattern: 'energizing' as const,
    icon: '☀️',
    benefits: ['Clear intention', 'Positive mindset', 'Day preparation'],
    steps: [
      { id: 'gentle-wake', type: 'body-scan' as const, duration: 60, text: 'Gentle Wake-Up', guidance: 'Awareness of breathing, body sensations, transitioning from sleep. Take your time.', animation: 'fade' as const },
      { id: 'gratitude', type: 'gratitude' as const, duration: 90, text: 'Gratitude Practice', guidance: "Name three things you're grateful for. They can be small. A warm bed. A new day. Someone you love.", animation: 'pulse' as const },
      { id: 'calendar-review', type: 'visualization' as const, duration: 120, text: 'Calendar Review', guidance: "Look at your schedule with curiosity, not judgment. Notice what's ahead without attachment.", animation: 'pulse' as const },
      { id: 'intention', type: 'visualization' as const, duration: 120, text: 'Intention Setting', guidance: "What's one thing you want to prioritize today? How do you want to feel? Hold that intention.", animation: 'expand' as const },
      { id: 'movement', type: 'movement' as const, duration: 120, text: 'Energizing Movement', guidance: 'Gentle stretches, shoulder rolls, standing poses. Wake up your body with compassion.', animation: 'pulse' as const },
      { id: 'centering', type: 'affirmation' as const, duration: 90, text: 'Centering', guidance: 'Final breaths. Say to yourself: "I am ready. I am capable. I begin with intention."', animation: 'expand' as const },
    ],
  },
  'evening-wind-down': {
    id: 'evening-wind-down',
    name: 'Evening Wind-Down Flow',
    shortName: 'Wind Down',
    description: 'Transition from work mode with body scan, reflection, and sleep preparation.',
    duration: 900,
    bestFor: ['Evening routine', '7:00-10:00 PM', 'Before bedtime routine'],
    breathingPattern: 'calming' as const,
    icon: '🌙',
    benefits: ['Work-life separation', 'Better sleep', 'Day closure'],
    steps: [
      { id: 'transition', type: 'intro' as const, duration: 120, text: 'Transition', guidance: 'The workday is over. Give yourself permission to let go completely.', animation: 'fade' as const },
      { id: 'body-scan', type: 'body-scan' as const, duration: 180, text: 'Body Scan', guidance: 'Head to toe, noticing and releasing tension in each area. Your forehead... your jaw... your shoulders...', animation: 'pulse' as const },
      { id: 'reflection', type: 'reflection' as const, duration: 180, text: 'Day Reflection', guidance: 'What went well today? What was challenging? No judgment, just notice and let it be.', animation: 'pulse' as const },
      { id: 'gratitude', type: 'gratitude' as const, duration: 120, text: 'Evening Gratitude', guidance: 'What moments today brought you joy or peace? Acknowledge them with gratitude.', animation: 'expand' as const },
      { id: 'letting-go', type: 'letting-go' as const, duration: 120, text: 'Letting Go', guidance: 'Imagine stress leaving your body like sand through fingers. Let it all go.', animation: 'expand' as const },
      { id: 'sleep-prep', type: 'breathing' as const, duration: 180, text: 'Sleep Preparation', guidance: '4-7-8 breathing. In for 4... hold for 7... out for 8. This activates your parasympathetic nervous system.', animation: 'breathe' as const },
    ],
  },
  'weekend-wellness': {
    id: 'weekend-wellness',
    name: 'Weekend Wellness Flow',
    shortName: 'Weekend',
    description: 'Longer meditation session for weekends with week reflection and self-compassion.',
    duration: 1200,
    bestFor: ['Weekends', 'Saturday or Sunday', 'Deep relaxation'],
    breathingPattern: 'calming' as const,
    icon: '🧘',
    benefits: ['Deep relaxation', 'Week closure', 'Self-compassion'],
    steps: [
      { id: 'settling', type: 'intro' as const, duration: 180, text: 'Settling', guidance: "Arriving in the moment, letting go of the week's momentum. There's nowhere to be but here.", animation: 'fade' as const },
      { id: 'week-reflection', type: 'reflection' as const, duration: 300, text: 'Week Reflection', guidance: 'Guided questions about the week. What challenged you? What did you learn? No judgment, just observation.', animation: 'pulse' as const },
      { id: 'meditation', type: 'meditation' as const, duration: 300, text: 'Extended Meditation', guidance: 'Focus on your breath. When thoughts arise, acknowledge them and return to breath. This is your practice.', animation: 'breathe' as const },
      { id: 'self-compassion', type: 'self-compassion' as const, duration: 240, text: 'Self-Compassion', guidance: 'How would you talk to a friend who had your week? Offer yourself that same kindness.', animation: 'expand' as const },
      { id: 'intention', type: 'visualization' as const, duration: 180, text: 'Week-Ahead Intention', guidance: 'Light planning, hopes for the coming week. Not work tasks, but how you want to feel.', animation: 'expand' as const },
    ],
  },
  'deep-meditation': {
    id: 'deep-meditation',
    name: 'Deep Meditation',
    shortName: 'Deep',
    description: 'Extended meditation session with minimal guidance for experienced practitioners.',
    duration: 1800,
    bestFor: ['Deep practice', 'After consistency', 'Experienced meditators'],
    breathingPattern: 'calming' as const,
    icon: '🌳',
    benefits: ['Deep calm', 'Mental clarity', 'Profound relaxation'],
    steps: [
      { id: 'settling', type: 'intro' as const, duration: 120, text: 'Settling In', guidance: 'Find your comfortable position. This is your sanctuary for the next 30 minutes.', animation: 'fade' as const },
      { id: 'breath-anchor', type: 'breathing' as const, duration: 300, text: 'Breath Anchor', guidance: 'Attention on natural breath, returning when mind wanders. No effort, just observation.', animation: 'breathe' as const },
      { id: 'main-practice', type: 'meditation' as const, duration: 900, text: 'Main Practice', guidance: 'Your focus: breath, body scan, loving-kindness, or open awareness. Find what serves you.', animation: 'pulse' as const },
      { id: 'integration', type: 'body-scan' as const, duration: 300, text: 'Integration', guidance: 'Gradually expand awareness. Notice sounds, sensations, the space around you.', animation: 'expand' as const },
      { id: 'return', type: 'closing' as const, duration: 180, text: 'Gentle Return', guidance: 'Begin to return. Gentle movements. Carry this peace with you into your day.', animation: 'fade' as const },
    ],
  },
  'body-scan': {
    id: 'body-scan',
    name: 'Full Body Scan',
    shortName: 'Body Scan',
    description: 'Complete body awareness meditation for tension release and deep relaxation.',
    duration: 1500,
    bestFor: ['Physical tension', 'Body awareness', 'Deep relaxation'],
    breathingPattern: 'calming' as const,
    icon: '✨',
    benefits: ['Tension release', 'Body awareness', 'Deep relaxation'],
    steps: [
      { id: 'intro', type: 'intro' as const, duration: 60, text: 'Begin Your Journey', guidance: 'Lie down or sit comfortably. This is a journey through your body.', animation: 'fade' as const },
      { id: 'settling', type: 'breathing' as const, duration: 120, text: 'Settling', guidance: 'A few deep breaths to settle in. Let your body feel supported.', animation: 'breathe' as const },
      { id: 'feet', type: 'body-scan' as const, duration: 120, text: 'Feet', guidance: 'Bring attention to your feet. Notice sensations in your toes, soles, heels.', animation: 'pulse' as const },
      { id: 'legs', type: 'body-scan' as const, duration: 150, text: 'Legs', guidance: 'Move up to your ankles, calves, knees, thighs. Release any tension you find.', animation: 'pulse' as const },
      { id: 'hips', type: 'body-scan' as const, duration: 120, text: 'Hips & Lower Back', guidance: 'Notice your hips, lower back. Let them sink into support.', animation: 'pulse' as const },
      { id: 'abdomen', type: 'body-scan' as const, duration: 150, text: 'Abdomen & Chest', guidance: 'Feel your belly rise and fall. Notice your chest, ribs expanding.', animation: 'pulse' as const },
      { id: 'hands', type: 'body-scan' as const, duration: 120, text: 'Hands & Arms', guidance: 'Awareness to your fingertips, hands, forearms, upper arms.', animation: 'pulse' as const },
      { id: 'shoulders', type: 'body-scan' as const, duration: 150, text: 'Shoulders & Neck', guidance: 'Common tension areas. Soften your shoulders. Release your neck.', animation: 'pulse' as const },
      { id: 'face', type: 'body-scan' as const, duration: 150, text: 'Face & Head', guidance: 'Relax your jaw, eyes, forehead. Let your face be soft.', animation: 'pulse' as const },
      { id: 'whole-body', type: 'body-scan' as const, duration: 180, text: 'Whole Body', guidance: 'Feel your entire body as one. A sense of wholeness and peace.', animation: 'expand' as const },
      { id: 'closing', type: 'closing' as const, duration: 60, text: 'Renewed', guidance: 'You are renewed. Take your time returning.', animation: 'fade' as const },
    ],
  },
};

export default function FlowPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [autostart, setAutostart] = useState(false);
  
  const flow = flowId ? FLOWS[flowId as keyof typeof FLOWS] : null;
  
  // Check for autostart parameter from notification deep links
  useEffect(() => {
    const shouldAutostart = searchParams.get('autostart') === 'true';
    const meetingId = searchParams.get('meetingId');
    
    if (shouldAutostart) {
      setAutostart(true);
      // Remove autostart from URL to prevent replay on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('autostart');
      if (!meetingId) newParams.delete('meetingId');
      window.history.replaceState({}, '', `${window.location.pathname}${newParams.toString() ? `?${newParams}` : ''}`);
    }
  }, [searchParams]);

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

    navigate('/dashboard');
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

  return <FlowPlayer flow={flow} onComplete={handleComplete} onClose={handleClose} autostart={autostart} />;
}
