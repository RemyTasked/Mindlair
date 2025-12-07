import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flower2, Cloud, TreePine, Mountain, Sparkles, X, Sun, Wind, Leaf, Bug, Bird } from 'lucide-react';
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
  onExit?: () => void;
}

export default function EmotionGarden({ onExit }: EmotionGardenProps) {
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState(5);
  const [newPlants, setNewPlants] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Performance optimization: detect mobile for reduced animations
  const [isMobile] = useState(() => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  const loadGardenState = async () => {
    try {
      // Optimize: Use Promise.race with timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Garden load timeout')), 5000)
      );
      
      const response = await Promise.race([
        api.get('/api/emotion-garden/state'),
        timeoutPromise
      ]) as any;
      
      const newState = response.data.state;
      
      // Track which plants are new
      if (gardenState) {
        const existingIds = new Set(gardenState.plants.map(p => p.id));
        const newlyAdded = newState.plants
          .filter((p: GardenPlant) => !existingIds.has(p.id))
          .map((p: GardenPlant) => p.id);
        
        if (newlyAdded.length > 0) {
          setNewPlants(new Set(newlyAdded));
          // Remove from new plants after animation completes
          setTimeout(() => {
            setNewPlants(new Set());
          }, 5000);
        }
      }
      
      setGardenState(newState);
    } catch (error) {
      console.error('Error loading garden state:', error);
      // Set a default state if loading fails to prevent hanging
      if (!gardenState) {
        setGardenState({
          plants: [],
          weather: { type: 'calm', intensity: 5 },
          lastUpdated: new Date()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGardenState();
    
    // Poll for garden updates every 5 seconds
    const interval = setInterval(() => {
      loadGardenState();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Draw ground/grass layer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gardenState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Draw grass/ground texture
    const drawGround = () => {
      ctx.fillStyle = '#7cb342';
      ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
      
      // Draw grass blades
      ctx.strokeStyle = '#558b2f';
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width; i += 10) {
        const height = 20 + Math.random() * 30;
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 100);
        ctx.quadraticCurveTo(i + 5, canvas.height - 100 - height, i + 10, canvas.height - 100);
        ctx.stroke();
      }
    };

    drawGround();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gardenState]);

  const handleCheckIn = async () => {
    if (!selectedEmotion) return;

    try {
      await api.post('/api/emotion-garden/checkin', {
        emotion: selectedEmotion,
        intensity,
      });
      
      setShowCheckIn(false);
      setSelectedEmotion('');
      
      // Reload garden state with animation
      setTimeout(() => {
        loadGardenState();
      }, 300);
    } catch (error) {
      console.error('Error recording check-in:', error);
    }
  };

  const getPlantComponent = (plant: GardenPlant, index: number) => {
    const isNew = newPlants.has(plant.id);
    const age = Date.now() - new Date(plant.createdAt).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    
    // Plants grow over time
    const growthProgress = Math.min(1, daysOld / 7); // Full growth in 7 days
    const currentSize = plant.size * (0.3 + growthProgress * 0.7); // Start at 30% size
    
    const baseColor = plant.type === 'flower' ? '#ec4899' : 
                     plant.type === 'cloud' ? '#6b7280' : 
                     plant.type === 'thorn' ? '#dc2626' :
                     plant.type === 'rock' ? '#4b5563' :
                     plant.type === 'tree' ? '#16a34a' :
                     '#22c55e'; // grass
    
    const PlantIcon = plant.type === 'flower' ? Flower2 :
                     plant.type === 'cloud' ? Cloud :
                     plant.type === 'tree' ? TreePine :
                     plant.type === 'rock' ? Mountain :
                     Leaf;

    return (
      <motion.div
        key={plant.id}
        className="absolute pointer-events-none"
        style={{
          left: `${plant.x}%`,
          top: `${plant.y}%`,
        }}
        initial={isNew ? {
          scale: 0,
          y: 50,
          opacity: 0,
        } : {
          scale: currentSize,
          opacity: plant.opacity,
        }}
        animate={{
          scale: currentSize,
          opacity: plant.opacity,
          y: 0,
        }}
        transition={{
          duration: isNew ? 1.5 : 0.5,
          delay: isNew ? index * 0.15 : 0,
          type: "spring",
          stiffness: 100,
          damping: 12
        }}
      >
        {/* Sprouting animation for new plants - simplified on mobile */}
        {isNew && (
          <>
            {/* Ground burst effect - simplified on mobile */}
            {!isMobile && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 1],
                  opacity: [0, 0.4, 0]
                }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 -z-10"
              >
                <div className="w-12 h-12 bg-green-300 rounded-full blur-lg" />
              </motion.div>
            )}

            {/* Sprouting particles - reduced on mobile */}
            {[...Array(isMobile ? 4 : 8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  x: Math.cos((i / (isMobile ? 4 : 8)) * Math.PI * 2) * (20 + Math.random() * 10),
                  y: Math.sin((i / (isMobile ? 4 : 8)) * Math.PI * 2) * (20 + Math.random() * 10) - 10,
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.2 + i * 0.03,
                  ease: "easeOut"
                }}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: baseColor }}
                />
              </motion.div>
            ))}
          </>
        )}

        {/* Plant with growth animation */}
        <motion.div
          animate={isNew ? {
            scale: [0, 1.3, 1],
            rotate: [0, 10, -10, 0],
            y: [20, -5, 0]
          } : {
            scale: [1, 1.05, 1],
            rotate: [0, 1, -1, 0],
            y: [0, -3, 0]
          }}
          transition={{
            duration: isNew ? 2 : 4 + (index % 3),
            repeat: isNew ? 0 : Infinity,
            ease: "easeInOut",
            delay: isNew ? 0.5 : index * 0.1
          }}
          style={{
            color: baseColor,
            filter: `drop-shadow(0 4px 12px ${baseColor}40) brightness(${1 + growthProgress * 0.2})`,
          }}
        >
          <PlantIcon 
            size={Math.max(32, currentSize * 48)} 
            className="drop-shadow-lg"
          />
        </motion.div>

        {/* Enhanced Leaves/particles floating around plants - optimized for mobile */}
        {plant.type === 'tree' || plant.type === 'flower' ? (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {/* Leaves with varied paths - reduced on mobile */}
            {[...Array(isMobile ? 3 : 6)].map((_, i) => (
              <motion.div
                key={`leaf-${i}`}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 0,
                  rotate: Math.random() * 360
                }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 80],
                  y: [0, -40 - Math.random() * 40, -80 - Math.random() * 60],
                  opacity: [0, 0.8, 0.6, 0],
                  rotate: [0, 180 + Math.random() * 180, 360 + Math.random() * 180],
                  scale: [0.5, 1, 0.8, 0]
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: i * 0.3 + Math.random() * 2,
                  ease: "easeOut"
                }}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  color: baseColor,
                  filter: `opacity(0.7)`,
                }}
              >
                <Leaf size={10 + Math.random() * 8} />
              </motion.div>
            ))}
          </div>
        ) : null}
        
        {/* Shrubs around trees - disabled on mobile */}
        {plant.type === 'tree' && !isMobile && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={`shrub-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0.9, 1, 0.95, 1],
                  opacity: [0.3, 0.6, 0.4, 0.6],
                  x: [0, Math.sin(i) * 8],
                  y: [0, Math.cos(i) * 5]
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  delay: i * 1,
                  ease: "easeInOut"
                }}
                className="absolute"
                style={{
                  left: `${45 + (i - 0.5) * 25}%`,
                  top: `${55 + (i - 0.5) * 10}%`,
                  color: '#4a7c59',
                }}
              >
                <span style={{ fontSize: '16px' }}>🌿</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Glow effect for growing plants */}
        {growthProgress < 1 && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(circle, ${baseColor}40 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />
        )}
      </motion.div>
    );
  };

  const getWeatherEffects = (weather: GardenWeather) => {
    switch (weather.type) {
      case 'stormy':
        return (
          <>
            {/* Rain drops - reduced on mobile */}
            {[...Array(isMobile ? 8 : 15)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, window.innerHeight],
                  opacity: [0, 0.7, 0.7, 0]
                }}
                transition={{
                  duration: 1.2 + Math.random() * 0.5,
                  repeat: Infinity,
                  delay: Math.random() * 1.5,
                  ease: "linear"
                }}
                className={`absolute ${isMobile ? 'w-0.5 h-6' : 'w-0.5 h-8'} bg-blue-400`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                }}
              />
            ))}
            {/* Lightning flashes - disabled on mobile */}
            {!isMobile && (
              <motion.div
                animate={{
                  opacity: [0, 0.2, 0]
                }}
                transition={{
                  duration: 0.15,
                  repeat: Infinity,
                  repeatDelay: 4 + Math.random() * 3
                }}
                className="absolute inset-0 bg-white pointer-events-none"
              />
            )}
          </>
        );
      case 'sunny':
        return (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 right-10 pointer-events-none"
          >
            <Sun size={80} className="text-yellow-300" />
          </motion.div>
        );
      case 'windy':
        return (
          <>
            {/* Wind particles - reduced on mobile */}
            {[...Array(isMobile ? 6 : 10)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  x: [0, window.innerWidth * 0.8],
                  y: [Math.random() * window.innerHeight * 0.6, Math.random() * window.innerHeight * 0.6],
                  opacity: [0, 0.3, 0.3, 0]
                }}
                transition={{
                  duration: 5 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
                className="absolute"
              >
                <Wind size={isMobile ? 16 : 20} className="text-blue-300 opacity-40" />
              </motion.div>
            ))}
          </>
        );
      default:
        return (
          <>
            {/* Sparkles - reduced on mobile */}
            {[...Array(isMobile ? 3 : 5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                  duration: 3 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
                className="absolute pointer-events-none"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${15 + Math.random() * 30}%`,
                }}
              >
                <Sparkles size={isMobile ? 20 : 30} className="text-blue-200" />
              </motion.div>
            ))}
          </>
        );
    }
  };

  const getWeatherClass = (weather: GardenWeather) => {
    switch (weather.type) {
      case 'stormy':
        return 'bg-gradient-to-b from-gray-700 to-gray-900';
      case 'sunny':
        return 'bg-gradient-to-b from-yellow-100 via-blue-100 to-green-50';
      case 'windy':
        return 'bg-gradient-to-b from-blue-100 to-cyan-50';
      default:
        return 'bg-gradient-to-b from-green-50 via-blue-50 to-green-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 text-lg">Growing your garden...</p>
        </div>
      </div>
    );
  }

  if (!gardenState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Flower2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Start Your Garden</h2>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">Your emotional world, rendered as a living scene</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCheckIn(true)}
            className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 active:from-green-800 active:to-teal-800 transition-all shadow-lg text-base sm:text-lg font-semibold touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Plant Your First Seed
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-8 ${getWeatherClass(gardenState.weather)} transition-colors duration-1000 relative overflow-hidden`}>
      {/* Weather effects layer */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {getWeatherEffects(gardenState.weather)}
      </div>

      <div className="max-w-7xl mx-auto relative z-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2 mb-4 sm:mb-6 md:mb-8"
        >
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flower2 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-green-600" />
              </motion.div>
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">Emotion Garden</span>
            </h1>
            <p className="text-gray-700 text-sm sm:text-base md:text-lg">Your inner world, rendered as a living scene</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCheckIn(true)}
              className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 active:from-green-800 active:to-teal-800 transition-all shadow-md font-medium text-sm sm:text-base touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              + Check In
            </motion.button>
            {onExit && (
              <button
                onClick={onExit}
                className="p-2 text-gray-600 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                aria-label="Exit Emotion Garden"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Garden Canvas with layered rendering */}
        <div className="relative bg-white/30 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 min-h-[400px] sm:min-h-[500px] md:min-h-[600px] border-2 border-white/50 shadow-2xl overflow-hidden">
          {/* Ground layer (canvas) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 1 }}
          />

          {/* Plants layer */}
          <div className="relative z-20 w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
            <AnimatePresence>
              {gardenState.plants.map((plant, index) => getPlantComponent(plant, index))}
            </AnimatePresence>

            {gardenState.plants.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full text-center"
              >
                <div>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Flower2 className="w-20 h-20 text-green-400 mx-auto mb-4 opacity-50" />
                  </motion.div>
                  <p className="text-gray-600 text-lg">Your garden is empty. Check in with an emotion to plant your first seed.</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Ambient particles for atmosphere */}
          {gardenState.plants.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
              {/* Floating particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  animate={{
                    x: [0, (Math.random() - 0.5) * 300],
                    y: [0, -150 - Math.random() * 150],
                    opacity: [0, 0.4, 0.3, 0],
                    scale: [0, 1.2, 1, 0],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 6 + Math.random() * 4,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeOut"
                  }}
                  className="absolute w-2 h-2 bg-green-300 rounded-full blur-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '100%',
                  }}
                />
              ))}
              
              {/* Moving animals - butterflies, birds, bugs */}
              {gardenState.plants.length >= 3 && (
                <>
                  {/* Butterflies */}
                  {[...Array(2)].map((_, i) => (
                    <motion.div
                      key={`butterfly-${i}`}
                      initial={{ 
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400) + 100,
                        opacity: 0
                      }}
                      animate={{
                        x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800)],
                        y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400) + 100],
                        opacity: [0, 0.8, 0.8, 0],
                        rotate: [0, 360],
                        scale: [0.8, 1.2, 1, 0.8]
                      }}
                      transition={{
                        duration: 8 + Math.random() * 4,
                        repeat: Infinity,
                        delay: i * 3,
                        ease: "easeInOut"
                      }}
                      className="absolute pointer-events-none"
                      style={{ zIndex: 15 }}
                    >
                      <span style={{ fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>🦋</span>
                    </motion.div>
                  ))}
                  
                  {/* Birds */}
                  {gardenState.plants.length >= 5 && [...Array(1)].map((_, i) => (
                    <motion.div
                      key={`bird-${i}`}
                      initial={{ 
                        x: -50,
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300) + 50,
                        opacity: 0
                      }}
                      animate={{
                        x: [null, (typeof window !== 'undefined' ? window.innerWidth : 800) + 50],
                        y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300) + 50],
                        opacity: [0, 0.7, 0.7, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{
                        duration: 12 + Math.random() * 6,
                        repeat: Infinity,
                        delay: i * 5,
                        ease: "easeInOut"
                      }}
                      className="absolute pointer-events-none"
                      style={{ zIndex: 15 }}
                    >
                      <Bird size={18} className="text-gray-600" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                    </motion.div>
                  ))}
                  
                  {/* Bugs on ground */}
                  {gardenState.plants.length >= 4 && [...Array(2)].map((_, i) => (
                    <motion.div
                      key={`bug-${i}`}
                      initial={{ 
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                        y: (typeof window !== 'undefined' ? window.innerHeight : 600) - 120,
                        opacity: 0
                      }}
                      animate={{
                        x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800)],
                        y: [null, (typeof window !== 'undefined' ? window.innerHeight : 600) - 120 + (Math.random() - 0.5) * 20],
                        opacity: [0, 0.6, 0.6, 0],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 6 + Math.random() * 3,
                        repeat: Infinity,
                        delay: i * 2.5,
                        ease: "easeInOut"
                      }}
                      className="absolute pointer-events-none"
                      style={{ zIndex: 5 }}
                    >
                      <Bug size={14} className="text-green-700" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats Panel */}
        {gardenState.plants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          >
            <div className="bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-white/80">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{gardenState.plants.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Plants</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-white/80">
              <div className="text-base sm:text-lg md:text-xl font-bold text-blue-600 capitalize">{gardenState.weather.type}</div>
              <div className="text-xs sm:text-sm text-gray-600">Weather</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-white/80">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-teal-600">
                {gardenState.plants.filter(p => p.type === 'flower').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Flowers</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 text-center border border-white/80">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600">
                {gardenState.plants.filter(p => p.type === 'tree').length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Trees</div>
            </div>
          </motion.div>
        )}

        {/* Check-In Modal */}
        <AnimatePresence>
          {showCheckIn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowCheckIn(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <h3 className="text-3xl font-bold text-gray-900 mb-6">How do you feel?</h3>
                
                <div className="space-y-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Emotion</label>
                    <select
                      value={selectedEmotion}
                      onChange={(e) => setSelectedEmotion(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                    >
                      <option value="">Select an emotion...</option>
                      <option value="calm">🌿 Calm</option>
                      <option value="joy">🌸 Joy</option>
                      <option value="gratitude">🌻 Gratitude</option>
                      <option value="anxiety">☁️ Anxiety</option>
                      <option value="overwhelm">🌧️ Overwhelm</option>
                      <option value="anger">🌵 Anger</option>
                      <option value="frustration">⚡ Frustration</option>
                      <option value="stress">🪨 Stress</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Intensity: {intensity}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intensity}
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Mild</span>
                      <span>Moderate</span>
                      <span>Intense</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCheckIn(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCheckIn}
                    disabled={!selectedEmotion}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all"
                  >
                    Plant Seed 🌱
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
