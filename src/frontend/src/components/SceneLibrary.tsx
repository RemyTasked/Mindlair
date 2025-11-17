import { useState, useEffect } from 'react';
import { Headphones, Heart, BookOpen, Sparkles, Play, X } from 'lucide-react';

interface SceneLibraryProps {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  onSoundTypeChange: (soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'lofi-chill' | 'lofi-focus' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'none') => void;
}

export default function SceneLibrary({ timeOfDay, onSoundTypeChange }: SceneLibraryProps) {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'lofi'>('scenes');

  // Change sound type based on active scene
  useEffect(() => {
    // Stop any previous sound first
    if (!activeScene) {
      onSoundTypeChange('none');
      localStorage.removeItem('meetcute_autoplay_sound');
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'scene-library' }
      }));
      return;
    }

    let soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'lofi-chill' | 'lofi-focus' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'none' = 'none';

    if (activeScene === 'listen') {
      soundType = 'calm-ocean';
    } else if (activeScene === 'focus') {
      soundType = 'white-noise';
    } else if (activeScene === 'reflect') {
      soundType = 'rain';
    } else if (activeScene === 'lofi-chill') {
      soundType = 'lofi-chill';
    } else if (activeScene === 'lofi-focus') {
      soundType = 'lofi-focus';
    } else if (activeScene === 'lofi-morning') {
      soundType = 'lofi-morning';
    } else if (activeScene === 'lofi-evening') {
      soundType = 'lofi-evening';
    } else if (activeScene === 'lofi-calm') {
      soundType = 'lofi-calm';
    }

    onSoundTypeChange(soundType);

    localStorage.setItem('meetcute_autoplay_sound', 'true');
    window.dispatchEvent(new CustomEvent('ambient-sound-play', {
      detail: { source: 'scene-library', sceneId: activeScene, soundType }
    }));
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
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Click the sound button in the bottom right to hear calming ocean waves
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-2xl">🌊</span>
                <span className="text-sm font-medium text-blue-900">Ocean sounds will play →</span>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600">
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
      description: 'White noise + breathing to enhance concentration',
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
      description: 'Gentle rain sounds + AI prompt for contemplation',
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

  // Lofi Soundscapes
  const lofiScenes = [
    {
      id: 'lofi-chill',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '🎵',
      title: 'Lofi Chill',
      subtitle: 'Mellow beats',
      description: 'Warm chords, soft drums, vinyl crackle',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lofi Chill</h3>
            <p className="text-gray-600 mb-6">
              Mellow chord progressions with soft beats and warm vinyl texture
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🎹</span>
                <span>Warm jazz chords for relaxation</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🥁</span>
                <span>Gentle beats to keep you grounded</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">📀</span>
                <span>Vinyl crackle for authentic lofi feel</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'lofi-focus',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '🎧',
      title: 'Lofi Focus',
      subtitle: 'Minimal beats',
      description: 'Perfect for deep work and concentration',
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-50 to-indigo-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎧</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lofi Focus</h3>
            <p className="text-gray-600 mb-6">
              Minimal beats and subtle melodies designed for concentration
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🎼</span>
                <span>Simple pentatonic melodies</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🎯</span>
                <span>Minimal percussion for focus</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🌊</span>
                <span>Warm bass to anchor your attention</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'lofi-morning',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '☀️',
      title: 'Lofi Morning',
      subtitle: 'Bright & uplifting',
      description: 'Gentle energy to start your day',
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-50 to-orange-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">☀️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lofi Morning</h3>
            <p className="text-gray-600 mb-6">
              Bright major chords and light percussion for a positive start
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🌅</span>
                <span>Uplifting major chord progressions</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">✨</span>
                <span>Light hi-hats for gentle energy</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">☕</span>
                <span>Perfect companion for morning routines</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'lofi-evening',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '🌙',
      title: 'Lofi Evening',
      subtitle: 'Mellow & introspective',
      description: 'Wind down with soft minor chords',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🌙</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lofi Evening</h3>
            <p className="text-gray-600 mb-6">
              Mellow minor chords and deep bass for winding down
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🌆</span>
                <span>Soft minor chord progressions</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🎵</span>
                <span>Slower tempo for relaxation</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🛋️</span>
                <span>Perfect for end-of-day reflection</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'lofi-calm',
      icon: <Sparkles className="w-6 h-6" />,
      emoji: '🕊️',
      title: 'Lofi Calm',
      subtitle: 'Ultra-minimal',
      description: 'Ambient pads for deep relaxation',
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-50 to-cyan-50',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🕊️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Lofi Calm</h3>
            <p className="text-gray-600 mb-6">
              Ultra-minimal ambient soundscape for deep peace
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start gap-2">
                <span className="text-lg">🌌</span>
                <span>Sustained pad-like chords</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">🧘</span>
                <span>No percussion - pure atmosphere</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-lg">💫</span>
                <span>Ideal for meditation and deep rest</span>
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Combine all scenes for lookup
  const allScenes = [...originalScenes, ...lofiScenes];
  const currentScenes = activeTab === 'scenes' ? originalScenes : lofiScenes;

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
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-purple-200">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Scene Library</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Your Moment of Calm
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          No meetings right now? Perfect. Take a moment for yourself.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-purple-200">
        <button
          onClick={() => {
            setActiveTab('scenes');
            setActiveScene(null); // Close any open scene when switching tabs
          }}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'scenes'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Scenes
        </button>
        <button
          onClick={() => {
            setActiveTab('lofi');
            setActiveScene(null); // Close any open scene when switching tabs
          }}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'lofi'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Lofi Soundscapes
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {currentScenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => {
              // Stop previous sound before starting new one
              if (activeScene && activeScene !== scene.id) {
                setActiveScene(null);
                setTimeout(() => setActiveScene(scene.id), 100);
              } else {
                setActiveScene(scene.id);
              }
            }}
            className={`group relative bg-gradient-to-br ${scene.bgGradient} rounded-xl p-4 sm:p-5 border-2 border-transparent hover:border-purple-300 transition-all hover:shadow-xl hover:scale-105 text-left`}
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`p-1.5 rounded-full bg-gradient-to-r ${scene.gradient} text-white shadow-lg`}>
                <Play className="w-3 h-3" />
              </div>
            </div>

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

