import React, { useState, useEffect } from 'react';
import { Film, Sparkles, RefreshCw } from 'lucide-react';

interface Insight {
  id: string;
  sceneNumber: string;
  title: string;
  content: string;
  type: 'stat' | 'reflection' | 'trend' | 'ai';
  icon?: string;
}

interface DirectorsInsightsProps {
  hasReflectionData?: boolean;
  recentReflections?: any[];
  privateMode?: boolean;
  meetingStats?: {
    totalMeetings: number;
    averageRating?: string;
    mostCommonWord?: string;
    energyTrend?: string;
  };
}

export const DirectorsInsights: React.FC<DirectorsInsightsProps> = ({
  hasReflectionData = false,
  recentReflections: _recentReflections = [],
  privateMode = false,
  meetingStats
}) => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // Base insights for users without reflection data
  const baseInsights: Insight[] = [
    {
      id: 'stat-1',
      sceneNumber: '01',
      title: 'The Meeting Paradox',
      content: 'Most professionals spend 37% of their day in meetings. You\'ve reclaimed that time today — use it intentionally.',
      type: 'stat',
      icon: '🎞️'
    },
    {
      id: 'stat-2',
      sceneNumber: '02',
      title: 'The Power of Pause',
      content: 'People who pause for one minute of deep breathing report 21% higher focus before calls.',
      type: 'stat',
      icon: '🧘'
    },
    {
      id: 'reflection-1',
      sceneNumber: '03',
      title: 'Unwritten Scenes',
      content: 'Today\'s mood tone: unwritten. Every blank calendar is a scene waiting for you.',
      type: 'reflection',
      icon: '✨'
    },
    {
      id: 'stat-3',
      sceneNumber: '04',
      title: 'The Golden Hour',
      content: 'Morning meetings under 45 minutes have 34% higher satisfaction ratings than afternoon marathons.',
      type: 'stat',
      icon: '☀️'
    },
    {
      id: 'stat-4',
      sceneNumber: '05',
      title: 'The Preparation Effect',
      content: 'Just 3 minutes of intentional prep can transform a routine call into a memorable conversation.',
      type: 'stat',
      icon: '🎬'
    }
  ];

  // Generate AI-powered insights from reflection data
  const generateAIInsights = (): Insight[] => {
    const insights: Insight[] = [];

    if (meetingStats) {
      // Energy trend insight
      if (meetingStats.energyTrend === 'rising') {
        insights.push({
          id: 'ai-1',
          sceneNumber: '06',
          title: 'Rising Composure',
          content: 'Your last 3 meetings showed rising composure. Keep your tone steady tomorrow.',
          type: 'ai',
          icon: '📈'
        });
      }

      // Average rating insight
      if (meetingStats.averageRating === 'great') {
        insights.push({
          id: 'ai-2',
          sceneNumber: '07',
          title: 'Peak Performance',
          content: 'This week\'s strongest tone: Focused — your confidence is showing.',
          type: 'ai',
          icon: '⭐'
        });
      } else if (meetingStats.averageRating === 'draining') {
        insights.push({
          id: 'ai-3',
          sceneNumber: '08',
          title: 'Energy Protection',
          content: `You had ${meetingStats.totalMeetings} meetings, but only ${Math.ceil(meetingStats.totalMeetings * 0.2)} left you drained — that's progress.`,
          type: 'ai',
          icon: '🛡️'
        });
      }

      // Most common word insight
      if (meetingStats.mostCommonWord) {
        insights.push({
          id: 'ai-4',
          sceneNumber: '09',
          title: 'Your Meeting Signature',
          content: `"${meetingStats.mostCommonWord}" — the word that keeps appearing in your reflections. Notice the pattern?`,
          type: 'ai',
          icon: '💭'
        });
      }
    }

    return insights;
  };

  // Combine base and AI insights
  const allInsights = hasReflectionData 
    ? [...generateAIInsights(), ...baseInsights]
    : baseInsights;

  const currentInsight = allInsights[currentInsightIndex];

  const handleRotate = () => {
    setIsRotating(true);
    setTimeout(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % allInsights.length);
      setIsRotating(false);
    }, 300);
  };

  // Auto-rotate insights every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRotate();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentInsightIndex]);

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-serif text-gray-900">
            Director's Insights
          </h2>
        </div>
        <button
          onClick={handleRotate}
          disabled={isRotating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">New Insight</span>
        </button>
      </div>

      {/* Insight Card */}
      <div
        className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700/50 overflow-hidden transition-all duration-300 ${
          isRotating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Film grain texture */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' 
          }} 
        />

        {/* Subtle glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* Scene number badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentInsight.icon}</span>
              <span className="text-xs font-mono text-gray-500 tracking-widest">
                SCENE INSIGHT {currentInsight.sceneNumber}
              </span>
            </div>
            {currentInsight.type === 'ai' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">AI</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-serif text-white mb-3 leading-tight">
            {currentInsight.title}
          </h3>

          {/* Content */}
          <p className="text-gray-300 leading-relaxed">
            {currentInsight.content}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-6">
            {allInsights.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsRotating(true);
                  setTimeout(() => {
                    setCurrentInsightIndex(index);
                    setIsRotating(false);
                  }, 300);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentInsightIndex
                    ? 'w-8 bg-blue-400'
                    : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
            {allInsights.length > 5 && (
              <span className="text-xs text-gray-500 ml-1">
                +{allInsights.length - 5}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtle hint for new users */}
      {!hasReflectionData && (
        <p className="text-xs text-gray-500 text-center mt-3">
          💡 Complete post-meeting reflections to unlock personalized AI insights
        </p>
      )}

      {/* Privacy mode indicator */}
      {privateMode && hasReflectionData && (
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Private Mode: Showing trends only</span>
        </div>
      )}
    </div>
  );
};

