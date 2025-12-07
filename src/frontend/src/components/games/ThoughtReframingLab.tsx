/**
 * Mind Garden - Thought Reframing Lab
 * 
 * CBT-based Cognitive Restructuring Tool
 * Identify cognitive distortions and practice reframing negative thoughts.
 * +5 Serenity per reframe
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Brain, Lightbulb, ArrowRight, 
  Sparkles, RefreshCw, CheckCircle2
} from 'lucide-react';

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

const DISTORTION_INFO: Record<DistortionType, { name: string; description: string; color: string }> = {
  'all-or-nothing': {
    name: 'All-or-Nothing Thinking',
    description: 'Seeing things in black and white with no middle ground',
    color: 'bg-red-100 text-red-700 border-red-300',
  },
  'catastrophizing': {
    name: 'Catastrophizing',
    description: 'Expecting the worst possible outcome',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  'mind-reading': {
    name: 'Mind Reading',
    description: 'Assuming you know what others think without evidence',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  'fortune-telling': {
    name: 'Fortune Telling',
    description: 'Predicting negative outcomes as if they\'re certain',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  'should-statements': {
    name: 'Should Statements',
    description: 'Rigid rules about how things must be',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  'labeling': {
    name: 'Labeling',
    description: 'Attaching a negative label to yourself or others',
    color: 'bg-pink-100 text-pink-700 border-pink-300',
  },
  'overgeneralization': {
    name: 'Overgeneralization',
    description: 'Drawing broad conclusions from single events',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  'emotional-reasoning': {
    name: 'Emotional Reasoning',
    description: 'Assuming feelings reflect reality',
    color: 'bg-teal-100 text-teal-700 border-teal-300',
  },
};

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

export default function ThoughtReframingLab({ onComplete, onExit }: ThoughtReframingLabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<'identify' | 'reframe' | 'compare'>('identify');
  const [selectedDistortion, setSelectedDistortion] = useState<DistortionType | null>(null);
  const [userReframe, setUserReframe] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [reframedCount, setReframedCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [customThought, setCustomThought] = useState('');
  const [isUsingCustom, setIsUsingCustom] = useState(false);

  // Select random thoughts for session
  const [thoughts] = useState(() => {
    const shuffled = [...DISTORTED_THOUGHTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });

  const currentThought = isUsingCustom 
    ? { id: 'custom', thought: customThought, distortionType: selectedDistortion || 'all-or-nothing', hint: '', exampleReframe: '' }
    : thoughts[currentIndex];

  const handleDistortionSelect = (distortion: DistortionType) => {
    setSelectedDistortion(distortion);
  };

  const handleSubmitIdentification = () => {
    if (selectedDistortion) {
      setStep('reframe');
    }
  };

  const handleSubmitReframe = () => {
    if (userReframe.trim().length >= 10) {
      setStep('compare');
      setReframedCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
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
  };

  const finishGame = () => {
    setGameComplete(true);
    const credits = reframedCount * POINTS_PER_REFRAME;
    setTimeout(() => onComplete(credits, 1), 2500);
  };

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-100 to-purple-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Thought Reframing Lab</h2>
          <p className="text-gray-600 mb-6">
            CBT-based Cognitive Restructuring
          </p>
          
          <div className="bg-indigo-50 rounded-2xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">How It Works:</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs">1</div>
                <div>
                  <span className="font-medium text-indigo-700">Identify</span>
                  <p className="text-xs text-gray-500">Spot the cognitive distortion pattern</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs">2</div>
                <div>
                  <span className="font-medium text-indigo-700">Reframe</span>
                  <p className="text-xs text-gray-500">Write a more balanced perspective</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs">3</div>
                <div>
                  <span className="font-medium text-indigo-700">Compare</span>
                  <p className="text-xs text-gray-500">See before and after side by side</p>
                </div>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-indigo-100">
              <span className="text-indigo-600 font-medium">+{POINTS_PER_REFRAME}</span>
              <span className="text-gray-500 text-sm"> Serenity per reframe</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowOnboarding(false)}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Start Reframing
          </button>
          
          {onExit && (
            <button
              onClick={onExit}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Games
            </button>
          )}
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

                {!isUsingCustom && !showHint && currentThought.hint && (
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
                  disabled={!selectedDistortion}
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
                  See Comparison
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

