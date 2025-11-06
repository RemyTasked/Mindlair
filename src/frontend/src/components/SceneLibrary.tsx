import { useState } from 'react';
import { Headphones, Heart, BookOpen, Sparkles, Play, X } from 'lucide-react';
import AmbientSound from './AmbientSound';

interface SceneLibraryProps {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export default function SceneLibrary({ timeOfDay }: SceneLibraryProps) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Time-of-day aware content
  const journalingPrompts = {
    morning: [
      "What's one intention you want to set for today?",
      "How do you want to show up in your meetings today?",
      "What would make today feel successful?",
    ],
    afternoon: [
      "What's one win from this morning?",
      "How are you feeling about the rest of your day?",
      "What do you need to recharge right now?",
    ],
    evening: [
      "What went well today?",
      "What did you learn from today's interactions?",
      "How do you want to unwind tonight?",
    ],
  };

  const currentPrompt = journalingPrompts[timeOfDay][Math.floor(Math.random() * journalingPrompts[timeOfDay].length)];

  const scenes = [
    {
      id: 'listen',
      icon: <Headphones className="w-6 h-6" />,
      emoji: '🎧',
      title: 'Listen',
      subtitle: '30-second reset',
      description: 'Calming soundscape to center yourself',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎧</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Calm Reset</h3>
            <p className="text-gray-600 mb-6">
              Close your eyes. Breathe deeply. Let the sounds wash over you.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <AmbientSound 
              enabled={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
              autoStart={false}
            />
            
            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🌊</span>
                <span>Let tension melt away with each breath</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">💭</span>
                <span>Notice thoughts without judgment</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">✨</span>
                <span>Return feeling refreshed and centered</span>
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            Take as long as you need • No rush
          </div>
        </div>
      ),
    },
    {
      id: 'focus',
      icon: <Heart className="w-6 h-6" />,
      emoji: '🧘',
      title: 'Focus',
      subtitle: '2-minute calm scene',
      description: 'Guided breathing to reset your mind',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🧘</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Breathing Reset</h3>
            <p className="text-gray-600 mb-6">
              A simple practice to return to calm
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <BreathingExercise />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl mb-2">🌬️</div>
              <div className="font-medium text-gray-900">Breathe</div>
              <div className="text-xs text-gray-500">4 seconds in</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl mb-2">⏸️</div>
              <div className="font-medium text-gray-900">Hold</div>
              <div className="text-xs text-gray-500">4 seconds</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl mb-2">💨</div>
              <div className="font-medium text-gray-900">Release</div>
              <div className="text-xs text-gray-500">6 seconds out</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'reflect',
      icon: <BookOpen className="w-6 h-6" />,
      emoji: '🪞',
      title: 'Reflect',
      subtitle: 'Quick journaling',
      description: 'A moment to check in with yourself',
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🪞</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Reflection Moment</h3>
            <p className="text-gray-600 mb-6">
              Take a moment to check in with yourself
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Today's Prompt:
              </label>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <p className="text-lg text-gray-900 font-medium italic">
                  "{currentPrompt}"
                </p>
              </div>
            </div>

            <textarea
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="Write your thoughts here... no one will see this but you."
            />

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>✍️ Private & never saved</span>
              <span>Take your time</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <p className="text-sm text-gray-700 text-center">
              💡 <span className="font-medium">Tip:</span> There are no wrong answers. This is your space.
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (activeScene) {
    const scene = scenes.find(s => s.id === activeScene);
    if (!scene) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${scene.gradient} text-white`}>
                {scene.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{scene.title}</h2>
                <p className="text-sm text-gray-600">{scene.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveScene(null);
                setSoundEnabled(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-6">
            {scene.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-lg p-8 border-2 border-purple-200">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Scene Library</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Your Moment of Calm
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          No meetings right now? Perfect. Take a moment for yourself with these micro-rituals.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setActiveScene(scene.id)}
            className={`group relative bg-gradient-to-br ${scene.bgGradient} rounded-xl p-6 border-2 border-transparent hover:border-purple-300 transition-all hover:shadow-xl hover:scale-105 text-left`}
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`p-2 rounded-full bg-gradient-to-r ${scene.gradient} text-white shadow-lg`}>
                <Play className="w-4 h-4" />
              </div>
            </div>

            <div className="text-5xl mb-4">{scene.emoji}</div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {scene.title}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-2">
              {scene.subtitle}
            </p>
            <p className="text-sm text-gray-600">
              {scene.description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-500">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${scene.gradient}`}></div>
              <span>Start anytime</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BreathingExercise() {
  const [phase, setPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale'>('ready');
  const [isActive, setIsActive] = useState(false);

  const startExercise = () => {
    setIsActive(true);
    runCycle();
  };

  const runCycle = () => {
    // Inhale (4s)
    setPhase('inhale');
    setTimeout(() => {
      // Hold (4s)
      setPhase('hold');
      setTimeout(() => {
        // Exhale (6s)
        setPhase('exhale');
        setTimeout(() => {
          // Ready for next cycle
          setPhase('ready');
          setIsActive(false);
        }, 6000);
      }, 4000);
    }, 4000);
  };

  const phaseConfig = {
    ready: { text: 'Ready to begin?', emoji: '✨', color: 'text-gray-600', scale: 'scale-100' },
    inhale: { text: 'Breathe in...', emoji: '🌬️', color: 'text-blue-600', scale: 'scale-110' },
    hold: { text: 'Hold...', emoji: '⏸️', color: 'text-purple-600', scale: 'scale-110' },
    exhale: { text: 'Breathe out...', emoji: '💨', color: 'text-green-600', scale: 'scale-90' },
  };

  const config = phaseConfig[phase];

  return (
    <div className="text-center space-y-6">
      <div className={`text-7xl transition-transform duration-1000 ${config.scale}`}>
        {config.emoji}
      </div>
      
      <div className={`text-2xl font-bold transition-colors ${config.color}`}>
        {config.text}
      </div>

      {!isActive && phase === 'ready' && (
        <button
          onClick={startExercise}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
        >
          Start Breathing Exercise
        </button>
      )}

      {isActive && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}

      {!isActive && phase !== 'ready' && (
        <button
          onClick={startExercise}
          className="px-6 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-all"
        >
          Continue Another Cycle
        </button>
      )}
    </div>
  );
}

