import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flower2, Cloud, TreePine, Mountain, Sparkles } from 'lucide-react';
import api from '../lib/axios';

interface GardenPlant {
  id: string;
  type: 'grass' | 'tree' | 'flower' | 'cloud' | 'thorn' | 'rock';
  emotion: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: Date;
}

interface GardenWeather {
  type: 'calm' | 'stormy' | 'sunny' | 'windy';
  intensity: number;
}

interface GardenState {
  plants: GardenPlant[];
  weather: GardenWeather;
  lastUpdated: Date;
}

interface EmotionGardenProps {
  userId?: string;
}

export default function EmotionGarden(_props: EmotionGardenProps) {
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState(5);

  useEffect(() => {
    loadGardenState();
  }, []);

  const loadGardenState = async () => {
    try {
      const response = await api.get('/api/emotion-garden/state');
      setGardenState(response.data.state);
    } catch (error) {
      console.error('Error loading garden state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedEmotion) return;

    try {
      const response = await api.post('/api/emotion-garden/checkin', {
        emotion: selectedEmotion,
        intensity,
      });
      setGardenState(response.data.state);
      setShowCheckIn(false);
      setSelectedEmotion('');
    } catch (error) {
      console.error('Error recording check-in:', error);
    }
  };

  const getPlantIcon = (type: string) => {
    switch (type) {
      case 'flower':
        return <Flower2 className="w-6 h-6" />;
      case 'cloud':
        return <Cloud className="w-6 h-6" />;
      case 'tree':
        return <TreePine className="w-6 h-6" />;
      case 'rock':
        return <Mountain className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  const getWeatherClass = (weather: GardenWeather) => {
    switch (weather.type) {
      case 'stormy':
        return 'bg-gray-800';
      case 'sunny':
        return 'bg-yellow-50';
      case 'windy':
        return 'bg-blue-100';
      default:
        return 'bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Growing your garden...</p>
        </div>
      </div>
    );
  }

  if (!gardenState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="text-center">
          <Flower2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Garden</h2>
          <p className="text-gray-600 mb-6">Your emotional world, rendered as a living scene</p>
          <button
            onClick={() => setShowCheckIn(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all"
          >
            Plant Your First Seed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${getWeatherClass(gardenState.weather)} transition-colors duration-1000`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Flower2 className="w-8 h-8 text-green-600" />
              Emotion Garden
            </h1>
            <p className="text-gray-700">Your inner world, rendered as a living scene</p>
          </div>
          <button
            onClick={() => setShowCheckIn(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all"
          >
            + Check In
          </button>
        </div>

        {/* Garden Canvas */}
        <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl p-8 min-h-[500px] border-2 border-white/80 shadow-xl">
          {/* Weather Overlay */}
          {gardenState.weather.type === 'stormy' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gray-900/20 animate-pulse" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-slide-down" />
            </div>
          )}

          {/* Plants */}
          {gardenState.plants.map((plant) => (
            <motion.div
              key={plant.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: plant.opacity,
                scale: plant.size,
                x: `${plant.x}%`,
                y: `${plant.y}%`,
              }}
              className="absolute"
              style={{
                left: `${plant.x}%`,
                top: `${plant.y}%`,
              }}
            >
              <div className={`text-${plant.type === 'flower' ? 'pink' : plant.type === 'cloud' ? 'gray' : 'green'}-600`}>
                {getPlantIcon(plant.type)}
              </div>
            </motion.div>
          ))}

          {gardenState.plants.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Flower2 className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500">Your garden is empty. Check in with an emotion to plant your first seed.</p>
              </div>
            </div>
          )}
        </div>

        {/* Check-In Modal */}
        {showCheckIn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">How do you feel?</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emotion</label>
                  <select
                    value={selectedEmotion}
                    onChange={(e) => setSelectedEmotion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select an emotion...</option>
                    <option value="calm">Calm</option>
                    <option value="joy">Joy</option>
                    <option value="gratitude">Gratitude</option>
                    <option value="anxiety">Anxiety</option>
                    <option value="overwhelm">Overwhelm</option>
                    <option value="anger">Anger</option>
                    <option value="frustration">Frustration</option>
                    <option value="stress">Stress</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intensity: {intensity}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckIn(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={!selectedEmotion}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50"
                >
                  Plant Seed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

