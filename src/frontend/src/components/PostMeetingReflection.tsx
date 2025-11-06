import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface PostMeetingReflectionProps {
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
  onSubmit: (reflection: ReflectionData) => Promise<void>;
}

export interface ReflectionData {
  rating: 'great' | 'neutral' | 'draining';
  oneWord?: string;
  notes?: string;
}

export const PostMeetingReflection: React.FC<PostMeetingReflectionProps> = ({
  meetingId,
  meetingTitle,
  onClose,
  onSubmit
}) => {
  const [rating, setRating] = useState<'great' | 'neutral' | 'draining' | null>(null);
  const [oneWord, setOneWord] = useState('');
  const [showOneWord, setShowOneWord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingSelect = async (selectedRating: 'great' | 'neutral' | 'draining') => {
    setRating(selectedRating);
    
    // Auto-submit if user doesn't want to add a word
    if (!showOneWord) {
      setIsSubmitting(true);
      try {
        await onSubmit({ rating: selectedRating });
        setTimeout(onClose, 1000); // Close after brief delay
      } catch (error) {
        console.error('Failed to submit reflection:', error);
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmitWithWord = async () => {
    if (!rating) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        rating,
        oneWord: oneWord.trim() || undefined
      });
      setTimeout(onClose, 1000);
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700/50 overflow-hidden">
        {/* Film grain texture overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} 
        />
        
        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-gray-500 tracking-widest">SCENE WRAPPED</span>
              <Sparkles className="w-3 h-3 text-yellow-500/70" />
            </div>
            <h2 className="text-2xl font-serif text-white mb-1">
              🎬 How did it feel?
            </h2>
            <p className="text-sm text-gray-400 line-clamp-1">{meetingTitle}</p>
          </div>

          {/* Rating options */}
          {!isSubmitting && (
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleRatingSelect('great')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  rating === 'great'
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-gray-700 hover:border-green-500/50 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐</span>
                  <div className="text-left">
                    <div className="text-white font-semibold">Great</div>
                    <div className="text-xs text-gray-400">Energizing & productive</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRatingSelect('neutral')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  rating === 'neutral'
                    ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                    : 'border-gray-700 hover:border-yellow-500/50 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">😐</span>
                  <div className="text-left">
                    <div className="text-white font-semibold">Neutral</div>
                    <div className="text-xs text-gray-400">Just another meeting</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRatingSelect('draining')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  rating === 'draining'
                    ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20'
                    : 'border-gray-700 hover:border-red-500/50 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">😣</span>
                  <div className="text-left">
                    <div className="text-white font-semibold">Draining</div>
                    <div className="text-xs text-gray-400">Low energy or difficult</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Success state */}
          {isSubmitting && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-green-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-semibold">Reflection captured</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Building your insights...</p>
            </div>
          )}

          {/* Optional one-word input */}
          {!isSubmitting && rating && (
            <div className="border-t border-gray-700/50 pt-4">
              {!showOneWord ? (
                <button
                  onClick={() => setShowOneWord(true)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  + Add one word to describe it (optional)
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={oneWord}
                    onChange={(e) => setOneWord(e.target.value)}
                    placeholder="One word..."
                    maxLength={30}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmitWithWord}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Submit Reflection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          {!isSubmitting && !rating && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Takes 2 seconds • Powers your future insights
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

