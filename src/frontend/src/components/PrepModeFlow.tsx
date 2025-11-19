/**
 * PrepModeFlow Component
 * 
 * Renders the 5-step scripted flow for each prep mode
 * Each mode has unique steps tailored to its psychological focus
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';

type PrepMode = 'clarity' | 'confidence' | 'connection' | 'composure' | 'momentum';

interface PrepModeFlowProps {
  mode: PrepMode;
  onComplete: (responses: Record<string, string>) => void;
}

interface FlowStep {
  title: string;
  prompt: string;
  inputType: 'text' | 'textarea' | 'choice' | 'breathing' | 'visualization';
  choices?: string[];
  placeholder?: string;
  toneCue?: string;
}

const PREP_MODE_FLOWS: Record<PrepMode, FlowStep[]> = {
  clarity: [
    {
      title: 'Center Yourself',
      prompt: 'Take 3 deep breaths. Inhale clarity, exhale confusion.',
      inputType: 'breathing',
    },
    {
      title: 'Anchor Intention',
      prompt: 'In one sentence - why does this meeting exist?',
      inputType: 'text',
      placeholder: 'This meeting exists to...',
    },
    {
      title: 'Top Three Points',
      prompt: 'Which 3 things must be acknowledged, agreed, or answered?',
      inputType: 'textarea',
      placeholder: '1.\n2.\n3.',
    },
    {
      title: 'Decision Win',
      prompt: 'What\'s the action, approval, or outcome you need by the end?',
      inputType: 'text',
      placeholder: 'By the end, I need...',
    },
    {
      title: 'First Line Ready',
      prompt: 'What\'s your opener - one sentence that sets direction?',
      inputType: 'text',
      placeholder: 'I\'ll open with...',
      toneCue: 'You\'re here to shape the story, not watch it.',
    },
  ],
  confidence: [
    {
      title: 'Body Reset',
      prompt: 'Deep inhale x 3 - lengthen exhale - shoulders down, jaw unlocked.',
      inputType: 'breathing',
    },
    {
      title: 'Power Memory',
      prompt: 'Recall one recent win where you showed up strong. Feel it in your body.',
      inputType: 'textarea',
      placeholder: 'I remember when I...',
    },
    {
      title: 'Identity Shift',
      prompt: 'What version of you is walking in?',
      inputType: 'choice',
      choices: ['Authoritative', 'Visionary', 'Calm', 'Decisive'],
    },
    {
      title: 'Presence Line',
      prompt: 'What do you want others to feel from you?',
      inputType: 'choice',
      choices: ['Steady', 'Inspired', 'Confident', 'Collaborative'],
    },
    {
      title: 'Spotlight Moment',
      prompt: 'Visualize the key line landing - and silence afterward.',
      inputType: 'visualization',
      toneCue: 'Own the moment. They\'re lucky to have you in the room.',
    },
  ],
  connection: [
    {
      title: 'Open Your Heart',
      prompt: 'Take 3 deep breaths. Inhale empathy, exhale judgment.',
      inputType: 'breathing',
    },
    {
      title: 'Who Are They Today?',
      prompt: 'What might this person be feeling walking in? Pick an empathy posture.',
      inputType: 'textarea',
      placeholder: 'They might be feeling...',
    },
    {
      title: 'Shared Purpose',
      prompt: 'What\'s the "us" goal? Not "my" goal.',
      inputType: 'text',
      placeholder: 'Together, we want to...',
    },
    {
      title: 'Curiosity Question',
      prompt: 'What\'s one question that opens the room? Prepare to listen.',
      inputType: 'text',
      placeholder: 'I\'ll ask...',
    },
    {
      title: 'Appreciation Cue',
      prompt: 'Acknowledge something real about them - truth builds trust.',
      inputType: 'text',
      placeholder: 'I appreciate that they...',
      toneCue: 'Lead with connection. The work will follow.',
    },
  ],
  composure: [
    {
      title: 'Nervous System Reset',
      prompt: 'Box breathing (4-4-4-4) or guided inhale 4 - exhale 6.',
      inputType: 'breathing',
    },
    {
      title: 'Boundary Belief',
      prompt: 'It\'s not all on me. What can I let go of?',
      inputType: 'text',
      placeholder: 'I don\'t need to...',
    },
    {
      title: 'Slow the Pace',
      prompt: 'A full breath before your first word. Practice once.',
      inputType: 'breathing',
    },
    {
      title: 'Presence Anchor',
      prompt: 'Choose something tactile to ground you.',
      inputType: 'choice',
      choices: ['Feet planted', 'Hand on chest', 'Pen hold', 'Desk edge'],
    },
    {
      title: 'One Success Cue',
      prompt: 'If all else fails - what\'s the one win?',
      inputType: 'text',
      placeholder: 'Success means...',
      toneCue: 'Nothing rushes you. You set the tempo.',
    },
  ],
  momentum: [
    {
      title: 'Energize',
      prompt: 'Take 3 powerful breaths. Inhale energy, exhale hesitation.',
      inputType: 'breathing',
    },
    {
      title: 'Name the Block',
      prompt: 'What\'s the friction point?',
      inputType: 'text',
      placeholder: 'The block is...',
    },
    {
      title: 'One Actionable Ask',
      prompt: 'Who needs to do what next? Name the real owner.',
      inputType: 'text',
      placeholder: '[Person] needs to [action]...',
    },
    {
      title: 'Micro-Goal',
      prompt: 'What\'s a 1-day success from this meeting?',
      inputType: 'text',
      placeholder: 'By tomorrow, we\'ll have...',
    },
    {
      title: 'Close Strong',
      prompt: 'I\'ll summarize next steps before we end.',
      inputType: 'visualization',
      toneCue: 'A scene isn\'t done until something changes.',
    },
  ],
};

export default function PrepModeFlow({ mode, onComplete }: PrepModeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [breathingCount, setBreathingCount] = useState(0);

  const steps = PREP_MODE_FLOWS[mode];
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    // Save response
    if (step.inputType !== 'breathing' && step.inputType !== 'visualization') {
      setResponses({ ...responses, [step.title]: currentResponse });
    }

    if (isLastStep) {
      onComplete(responses);
    } else {
      setCurrentStep(currentStep + 1);
      setCurrentResponse('');
      setBreathingCount(0);
    }
  };

  const handleBreathingComplete = () => {
    setBreathingCount(prev => prev + 1);
    if (breathingCount >= 2) { // 3 breaths
      setTimeout(handleNext, 1000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-teal-300">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-teal-300">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-600 to-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          {/* Step Title */}
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4 text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {step.title}
          </motion.h2>

          {/* Step Prompt */}
          <motion.p
            className="text-lg sm:text-xl text-teal-200 mb-8 text-center leading-relaxed"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {step.prompt}
          </motion.p>

          {/* Input Based on Type */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            {step.inputType === 'text' && (
              <input
                type="text"
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                placeholder={step.placeholder}
                className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
                autoFocus
              />
            )}

            {step.inputType === 'textarea' && (
              <textarea
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                placeholder={step.placeholder}
                rows={4}
                className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg resize-none"
                autoFocus
              />
            )}

            {step.inputType === 'choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step.choices?.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => setCurrentResponse(choice)}
                    className={`
                      px-6 py-4 rounded-xl text-left transition-all duration-200
                      ${currentResponse === choice
                        ? 'bg-gradient-to-r from-teal-600 to-indigo-600 border-2 border-teal-400 scale-105'
                        : 'bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{choice}</span>
                      {currentResponse === choice && <Check className="w-5 h-5" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step.inputType === 'breathing' && (
              <div className="text-center flex flex-col items-center justify-center min-h-[400px]">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-24 h-24 sm:w-32 sm:h-32 mb-8 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center shadow-lg"
                >
                  <span className="text-3xl sm:text-4xl">🫁</span>
                </motion.div>
                <p className="text-teal-200 mb-4 text-sm sm:text-base px-4">
                  Breathe in (4) → Hold (4) → Breathe out (4) → Hold (4)
                </p>
                <p className="text-sm text-teal-400">
                  Completed: {breathingCount} / 3
                </p>
                <button
                  onClick={handleBreathingComplete}
                  className="mt-6 px-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Complete Breath
                </button>
              </div>
            )}

            {step.inputType === 'visualization' && (
              <div className="text-center flex flex-col items-center justify-center min-h-[400px]">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 sm:w-32 sm:h-32 mb-8 rounded-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center shadow-lg"
                >
                  <span className="text-3xl sm:text-4xl">✨</span>
                </motion.div>
                <p className="text-teal-200 mb-6 text-sm sm:text-base px-4">
                  Take 30 seconds to visualize this moment...
                </p>
              </div>
            )}
          </motion.div>

          {/* Tone Cue */}
          {step.toneCue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8 p-4 bg-gradient-to-r from-teal-500/20 to-indigo-500/20 border border-teal-400/30 rounded-lg text-center"
            >
              <p className="text-teal-200 italic">
                🎬 "{step.toneCue}"
              </p>
            </motion.div>
          )}

          {/* Next Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={handleNext}
            disabled={
              (step.inputType === 'text' || step.inputType === 'textarea') && !currentResponse ||
              (step.inputType === 'choice' && !currentResponse) ||
              (step.inputType === 'breathing' && breathingCount < 3)
            }
            className={`
              w-full px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2
              transition-all duration-200
              ${(step.inputType === 'text' || step.inputType === 'textarea') && !currentResponse ||
                (step.inputType === 'choice' && !currentResponse) ||
                (step.inputType === 'breathing' && breathingCount < 3)
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 hover:scale-105'
              }
            `}
          >
            {isLastStep ? 'Complete Prep' : 'Next Step'}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

