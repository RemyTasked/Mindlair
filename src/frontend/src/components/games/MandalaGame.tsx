/**
 * Mind Garden - Mandala Garden Game
 * 
 * Digital coloring meditation for flow state achievement.
 * Fill a beautiful mandala pattern with calming colors.
 * +3 Serenity points per section, +20 bonus for completion.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, RotateCcw, Check, Sparkles } from 'lucide-react';

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

// Mandala SVG paths - 24 sections for a balanced design
const MANDALA_SECTIONS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * 15) * (Math.PI / 180);
  const nextAngle = ((i + 1) * 15) * (Math.PI / 180);
  const innerRadius = 60;
  const outerRadius = 140;
  
  const x1 = 150 + Math.cos(angle) * innerRadius;
  const y1 = 150 + Math.sin(angle) * innerRadius;
  const x2 = 150 + Math.cos(angle) * outerRadius;
  const y2 = 150 + Math.sin(angle) * outerRadius;
  const x3 = 150 + Math.cos(nextAngle) * outerRadius;
  const y3 = 150 + Math.sin(nextAngle) * outerRadius;
  const x4 = 150 + Math.cos(nextAngle) * innerRadius;
  const y4 = 150 + Math.sin(nextAngle) * innerRadius;
  
  return {
    id: `section-${i}`,
    path: `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`,
    ring: 'outer',
  };
});

// Inner ring sections
const INNER_SECTIONS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30) * (Math.PI / 180);
  const nextAngle = ((i + 1) * 30) * (Math.PI / 180);
  const innerRadius = 25;
  const outerRadius = 55;
  
  const x1 = 150 + Math.cos(angle) * innerRadius;
  const y1 = 150 + Math.sin(angle) * innerRadius;
  const x2 = 150 + Math.cos(angle) * outerRadius;
  const y2 = 150 + Math.sin(angle) * outerRadius;
  const x3 = 150 + Math.cos(nextAngle) * outerRadius;
  const y3 = 150 + Math.sin(nextAngle) * outerRadius;
  const x4 = 150 + Math.cos(nextAngle) * innerRadius;
  const y4 = 150 + Math.sin(nextAngle) * innerRadius;
  
  return {
    id: `inner-${i}`,
    path: `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`,
    ring: 'inner',
  };
});

const ALL_SECTIONS = [...INNER_SECTIONS, ...MANDALA_SECTIONS];

export default function MandalaGame({ onComplete, onExit }: MandalaGameProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [selectedPalette, setSelectedPalette] = useState<string>('Forest Dawn');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTES['Forest Dawn'][0]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [sectionsColored, setSectionsColored] = useState(0);

  const colors = COLOR_PALETTES[selectedPalette as keyof typeof COLOR_PALETTES];
  const totalSections = ALL_SECTIONS.length;
  const progress = (sectionsColored / totalSections) * 100;

  const handleSectionClick = useCallback((sectionId: string) => {
    if (gameState !== 'playing') return;
    
    const isNewSection = !sectionColors[sectionId];
    
    setSectionColors(prev => ({
      ...prev,
      [sectionId]: selectedColor,
    }));

    if (isNewSection) {
      const newSectionsColored = sectionsColored + 1;
      setSectionsColored(newSectionsColored);
      setScore(prev => prev + 3);

      // Check for completion
      if (newSectionsColored >= totalSections) {
        setScore(prev => prev + 20); // Completion bonus
        setTimeout(() => setGameState('complete'), 500);
      }
    }
  }, [gameState, sectionColors, selectedColor, sectionsColored, totalSections]);

  const handleReset = () => {
    setSectionColors({});
    setSectionsColored(0);
    setScore(0);
  };

  const handleComplete = () => {
    onComplete(score, 1);
  };

  // Intro screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">🎨</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mandala Garden</h1>
          <p className="text-gray-600 mb-6">
            Color a beautiful mandala pattern to achieve a meditative flow state. 
            Focus on the boundaries and colors to quiet your mind.
          </p>

          <div className="bg-rose-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">How to Play</h3>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• Choose a color palette that speaks to you</li>
              <li>• Tap sections to fill them with color</li>
              <li>• +3 Serenity per section colored</li>
              <li>• +20 bonus for completing the mandala</li>
            </ul>
          </div>

          {/* Palette Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Your Palette</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(COLOR_PALETTES).map(([name, palette]) => (
                <button
                  key={name}
                  onClick={() => {
                    setSelectedPalette(name);
                    setSelectedColor(palette[0]);
                  }}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    selectedPalette === name
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-rose-300'
                  }`}
                >
                  <div className="flex gap-1 mb-1">
                    {palette.slice(0, 4).map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">{name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg"
          >
            Start Coloring
          </button>

          <button
            onClick={onExit}
            className="mt-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
        </motion.div>
      </div>
    );
  }

  // Completion screen
  if (gameState === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-6xl mb-4"
          >
            ✨
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Beautiful Work!</h1>
          <p className="text-gray-600 mb-6">
            You've completed your mandala meditation. Your garden grows stronger.
          </p>

          <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-rose-500" />
              <span className="text-3xl font-bold text-gray-900">+{score}</span>
            </div>
            <p className="text-sm text-gray-600">Serenity Points Earned</p>
          </div>

          {/* Show completed mandala */}
          <div className="mb-6">
            <svg viewBox="0 0 300 300" className="w-48 h-48 mx-auto">
              <circle cx="150" cy="150" r="145" fill="#fef2f2" stroke="#fecaca" strokeWidth="2" />
              {ALL_SECTIONS.map((section) => (
                <path
                  key={section.id}
                  d={section.path}
                  fill={sectionColors[section.id] || '#f5f5f5'}
                  stroke="#e5e5e5"
                  strokeWidth="0.5"
                />
              ))}
              <circle cx="150" cy="150" r="20" fill={colors[0]} stroke="#e5e5e5" strokeWidth="0.5" />
            </svg>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Claim Reward
          </button>
        </motion.div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Exit
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-900">{score}</span>
            </div>

            <button
              onClick={handleReset}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 bg-white rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-400 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">
          {sectionsColored} / {totalSections} sections colored
        </p>
      </div>

      {/* Mandala */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="bg-white rounded-3xl shadow-xl p-4">
          <svg viewBox="0 0 300 300" className="w-full h-auto">
            {/* Background circle */}
            <circle cx="150" cy="150" r="145" fill="#fef2f2" stroke="#fecaca" strokeWidth="2" />
            
            {/* Mandala sections */}
            {ALL_SECTIONS.map((section) => (
              <motion.path
                key={section.id}
                d={section.path}
                fill={sectionColors[section.id] || '#f5f5f5'}
                stroke="#d4d4d4"
                strokeWidth="0.5"
                onClick={() => handleSectionClick(section.id)}
                whileHover={{ scale: 1.02, opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer transition-colors"
                style={{ transformOrigin: '150px 150px' }}
              />
            ))}

            {/* Center circle */}
            <circle
              cx="150"
              cy="150"
              r="20"
              fill={sectionColors['center'] || '#f5f5f5'}
              stroke="#d4d4d4"
              strokeWidth="0.5"
              onClick={() => handleSectionClick('center')}
              className="cursor-pointer"
            />

            {/* Decorative rings */}
            <circle cx="150" cy="150" r="140" fill="none" stroke="#fecaca" strokeWidth="1" />
            <circle cx="150" cy="150" r="55" fill="none" stroke="#fecaca" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Color Palette */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-rose-500" />
              <span className="font-semibold text-gray-900">{selectedPalette}</span>
            </div>
            
            {/* Palette switcher */}
            <select
              value={selectedPalette}
              onChange={(e) => {
                setSelectedPalette(e.target.value);
                setSelectedColor(COLOR_PALETTES[e.target.value as keyof typeof COLOR_PALETTES][0]);
              }}
              className="text-sm bg-gray-100 border-0 rounded-lg px-3 py-1 focus:ring-2 focus:ring-rose-500"
            >
              {Object.keys(COLOR_PALETTES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-center">
            {colors.map((color, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full transition-all ${
                  selectedColor === color
                    ? 'ring-4 ring-rose-300 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

