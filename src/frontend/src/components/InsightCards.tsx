import { TrendingUp, Calendar, Sparkles, Brain, Heart, Target } from 'lucide-react';

interface InsightCardsProps {
  hasData: boolean;
}

export default function InsightCards({ hasData }: InsightCardsProps) {
  // Insights for new users (no data yet)
  const newUserInsights = [
    {
      icon: <Calendar className="w-5 h-5" />,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      stat: '32%',
      label: 'of work time',
      description: 'Most professionals spend this much time in meetings',
      tip: 'Make each one count with intentional preparation',
    },
    {
      icon: <Brain className="w-5 h-5" />,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      stat: '2 min',
      label: 'of prep',
      description: 'Can transform your meeting performance',
      tip: 'Mental rehearsal activates the same brain regions as actual experience',
    },
    {
      icon: <Heart className="w-5 h-5" />,
      gradient: 'from-rose-500 to-orange-500',
      bgGradient: 'from-rose-50 to-orange-50',
      stat: '60%',
      label: 'reduction',
      description: 'In meeting anxiety with mindful preparation',
      tip: 'Calm presence starts before you join the call',
    },
  ];

  // Insights for users with calendar connected
  const connectedInsights = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      stat: '✨',
      label: 'Clear calendar',
      description: 'Perfect time to prepare intentionally',
      tip: 'Use this space to set intentions for upcoming meetings',
    },
    {
      icon: <Target className="w-5 h-5" />,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      stat: '🎯',
      label: 'Ready state',
      description: 'You\'re ahead of the game',
      tip: 'Preparation is the foundation of confident performance',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'from-amber-500 to-yellow-500',
      bgGradient: 'from-amber-50 to-yellow-50',
      stat: '📈',
      label: 'Growth mode',
      description: 'Every moment of calm compounds',
      tip: 'Small rituals create lasting transformation',
    },
  ];

  const insights = hasData ? connectedInsights : newUserInsights;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {hasData ? 'Your Meeting Insights' : 'Did You Know?'}
        </h3>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${insight.bgGradient} rounded-xl p-6 border-2 border-transparent hover:border-purple-200 transition-all hover:shadow-lg group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${insight.gradient} text-white shadow-md`}>
                {insight.icon}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {insight.stat}
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {insight.label}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 font-medium mb-2">
              {insight.description}
            </p>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-purple-600 font-bold">💡</span>
                <span>{insight.tip}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

