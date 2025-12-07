import { useState, useEffect } from 'react';
import { Headphones, Heart, BookOpen, Sparkles, Play, X } from 'lucide-react';

interface SceneLibraryProps {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  onSoundTypeChange: (soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none') => void;
}

export default function SceneLibrary({ timeOfDay, onSoundTypeChange }: SceneLibraryProps) {
  const [activeScene, setActiveScene] = useState<string | null>(null);

  // Change sound type based on active scene
  useEffect(() => {
    // Always stop any previous sound first (ambient or lofi)
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'scene-library' }
    }));
    
    // Stop any previous sound first
    if (!activeScene) {
      onSoundTypeChange('none');
      localStorage.removeItem('meetcute_autoplay_sound');
      return;
    }

    let soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none' = 'none';

    if (activeScene === 'listen') {
      soundType = 'calm-ocean';
    } else if (activeScene === 'focus') {
      soundType = 'white-noise';
    } else if (activeScene === 'reflect') {
      soundType = 'rain';
    }

    // Longer delay to ensure previous sound fully stops before starting new one
    // This prevents ambient and lofi sounds from playing simultaneously
    setTimeout(() => {
      onSoundTypeChange(soundType);
      localStorage.setItem('meetcute_autoplay_sound', 'true');
      console.log('🎵 SceneLibrary dispatching ambient-sound-play event:', { sceneId: activeScene, soundType });
      window.dispatchEvent(new CustomEvent('ambient-sound-play', {
        detail: { source: 'scene-library', sceneId: activeScene, soundType }
      }));
    }, 300);
  }, [activeScene, onSoundTypeChange]);

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

  // Original scenes (Listen, Focus, Reflect)
  const originalScenes = [
    {
      id: 'listen',
      icon: <Headphones className="w-6 h-6" />,
      emoji: '🎧',
      title: 'Listen',
      subtitle: '30-second reset',
      description: 'Calming ocean waves to center yourself',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🌊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ocean Calm</h3>
            <p className="text-gray-600 mb-6">
              Close your eyes. Breathe deeply. Let the gentle waves wash over you.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <BreathingExercise />
          </div>
        </div>
      ),
    },
    {
      id: 'focus',
      icon: <BookOpen className="w-6 h-6" />,
      emoji: '🎯',
      title: 'Focus',
      subtitle: 'Deep work mode',
      description: 'White noise to block distractions',
      gradient: 'from-teal-500 to-emerald-500',
      bgGradient: 'from-teal-50 to-emerald-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Deep Focus</h3>
            <p className="text-gray-600 mb-6">
              White noise creates a consistent sound barrier, helping you enter flow state.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Focus Tips</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span>✓</span>
                  <span>Set a clear intention for this focus session</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span>
                  <span>Eliminate visual distractions (close extra tabs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✓</span>
                  <span>Use the Pomodoro technique: 25 min focus, 5 min break</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'reflect',
      icon: <Heart className="w-6 h-6" />,
      emoji: '💭',
      title: 'Reflect',
      subtitle: 'Gentle journaling',
      description: 'Rain sounds for introspection',
      gradient: 'from-teal-500 to-green-500',
      bgGradient: 'from-teal-50 to-green-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🌧️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Rain Reflection</h3>
            <p className="text-gray-600 mb-6">
              The gentle sound of rain creates space for honest reflection.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Journaling Prompt</h4>
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

  // Only original ambient scenes (no lofi - those are in Focus Rooms)
  const allScenes = originalScenes;

  if (activeScene) {
    const scene = allScenes.find(s => s.id === activeScene);
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
              onClick={() => setActiveScene(null)}
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
    <div className="bg-gradient-to-br from-teal-50 via-teal-50 to-pink-50 rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-teal-200">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-medium text-gray-700">Scene Library</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Your Moment of Calm
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          No meetings right now? Perfect. Take a moment for yourself.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {allScenes.map((scene) => (
          <div
            key={scene.id}
            className={`group relative bg-gradient-to-br ${scene.bgGradient} rounded-xl p-4 sm:p-5 border-2 border-transparent hover:border-teal-300 transition-all hover:shadow-xl hover:scale-105`}
          >
            {/* Play Button - Always visible */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Immediately play the sound
                if (activeScene === scene.id) {
                  // If already active, toggle off
                  setActiveScene(null);
                } else {
                  setActiveScene(scene.id);
                }
              }}
              className={`absolute top-3 right-3 p-2 rounded-full bg-gradient-to-r ${scene.gradient} text-white shadow-lg hover:scale-110 transition-all z-10`}
              title={activeScene === scene.id ? 'Stop sound' : 'Play sound'}
            >
              {activeScene === scene.id ? (
                <X className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            {/* Card Content - Clickable to open modal */}
            <button
              onClick={() => {
                // Open modal for more details
                if (activeScene && activeScene !== scene.id) {
                  setActiveScene(null);
                  setTimeout(() => setActiveScene(scene.id), 100);
                } else {
                  setActiveScene(scene.id);
                }
              }}
              className="w-full text-left"
            >
              <div className="text-4xl sm:text-5xl mb-3">{scene.emoji}</div>
              
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                {scene.title}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">
                {scene.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                {scene.description}
              </p>
            </button>
          </div>
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
    hold: { text: 'Hold...', emoji: '⏸️', color: 'text-teal-600', scale: 'scale-110' },
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
          className="px-6 py-3 bg-gradient-to-r from-teal-600 to-pink-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
        >
          Start Breathing Exercise
        </button>
      )}

      {isActive && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}

      {!isActive && phase !== 'ready' && (
        <button
          onClick={startExercise}
          className="px-6 py-3 bg-white border-2 border-teal-300 text-teal-700 rounded-lg font-semibold hover:bg-teal-50 transition-all"
        >
          Continue Another Cycle
        </button>
      )}
    </div>
  );
}
