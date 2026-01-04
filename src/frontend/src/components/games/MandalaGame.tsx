/**
 * Mind Garden - Mandala Garden Game
 * 
 * Digital coloring meditation for flow state achievement.
 * Fill a complex, beautiful mandala pattern with calming colors.
 * Now with interactive sound and extensive patterns!
 * +2 Serenity points per section, +50 bonus for completion.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Palette, RotateCcw, Check, Sparkles, Volume2, VolumeX, Music } from 'lucide-react';

interface MandalaGameProps {
  onComplete: (credits: number, streak: number) => void;
  onExit: () => void;
}

// Color palettes inspired by nature
const COLOR_PALETTES = {
  'Forest Dawn': ['#2D5A27', '#4A7C42', '#7CB342', '#AED581', '#DCEDC8', '#F1F8E9'],
  'Ocean Calm': ['#0D47A1', '#1976D2', '#42A5F5', '#90CAF9', '#BBDEFB', '#E3F2FD'],
  'Desert Bloom': ['#BF360C', '#E64A19', '#FF7043', '#FFAB91', '#FFCCBC', '#FBE9E7'],
  'Twilight Garden': ['#4A148C', '#7B1FA2', '#AB47BC', '#CE93D8', '#E1BEE7', '#F3E5F5'],
  'Sunrise Meadow': ['#F57F17', '#FBC02D', '#FFEB3B', '#FFF176', '#FFF59D', '#FFFDE7'],
};

// Generate more extensive mandala sections
const createMandala = () => {
  const sections: any[] = [];
  const rings = [
    { count: 32, inner: 110, outer: 145, id: 'ring4' },
    { count: 24, inner: 75, outer: 105, id: 'ring3' },
    { count: 16, inner: 45, outer: 70, id: 'ring2' },
    { count: 12, inner: 20, outer: 40, id: 'ring1' },
  ];

  rings.forEach((ring) => {
    const angleStep = (360 / ring.count) * (Math.PI / 180);
    for (let i = 0; i < ring.count; i++) {
      const angle = i * angleStep;
      const nextAngle = (i + 1) * angleStep;
      
      const x1 = 150 + Math.cos(angle) * ring.inner;
      const y1 = 150 + Math.sin(angle) * ring.inner;
      const x2 = 150 + Math.cos(angle) * ring.outer;
      const y2 = 150 + Math.sin(angle) * ring.outer;
      const x3 = 150 + Math.cos(nextAngle) * ring.outer;
      const y3 = 150 + Math.sin(nextAngle) * ring.outer;
      const x4 = 150 + Math.cos(nextAngle) * ring.inner;
      const y4 = 150 + Math.sin(nextAngle) * ring.inner;
      
      sections.push({
        id: `${ring.id}-${i}`,
        path: `M ${x1} ${y1} L ${x2} ${y2} A ${ring.outer} ${ring.outer} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${ring.inner} ${ring.inner} 0 0 0 ${x1} ${y1} Z`,
        ring: ring.id,
        index: i,
      });
    }
  });

  return sections;
};

const ALL_SECTIONS = createMandala();

// Frequencies for musical notes (Pentatonic scale)
const NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

export default function MandalaGame({ onComplete, onExit }: MandalaGameProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [selectedPalette, setSelectedPalette] = useState<string>('Forest Dawn');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTES['Forest Dawn'][0]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [sectionsColored, setSectionsColored] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const totalSections = ALL_SECTIONS.length + 1; // +1 for center
  const progress = (sectionsColored / totalSections) * 100;

  // Sound synthesis
  const playSound = useCallback((index: number) => {
    if (isMuted) return;
    
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    // Map index to a note in the scale
    const noteIndex = index % NOTES.length;
    oscillator.frequency.setValueAtTime(NOTES[noteIndex], ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  }, [isMuted]);

  const handleSectionClick = useCallback((sectionId: string, index: number) => {
    if (gameState !== 'playing') return;
    
    const isNewSection = !sectionColors[sectionId];
    
    setSectionColors(prev => ({
      ...prev,
      [sectionId]: selectedColor,
    }));

    playSound(index);

    if (isNewSection) {
      const newSectionsColored = sectionsColored + 1;
      setSectionsColored(newSectionsColored);
      setScore(prev => prev + 2);

      if (newSectionsColored >= totalSections) {
        setScore(prev => prev + 50); // Larger bonus for extensive mandala
        setTimeout(() => setGameState('complete'), 800);
      }
    }
  }, [gameState, sectionColors, selectedColor, sectionsColored, totalSections, playSound]);

  const handleReset = () => {
    setSectionColors({});
    setSectionsColored(0);
    setScore(0);
  };

  const handleComplete = () => {
    onComplete(score, 1);
  };

  // Intro
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center"
        >
          <div className="text-6xl mb-4">🎨</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mandala Garden</h1>
          <p className="text-gray-600 mb-6">
            Color an intricate mandala pattern. Each section you fill creates a harmonious musical note, helping you reach a deeper state of focus.
          </p>

          <div className="bg-indigo-50 rounded-2xl p-5 mb-6 text-left border border-indigo-100">
            <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Music className="w-5 h-5" />
              New Enhancements:
            </h3>
            <ul className="space-y-2 text-sm text-indigo-800">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <strong>Interactive Sound:</strong> Sections play musical notes when colored.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <strong>Extensive Pattern:</strong> {totalSections} sections for a longer meditation.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <strong>Better Rewards:</strong> Higher bonus for completion.
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {Object.entries(COLOR_PALETTES).map(([name, palette]) => (
              <button
                key={name}
                onClick={() => {
                  setSelectedPalette(name);
                  setSelectedColor(palette[0]);
                }}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedPalette === name
                    ? 'border-rose-500 bg-rose-50 shadow-md'
                    : 'border-gray-100 hover:border-rose-200 bg-white'
                }`}
              >
                <div className="flex gap-1">
                  {palette.slice(0, 4).map((color, i) => (
                    <div key={i} className="w-5 h-5 rounded-full shadow-inner" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-700">{name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-bold text-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-lg transform hover:-translate-y-1"
          >
            Start Meditation
          </button>

          <button onClick={onExit} className="mt-4 text-gray-500 hover:text-gray-700 text-sm">
            ← Back to Games
          </button>
        </motion.div>
      </div>
    );
  }

  // Playing
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 p-4 lg:p-8 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onExit} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-xl text-gray-900">{score}</span>
            </div>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all"
            >
              {isMuted ? <VolumeX className="w-6 h-6 text-gray-400" /> : <Volume2 className="w-6 h-6 text-rose-500" />}
            </button>

            <button onClick={handleReset} className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50 transition-all">
              <RotateCcw className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Game Layout */}
        <div className="flex-1 grid lg:grid-cols-12 gap-8 items-center">
          {/* Palette (Left) */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/50">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-6 h-6 text-rose-500" />
                <span className="font-bold text-gray-800">{selectedPalette}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES].map((color, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setSelectedColor(color)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`aspect-square rounded-2xl shadow-inner transition-all ${
                      selectedColor === color ? 'ring-4 ring-rose-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-bold mb-3 tracking-wider">Progress</p>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner p-1">
                  <motion.div
                    className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-right text-xs font-bold text-gray-600 mt-2">
                  {sectionsColored} / {totalSections}
                </p>
              </div>
            </div>
          </div>

          {/* Mandala (Center) */}
          <div className="lg:col-span-9 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-[min(80vw,600px)] aspect-square bg-white rounded-[40px] shadow-2xl p-4 lg:p-8 border-8 border-white">
              <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-sm">
                <circle cx="150" cy="150" r="148" fill="#fffcfc" stroke="#fecaca" strokeWidth="1" />
                
                {ALL_SECTIONS.map((section, i) => (
                  <motion.path
                    key={section.id}
                    d={section.path}
                    fill={sectionColors[section.id] || '#f9fafb'}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                    onClick={() => handleSectionClick(section.id, i)}
                    whileHover={{ scale: 1.01, fill: selectedColor + '44' }}
                    className="cursor-pointer transition-colors duration-300"
                    style={{ transformOrigin: '150px 150px' }}
                  />
                ))}

                <motion.circle
                  cx="150" cy="150" r="18"
                  fill={sectionColors['center'] || '#f9fafb'}
                  stroke="#e2e8f0" strokeWidth="0.5"
                  onClick={() => handleSectionClick('center', 0)}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.1 }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {gameState === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full text-center"
            >
              <div className="text-7xl mb-6">✨</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Zen Achieved</h2>
              <p className="text-gray-600 mb-8">
                Your focus has nurtured the garden. Your mind is as balanced as your mandala.
              </p>
              
              <div className="bg-rose-50 rounded-3xl p-8 mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Sparkles className="w-8 h-8 text-rose-500" />
                  <span className="text-5xl font-black text-gray-900">+{score}</span>
                </div>
                <p className="text-rose-600 font-bold tracking-widest uppercase text-xs">Serenity Earned</p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-bold text-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-3"
              >
                <Check className="w-6 h-6" />
                Claim Reward
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
