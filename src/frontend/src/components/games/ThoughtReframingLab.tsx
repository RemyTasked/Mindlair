/**
 * Mind Garden - Thought Reframing Lab
 * 
 * CBT-based Cognitive Restructuring Tool with Smart Guidance
 * Identify cognitive distortions and practice reframing negative thoughts.
 * Now with intelligent feedback on distortion selection and reframe quality!
 * +5 Serenity per reframe
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Brain, Lightbulb, ArrowRight, 
  Sparkles, RefreshCw, CheckCircle2, AlertCircle, ThumbsUp
} from 'lucide-react';
import api from '../../lib/axios';

interface ThoughtReframingLabProps {
  onComplete: (credits: number, streak: number) => void;
  onExit?: () => void;
}

interface DistortedThought {
  id: string;
  thought: string;
  distortionType: DistortionType;
  hint: string;
  exampleReframe: string;
}

type DistortionType = 
  | 'all-or-nothing'
  | 'catastrophizing'
  | 'mind-reading'
  | 'fortune-telling'
  | 'should-statements'
  | 'labeling'
  | 'overgeneralization'
  | 'emotional-reasoning';

const DISTORTION_INFO: Record<DistortionType, { name: string; description: string; color: string; keywords: string[] }> = {
  'all-or-nothing': {
    name: 'All-or-Nothing Thinking',
    description: 'Seeing things in black and white with no middle ground',
    color: 'bg-red-100 text-red-700 border-red-300',
    keywords: ['always', 'never', 'completely', 'totally', 'perfect', 'ruined', 'failure', 'success'],
  },
  'catastrophizing': {
    name: 'Catastrophizing',
    description: 'Expecting the worst possible outcome',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    keywords: ['disaster', 'terrible', 'horrible', 'worst', 'ruin', 'end', 'awful', 'nightmare'],
  },
  'mind-reading': {
    name: 'Mind Reading',
    description: 'Assuming you know what others think without evidence',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    keywords: ['they think', 'everyone thinks', 'probably thinks', 'must think', 'hate me', 'judge me'],
  },
  'fortune-telling': {
    name: 'Fortune Telling',
    description: 'Predicting negative outcomes as if they\'re certain',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    keywords: ['will be', 'going to', 'never going to', 'won\'t work', 'bound to', 'definitely will'],
  },
  'should-statements': {
    name: 'Should Statements',
    description: 'Rigid rules about how things must be',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    keywords: ['should', 'must', 'have to', 'ought to', 'supposed to', 'need to'],
  },
  'labeling': {
    name: 'Labeling',
    description: 'Attaching a negative label to yourself or others',
    color: 'bg-pink-100 text-pink-700 border-pink-300',
    keywords: ['i\'m a', 'i am a', 'such an', 'idiot', 'loser', 'failure', 'stupid', 'worthless'],
  },
  'overgeneralization': {
    name: 'Overgeneralization',
    description: 'Drawing broad conclusions from single events',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    keywords: ['always', 'never', 'everyone', 'nobody', 'nothing', 'everything', 'all the time'],
  },
  'emotional-reasoning': {
    name: 'Emotional Reasoning',
    description: 'Assuming feelings reflect reality',
    color: 'bg-teal-100 text-teal-700 border-teal-300',
    keywords: ['i feel', 'feels like', 'must be', 'so it is', 'therefore'],
  },
};

// Counter-keywords for reframe validation
const REFRAME_POSITIVE_INDICATORS = [
  'sometimes', 'often', 'may', 'might', 'could', 'possible', 'some',
  'balanced', 'perspective', 'learn', 'growth', 'opportunity',
  'however', 'but', 'although', 'even though', 'despite',
  'grateful', 'appreciate', 'thankful',
  'okay', 'alright', 'fine', 'manageable', 'handle',
  'try', 'attempt', 'work on', 'progress',
];

const DISTORTED_THOUGHTS: DistortedThought[] = [
  {
    id: '1',
    thought: "I always mess up presentations.",
    distortionType: 'overgeneralization',
    hint: "Is 'always' really accurate?",
    exampleReframe: "Sometimes my presentations go well, sometimes I learn from mistakes. One challenging presentation doesn't define all of them.",
  },
  {
    id: '2',
    thought: "If I don't get this promotion, I'm a complete failure.",
    distortionType: 'all-or-nothing',
    hint: "Are there only two options here?",
    exampleReframe: "Not getting this promotion would be disappointing, but it doesn't define my worth or mean I'm a failure. There will be other opportunities.",
  },
  {
    id: '3',
    thought: "Everyone at the meeting thought my idea was stupid.",
    distortionType: 'mind-reading',
    hint: "Do you actually know what everyone thought?",
    exampleReframe: "I can't know what everyone thought. Some may have liked it, some may not have. I only heard from a few people.",
  },
  {
    id: '4',
    thought: "This project is going to be a disaster.",
    distortionType: 'fortune-telling',
    hint: "Can you really predict the future?",
    exampleReframe: "I'm feeling anxious about the project, but I don't actually know how it will turn out. I can focus on what I can control.",
  },
  {
    id: '5',
    thought: "I should always be productive.",
    distortionType: 'should-statements',
    hint: "Is this realistic? What about rest?",
    exampleReframe: "It's healthy to have productive times and rest times. I can aim for balance rather than perfection.",
  },
  {
    id: '6',
    thought: "I'm such an idiot for making that mistake.",
    distortionType: 'labeling',
    hint: "Does one mistake define who you are?",
    exampleReframe: "I made a mistake, which is human. One error doesn't make me an idiot—it's an opportunity to learn.",
  },
  {
    id: '7',
    thought: "I feel overwhelmed, so this situation must be impossible.",
    distortionType: 'emotional-reasoning',
    hint: "Are your feelings the same as facts?",
    exampleReframe: "I'm feeling overwhelmed right now, but feelings aren't facts. With some planning and support, I can handle this.",
  },
  {
    id: '8',
    thought: "They didn't respond to my message—they must hate me.",
    distortionType: 'catastrophizing',
    hint: "Are there other explanations?",
    exampleReframe: "There could be many reasons they haven't responded yet—they might be busy. I'll give it more time before assuming the worst.",
  },
  {
    id: '9',
    thought: "I never do anything right.",
    distortionType: 'overgeneralization',
    hint: "Really? Nothing at all?",
    exampleReframe: "That's not true. I can think of many things I've done well. One setback doesn't erase my accomplishments.",
  },
  {
    id: '10',
    thought: "My coworkers probably think I'm incompetent.",
    distortionType: 'mind-reading',
    hint: "What evidence do you have for this?",
    exampleReframe: "I don't actually know what they think. My last review was positive, and I've completed several projects successfully.",
  },
  {
    id: '11',
    thought: "If I ask for help, people will think I'm weak.",
    distortionType: 'fortune-telling',
    hint: "Is this prediction based on facts?",
    exampleReframe: "Asking for help is actually a sign of self-awareness. Most people appreciate when others seek collaboration.",
  },
  {
    id: '12',
    thought: "I shouldn't feel anxious about this.",
    distortionType: 'should-statements',
    hint: "Can you control your emotions perfectly?",
    exampleReframe: "Anxiety is a normal human emotion. It's okay to feel anxious—I can acknowledge it and still move forward.",
  },
];

const POINTS_PER_REFRAME = 5;

// Game difficulty levels
const DIFFICULTY_LEVELS = [
  { id: 'beginner', name: 'Beginner', description: 'Single distortion, helpful hints', thoughtCount: 4, showHints: true, multipleDistortions: false },
  { id: 'intermediate', name: 'Intermediate', description: 'More variety, fewer hints', thoughtCount: 5, showHints: false, multipleDistortions: false },
  { id: 'advanced', name: 'Advanced', description: 'Challenging thoughts', thoughtCount: 6, showHints: false, multipleDistortions: false },
  { id: 'expert', name: 'Expert', description: 'Complex thoughts, multiple distortions', thoughtCount: 7, showHints: false, multipleDistortions: true },
];

// Additional challenge thoughts for Expert mode (multiple distortions)
const EXPERT_THOUGHTS: DistortedThought[] = [
  {
    id: 'e1',
    thought: "I always fail at everything, and everyone knows I'm a complete fraud.",
    distortionType: 'overgeneralization', // Also labeling + mind-reading
    hint: "Notice the extreme words and assumptions about others",
    exampleReframe: "I sometimes struggle with challenges, which is normal. I can't know what others think, and one setback doesn't define my abilities.",
  },
  {
    id: 'e2',
    thought: "If I don't get this perfect, my whole career will be ruined forever.",
    distortionType: 'catastrophizing', // Also all-or-nothing + fortune-telling
    hint: "Consider if one outcome truly determines everything",
    exampleReframe: "While this is important, my career is built on many experiences. Imperfection is human, and there will be other opportunities.",
  },
  {
    id: 'e3',
    thought: "I should be happy all the time. Since I'm not, I must be broken.",
    distortionType: 'should-statements', // Also emotional-reasoning + labeling
    hint: "Are your expectations realistic? Can emotions define who you are?",
    exampleReframe: "All emotions are valid, including difficult ones. Feeling unhappy sometimes is part of being human, not a sign of being broken.",
  },
  {
    id: 'e4',
    thought: "They're all talking about my mistake. I'll never recover from this humiliation.",
    distortionType: 'mind-reading', // Also catastrophizing + fortune-telling
    hint: "Do you have evidence for these assumptions?",
    exampleReframe: "I don't know what others are thinking. Mistakes happen to everyone, and people usually move on quickly. I can recover from this.",
  },
  {
    id: 'e5',
    thought: "I feel like a failure, which means I am one. Nothing I do ever works out.",
    distortionType: 'emotional-reasoning', // Also labeling + overgeneralization
    hint: "Are feelings the same as facts?",
    exampleReframe: "Feeling like a failure doesn't make it true. I can think of times when things worked out. My worth isn't determined by temporary feelings.",
  },
];

interface ReframeFeedback {
  isGood: boolean;
  message: string;
  tips: string[];
}

// Educational intro examples
const INTRO_EXAMPLES = [
  {
    title: 'What is Thought Reframing?',
    description: 'Our brains sometimes play tricks on us, creating "cognitive distortions" - unhelpful thinking patterns that make situations seem worse than they are. Reframing means catching these tricky thoughts and finding a more balanced, realistic perspective.',
    example: null,
  },
  {
    title: 'Example: Catastrophizing',
    description: 'This is when we assume the worst will happen, even without evidence.',
    example: {
      distortion: 'Catastrophizing',
      thought: '"I\'m going to fail this presentation."',
      reframe: '"I\'ve prepared well. Even if it\'s not perfect, I can learn from the experience."',
      why: 'The reframe acknowledges uncertainty without assuming disaster.',
    },
  },
  {
    title: 'Example: Mind Reading',
    description: 'This is when we assume we know what others are thinking about us.',
    example: {
      distortion: 'Mind Reading',
      thought: '"They all think I\'m incompetent."',
      reframe: '"I don\'t actually know what they think. My work speaks for itself."',
      why: 'The reframe recognizes we can\'t read minds.',
    },
  },
  {
    title: 'How to Play',
    description: 'In this game, you\'ll practice identifying cognitive distortions and writing your own balanced reframes. Don\'t worry - the game will guide you with feedback!',
    example: null,
    steps: [
      { num: 1, text: 'Read the thought and identify its distortion pattern' },
      { num: 2, text: 'Write a more balanced, realistic perspective' },
      { num: 3, text: 'Compare your reframe with an example' },
    ],
  },
];

export default function ThoughtReframingLab({ onComplete, onExit }: ThoughtReframingLabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<'identify' | 'reframe' | 'compare'>('identify');
  const [selectedDistortion, setSelectedDistortion] = useState<DistortionType | null>(null);
  const [userReframe, setUserReframe] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [reframedCount, setReframedCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [introStep, setIntroStep] = useState(0);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  const currentDifficulty = DIFFICULTY_LEVELS[selectedDifficulty];
  const [customThought, setCustomThought] = useState('');
  const [isUsingCustom, setIsUsingCustom] = useState(false);
  const [distortionFeedback, setDistortionFeedback] = useState<string | null>(null);
  const [reframeFeedback, setReframeFeedback] = useState<ReframeFeedback | null>(null);

  // Select random thoughts for session based on difficulty
  const [thoughts, setThoughts] = useState<DistortedThought[]>([]);
  
  // Initialize thoughts when difficulty is selected
  const initializeThoughts = () => {
    let pool = [...DISTORTED_THOUGHTS];
    
    // Expert mode includes complex multi-distortion thoughts
    if (currentDifficulty.multipleDistortions) {
      pool = [...EXPERT_THOUGHTS, ...pool];
    }
    
    const shuffled = pool.sort(() => Math.random() - 0.5);
    setThoughts(shuffled.slice(0, currentDifficulty.thoughtCount));
  };

  const currentThought = isUsingCustom 
    ? { id: 'custom', thought: customThought, distortionType: selectedDistortion || 'all-or-nothing', hint: '', exampleReframe: '' }
    : thoughts[currentIndex];

  // Validate distortion selection
  const validateDistortionChoice = (selected: DistortionType): string | null => {
    if (isUsingCustom) return null; // Can't validate custom thoughts
    
    const correct = currentThought.distortionType;
    if (selected === correct) return null;
    
    // Provide educational explanation
    const correctInfo = DISTORTION_INFO[correct];
    const selectedInfo = DISTORTION_INFO[selected];
    
    return `This thought is actually "${correctInfo.name}". ${correctInfo.description}. Notice the pattern: "${currentThought.thought}" suggests ${correct === 'overgeneralization' ? 'a sweeping conclusion from one event' : correct === 'mind-reading' ? 'assuming what others think' : correct === 'fortune-telling' ? 'predicting a negative future' : correct === 'all-or-nothing' ? 'only two extreme options' : correct === 'should-statements' ? 'rigid rules about how things must be' : correct === 'labeling' ? 'attaching a negative label' : correct === 'catastrophizing' ? 'expecting the worst' : 'feelings dictating reality'}. "${selectedInfo.name}" would be more about ${selectedInfo.description.toLowerCase()}.`;
  };

  // Validate reframe quality using heuristics
  const validateReframe = (original: string, reframe: string): ReframeFeedback => {
    const reframeLower = reframe.toLowerCase();
    const originalLower = original.toLowerCase();
    const tips: string[] = [];
    let score = 0;
    
    // Check 1: Reframe is substantially different
    if (reframe.length > original.length * 0.8) {
      score += 1;
    } else {
      tips.push("Try expanding your reframe with more balanced perspective");
    }
    
    // Check 2: Contains positive/balanced indicators
    const hasPositiveIndicators = REFRAME_POSITIVE_INDICATORS.some(word => 
      reframeLower.includes(word)
    );
    if (hasPositiveIndicators) {
      score += 2;
    } else {
      tips.push("Use words like 'sometimes', 'might', 'could', or 'however' to add nuance");
    }
    
    // Check 3: Avoids repeating extreme language from original
    const distortionKeywords = DISTORTION_INFO[currentThought.distortionType as DistortionType]?.keywords || [];
    const repeatsExtreme = distortionKeywords.some(word => 
      originalLower.includes(word) && reframeLower.includes(word)
    );
    if (!repeatsExtreme) {
      score += 1;
    } else {
      tips.push("Try to replace extreme words like 'always', 'never', 'everyone' with more moderate alternatives");
    }
    
    // Check 4: Minimum length
    if (reframe.length >= 30) {
      score += 1;
    } else {
      tips.push("A more detailed reframe helps internalize the balanced thinking");
    }
    
    // Determine feedback
    if (score >= 4) {
      return {
        isGood: true,
        message: "Excellent reframe! You've successfully challenged the distorted thinking.",
        tips: [],
      };
    } else if (score >= 2) {
      return {
        isGood: true,
        message: "Good effort! Your reframe shows balanced thinking.",
        tips: tips.slice(0, 1), // Show one tip for improvement
      };
    } else {
      return {
        isGood: false,
        message: "Your reframe could be more balanced. Here are some suggestions:",
        tips,
      };
    }
  };

  const handleDistortionSelect = (distortion: DistortionType) => {
    setSelectedDistortion(distortion);
    setDistortionFeedback(null);
  };

  const handleSubmitIdentification = () => {
    if (!selectedDistortion) return;
    
    const feedback = validateDistortionChoice(selectedDistortion);
    if (feedback) {
      setDistortionFeedback(feedback);
      return;
    }
    
    setStep('reframe');
  };

  const handleAcceptCorrection = () => {
    // User acknowledges the correct answer and moves to reframe
    if (!isUsingCustom) {
      setSelectedDistortion(currentThought.distortionType as DistortionType);
    }
    setDistortionFeedback(null);
    setStep('reframe');
  };

  const handleSubmitReframe = () => {
    if (userReframe.trim().length < 10) return;
    
    const feedback = validateReframe(currentThought.thought, userReframe);
    setReframeFeedback(feedback);
    
    // If not good, let them revise
    if (!feedback.isGood) {
      return;
    }
    
    // Move to compare step
    setStep('compare');
    setReframedCount(prev => prev + 1);
  };

  const handleAcceptReframe = () => {
    // User accepts their reframe despite suggestions
    setReframeFeedback(null);
    setStep('compare');
    setReframedCount(prev => prev + 1);
  };

  const handleReviseReframe = () => {
    // User wants to revise
    setReframeFeedback(null);
  };

  const handleNext = async () => {
    // Share the reframe to community (for custom thoughts)
    if (isUsingCustom && customThought && userReframe) {
      try {
        await api.post('/api/thoughts/share', {
          text: customThought,
          category: 'negative',
          distortionType: selectedDistortion,
          exampleReframe: userReframe,
        });
      } catch (error) {
        // Non-critical, ignore
      }
    }
    
    if (currentIndex < thoughts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetForNextThought();
    } else {
      finishGame();
    }
  };

  const handleUseCustomThought = () => {
    if (customThought.trim()) {
      setIsUsingCustom(true);
      setStep('identify');
    }
  };

  const resetForNextThought = () => {
    setStep('identify');
    setSelectedDistortion(null);
    setUserReframe('');
    setShowHint(false);
    setIsUsingCustom(false);
    setCustomThought('');
    setDistortionFeedback(null);
    setReframeFeedback(null);
  };

  const finishGame = () => {
    setGameComplete(true);
    const credits = reframedCount * POINTS_PER_REFRAME;
    setTimeout(() => onComplete(credits, 1), 2500);
  };

  // Educational Onboarding with Examples
  if (showOnboarding) {
    const currentIntro = INTRO_EXAMPLES[introStep];
    const isLastStep = introStep === INTRO_EXAMPLES.length - 1;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-100 to-purple-100 p-4">
        <motion.div
          key={introStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {INTRO_EXAMPLES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === introStep ? 'bg-indigo-600' : i < introStep ? 'bg-indigo-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          {/* Icon */}
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          
          {/* Title & Description */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">{currentIntro.title}</h2>
          <p className="text-gray-600 mb-6 text-center text-sm leading-relaxed">{currentIntro.description}</p>
          
          {/* Example Card (for steps with examples) */}
          {currentIntro.example && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-6 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-1 bg-indigo-200 text-indigo-800 text-xs font-medium rounded-full">
                  {currentIntro.example.distortion}
                </span>
              </div>
              
              {/* Original Thought */}
              <div className="bg-red-50 rounded-xl p-3 mb-3 border border-red-100">
                <p className="text-xs text-red-600 font-medium mb-1">Distorted Thought:</p>
                <p className="text-gray-800 text-sm italic">{currentIntro.example.thought}</p>
              </div>
              
              {/* Arrow */}
              <div className="flex justify-center my-2">
                <ArrowRight className="w-5 h-5 text-indigo-400" />
              </div>
              
              {/* Reframe */}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium mb-1">Balanced Reframe:</p>
                <p className="text-gray-800 text-sm italic">{currentIntro.example.reframe}</p>
              </div>
              
              {/* Why */}
              <div className="mt-3 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">{currentIntro.example.why}</p>
              </div>
            </div>
          )}
          
          {/* Steps list (for last step) */}
          {currentIntro.steps && (
            <div className="bg-indigo-50 rounded-2xl p-5 mb-6">
              <ul className="space-y-3">
                {currentIntro.steps.map((step) => (
                  <li key={step.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs">
                      {step.num}
                    </div>
                    <p className="text-gray-700 text-sm">{step.text}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-indigo-200 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-indigo-700 font-medium">+{POINTS_PER_REFRAME} Serenity per reframe</span>
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <div className="flex gap-3">
            {introStep > 0 && (
              <button
                onClick={() => setIntroStep(prev => prev - 1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  setShowOnboarding(false);
                  setShowLevelSelect(true);
                } else {
                  setIntroStep(prev => prev + 1);
                }
              }}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg"
            >
              {isLastStep ? 'Choose Difficulty' : 'Next'}
            </button>
          </div>
          
          {isLastStep && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              4 difficulty levels: Beginner to Expert
            </p>
          )}
          
          {/* Skip option */}
          {!isLastStep && (
            <button
              onClick={() => setShowOnboarding(false)}
              className="w-full mt-3 text-gray-400 hover:text-gray-600 text-sm"
            >
              Skip intro
            </button>
          )}
          
          {onExit && (
            <button
              onClick={onExit}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Games
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Level Select
  if (showLevelSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-100 to-purple-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Difficulty</h2>
          <p className="text-gray-600 mb-6 text-sm">Higher levels = more complex thoughts</p>
          
          <div className="space-y-3 mb-6">
            {DIFFICULTY_LEVELS.map((level, index) => (
              <button
                key={level.id}
                onClick={() => {
                  setSelectedDifficulty(index);
                  initializeThoughts();
                  setShowLevelSelect(false);
                }}
                className="w-full p-4 rounded-xl text-left transition-all border-2 bg-indigo-50 border-indigo-200 hover:border-indigo-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{level.name}</h3>
                    <p className="text-sm text-gray-500">{level.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-indigo-600">{level.thoughtCount}</span>
                    <p className="text-xs text-gray-400">thoughts</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              setShowLevelSelect(false);
              setShowOnboarding(true);
              setIntroStep(INTRO_EXAMPLES.length - 1);
            }}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Back
          </button>
        </motion.div>
      </div>
    );
  }

  // Game Complete
  if (gameComplete) {
    const credits = reframedCount * POINTS_PER_REFRAME;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-100 to-purple-100 p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            🧠✨
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mind Shifted!</h2>
          <p className="text-gray-600 mb-4">
            You reframed {reframedCount} thought{reframedCount !== 1 ? 's' : ''}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-indigo-600 mb-6">
            <Sparkles className="w-6 h-6" />
            <span>+{credits} Serenity</span>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              <strong>Remember:</strong> Thoughts are not facts. With practice, you can train your mind to see situations more clearly and compassionately.
            </p>
          </div>
          
          <p className="text-gray-500 text-sm">Returning to Games Hub...</p>
        </motion.div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Thought Reframing Lab</h2>
            <p className="text-gray-600 text-sm">Challenge and reframe your thoughts</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
              {currentIndex + 1} / {thoughts.length}
            </div>
            {onExit && (
              <button 
                onClick={onExit} 
                className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex gap-1">
          {['identify', 'reframe', 'compare'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                i < ['identify', 'reframe', 'compare'].indexOf(step) + 1
                  ? 'bg-indigo-500'
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-600">
          <span>Identify</span>
          <span>Reframe</span>
          <span>Compare</span>
        </div>
      </div>

      {/* Custom Thought Input (only on identify step) */}
      {step === 'identify' && !isUsingCustom && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="bg-white/80 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-2">Or add your own thought to reframe:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customThought}
                onChange={(e) => setCustomThought(e.target.value)}
                placeholder="Type a thought that's bothering you..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-800 text-sm"
              />
              <button
                onClick={handleUseCustomThought}
                disabled={!customThought.trim()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                Use This
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Identify Distortion */}
          {step === 'identify' && (
            <motion.div
              key="identify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* The Thought */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm font-medium text-indigo-600">The Thought</span>
                  {isUsingCustom && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">Your thought</span>
                  )}
                </div>
                <p className="text-xl text-gray-800 font-medium leading-relaxed">
                  "{currentThought.thought}"
                </p>
              </div>

              {/* Distortion Feedback */}
              <AnimatePresence>
                {distortionFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-800 mb-2">Learning Moment</h4>
                        <p className="text-amber-700 text-sm mb-4">{distortionFeedback}</p>
                        <button
                          onClick={handleAcceptCorrection}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                        >
                          Got It, Continue
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Select Distortion */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4">What type of thinking pattern is this?</h3>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(Object.keys(DISTORTION_INFO) as DistortionType[]).map((distortion) => (
                    <button
                      key={distortion}
                      onClick={() => handleDistortionSelect(distortion)}
                      className={`p-3 rounded-xl text-left text-sm border-2 transition-all ${
                        selectedDistortion === distortion
                          ? DISTORTION_INFO[distortion].color + ' border-current'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium">{DISTORTION_INFO[distortion].name}</span>
                    </button>
                  ))}
                </div>

                {selectedDistortion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl mb-4 ${DISTORTION_INFO[selectedDistortion].color}`}
                  >
                    <p className="text-sm">{DISTORTION_INFO[selectedDistortion].description}</p>
                  </motion.div>
                )}

                {!isUsingCustom && !showHint && currentThought.hint && !distortionFeedback && (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-sm text-indigo-500 hover:text-indigo-700 mb-4"
                  >
                    Need a hint?
                  </button>
                )}

                {showHint && !isUsingCustom && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-amber-50 rounded-xl mb-4 border border-amber-200"
                  >
                    <p className="text-sm text-amber-700">
                      <Lightbulb className="w-4 h-4 inline mr-1" />
                      {currentThought.hint}
                    </p>
                  </motion.div>
                )}

                <button
                  onClick={handleSubmitIdentification}
                  disabled={!selectedDistortion || !!distortionFeedback}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue to Reframe
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Write Reframe */}
          {step === 'reframe' && (
            <motion.div
              key="reframe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Original Thought */}
              <div className="bg-red-50 rounded-2xl p-5 mb-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-red-600 uppercase">Original Thought</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DISTORTION_INFO[selectedDistortion!].color}`}>
                    {DISTORTION_INFO[selectedDistortion!].name}
                  </span>
                </div>
                <p className="text-gray-800">"{currentThought.thought}"</p>
              </div>

              {/* Reframe Feedback */}
              <AnimatePresence>
                {reframeFeedback && !reframeFeedback.isGood && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-800 mb-2">{reframeFeedback.message}</h4>
                        <ul className="text-amber-700 text-sm mb-4 space-y-1">
                          {reframeFeedback.tips.map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                        <div className="flex gap-3">
                          <button
                            onClick={handleReviseReframe}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                          >
                            Revise My Reframe
                          </button>
                          <button
                            onClick={handleAcceptReframe}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Keep As Is
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reframe Input */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">Your Balanced Reframe</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Write a more balanced, realistic way to think about this situation:
                </p>

                <textarea
                  value={userReframe}
                  onChange={(e) => setUserReframe(e.target.value)}
                  placeholder="Try to find a more balanced perspective..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-gray-800 resize-none mb-4"
                />

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{userReframe.length} characters</span>
                  {userReframe.length < 10 && (
                    <span className="text-amber-500">Write at least 10 characters</span>
                  )}
                </div>

                <button
                  onClick={handleSubmitReframe}
                  disabled={userReframe.trim().length < 10}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Check My Reframe
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Compare */}
          {step === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-bold text-emerald-600">Great reframe!</span>
                  <span className="text-indigo-600 font-bold">+{POINTS_PER_REFRAME} Serenity</span>
                </div>

                {/* Reframe quality feedback */}
                {reframeFeedback?.isGood && reframeFeedback.tips.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <ThumbsUp className="w-4 h-4 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-emerald-700 font-medium">{reframeFeedback.message}</p>
                        {reframeFeedback.tips.length > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">Tip for next time: {reframeFeedback.tips[0]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Side by Side */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Before */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <span className="text-xs font-medium text-red-600 uppercase mb-2 block">Before</span>
                    <p className="text-gray-800 text-sm">"{currentThought.thought}"</p>
                  </div>

                  {/* After */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <span className="text-xs font-medium text-emerald-600 uppercase mb-2 block">Your Reframe</span>
                    <p className="text-gray-800 text-sm">"{userReframe}"</p>
                  </div>
                </div>

                {/* Example (for non-custom thoughts) */}
                {!isUsingCustom && currentThought.exampleReframe && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 mb-6">
                    <span className="text-xs font-medium text-indigo-600 uppercase mb-2 block">Example Reframe</span>
                    <p className="text-gray-700 text-sm italic">"{currentThought.exampleReframe}"</p>
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  {currentIndex < thoughts.length - 1 ? (
                    <>
                      Next Thought
                      <ArrowRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Finish
                      <Sparkles className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
