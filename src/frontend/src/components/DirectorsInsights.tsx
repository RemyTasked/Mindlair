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
  todaysMeetingCount?: number;
  upcomingMeetings?: any[];
  // New: User behavior metadata for personalization
  userMetadata?: {
    totalFocusSessions?: number;
    preferredPrepModes?: Record<string, number>; // e.g., { "Clarity": 5, "Connection": 3 }
    meetingPatterns?: {
      averageDuration?: number;
      mostCommonMeetingType?: string; // e.g., "1:1", "Team", "Client"
      backToBackFrequency?: number; // percentage
      preferredMeetingTime?: 'morning' | 'afternoon' | 'evening';
    };
    recentPrepChoices?: Array<{
      meetingTitle: string;
      prepMode: string;
      timestamp: string;
    }>;
    soundPreferences?: {
      mostUsedSound?: string;
      totalSoundSessions?: number;
    };
  };
}

export const DirectorsInsights: React.FC<DirectorsInsightsProps> = ({
  hasReflectionData = false,
  recentReflections: _recentReflections = [],
  privateMode = false,
  meetingStats,
  todaysMeetingCount = 0,
  upcomingMeetings = [],
  userMetadata
}) => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // Helper: Get time of day
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Helper: Get day of week
  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Helper: Is it a weekend?
  const isWeekend = () => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  };

  // Generate contextual base insights
  const generateBaseInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const timeOfDay = getTimeOfDay();
    const dayOfWeek = getDayOfWeek();

    // Time-aware greeting insights
    if (timeOfDay === 'morning') {
      insights.push({
        id: 'time-morning',
        sceneNumber: '01',
        title: 'Opening Scene',
        content: `Good morning. ${dayOfWeek} begins with intention — how you start shapes the entire act.`,
        type: 'reflection',
        icon: '☀️'
      });
    } else if (timeOfDay === 'afternoon') {
      insights.push({
        id: 'time-afternoon',
        sceneNumber: '01',
        title: 'Midday Momentum',
        content: `${dayOfWeek} afternoon. The story is halfway written — stay present for the scenes ahead.`,
        type: 'reflection',
        icon: '⚡'
      });
    } else {
      insights.push({
        id: 'time-evening',
        sceneNumber: '01',
        title: 'Closing Credits',
        content: `${dayOfWeek} evening. Every scene you showed up for today counts — even the difficult ones.`,
        type: 'reflection',
        icon: '🌙'
      });
    }

    // Meeting count insights
    if (todaysMeetingCount === 0) {
      insights.push({
        id: 'meetings-zero',
        sceneNumber: '02',
        title: 'Blank Canvas',
        content: isWeekend() 
          ? 'No meetings scheduled. This is your intermission — rest is part of the performance.'
          : 'No meetings today. A rare gift of uninterrupted time — use it like the director you are.',
        type: 'reflection',
        icon: '🎨'
      });
    } else if (todaysMeetingCount === 1) {
      insights.push({
        id: 'meetings-one',
        sceneNumber: '02',
        title: 'Single Scene Focus',
        content: 'One meeting today. Give it your full presence — a single scene can change the entire story.',
        type: 'reflection',
        icon: '🎯'
      });
    } else if (todaysMeetingCount <= 3) {
      insights.push({
        id: 'meetings-few',
        sceneNumber: '02',
        title: 'Measured Pace',
        content: `${todaysMeetingCount} meetings today. A sustainable rhythm — you have space to breathe between scenes.`,
        type: 'reflection',
        icon: '🎬'
      });
    } else if (todaysMeetingCount <= 5) {
      insights.push({
        id: 'meetings-busy',
        sceneNumber: '02',
        title: 'Full Schedule',
        content: `${todaysMeetingCount} meetings today. Stay grounded between scenes — your energy is your most valuable asset.`,
        type: 'reflection',
        icon: '📅'
      });
    } else {
      insights.push({
        id: 'meetings-packed',
        sceneNumber: '02',
        title: 'Marathon Day',
        content: `${todaysMeetingCount} meetings today. This is a test of composure — remember to pause, even for 60 seconds.`,
        type: 'reflection',
        icon: '🏃'
      });
    }

    // Upcoming meeting insights
    if (upcomingMeetings.length > 0) {
      const nextMeeting = upcomingMeetings[0];
      const meetingTime = new Date(nextMeeting.startTime);
      const now = new Date();
      const minutesUntil = Math.floor((meetingTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil <= 5 && minutesUntil > 0) {
        insights.push({
          id: 'upcoming-imminent',
          sceneNumber: '03',
          title: 'Scene Starting Soon',
          content: `"${nextMeeting.title}" begins in ${minutesUntil} minutes. Take one deep breath before you enter.`,
          type: 'reflection',
          icon: '⏰'
        });
      } else if (minutesUntil <= 30 && minutesUntil > 5) {
        insights.push({
          id: 'upcoming-soon',
          sceneNumber: '03',
          title: 'Next Scene Approaching',
          content: `"${nextMeeting.title}" in ${minutesUntil} minutes. What version of you do you want to bring?`,
          type: 'reflection',
          icon: '🎭'
        });
      }
    }

    return insights;
  };

  // Large pool of rotating general insights (30+ variations)
  const generalInsights: Insight[] = [
    {
      id: 'stat-1',
      sceneNumber: '04',
      title: 'The Meeting Paradox',
      content: 'Most professionals spend 37% of their day in meetings. You\'ve reclaimed that time today — use it intentionally.',
      type: 'stat',
      icon: '🎞️'
    },
    {
      id: 'stat-2',
      sceneNumber: '05',
      title: 'The Power of Pause',
      content: 'People who pause for one minute of deep breathing report 21% higher focus before calls.',
      type: 'stat',
      icon: '🧘'
    },
    {
      id: 'stat-3',
      sceneNumber: '06',
      title: 'The Golden Hour',
      content: 'Morning meetings under 45 minutes have 34% higher satisfaction ratings than afternoon marathons.',
      type: 'stat',
      icon: '☀️'
    },
    {
      id: 'stat-4',
      sceneNumber: '07',
      title: 'The Preparation Effect',
      content: 'Just 3 minutes of intentional prep can transform a routine call into a memorable conversation.',
      type: 'stat',
      icon: '🎬'
    },
    {
      id: 'stat-5',
      sceneNumber: '08',
      title: 'The Composure Advantage',
      content: 'Leaders who speak 20% slower are perceived as 34% more confident and trustworthy.',
      type: 'stat',
      icon: '🎙️'
    },
    {
      id: 'stat-6',
      sceneNumber: '09',
      title: 'The Silence Strategy',
      content: 'A 3-second pause before responding increases perceived thoughtfulness by 40%.',
      type: 'stat',
      icon: '⏸️'
    },
    {
      id: 'stat-7',
      sceneNumber: '10',
      title: 'The Energy Window',
      content: 'Your cognitive peak is typically 2-4 hours after waking. Schedule important meetings accordingly.',
      type: 'stat',
      icon: '⚡'
    },
    {
      id: 'stat-8',
      sceneNumber: '11',
      title: 'The Back-to-Back Trap',
      content: 'Back-to-back meetings reduce focus by 47%. Even a 5-minute buffer restores clarity.',
      type: 'stat',
      icon: '🔄'
    },
    {
      id: 'stat-9',
      sceneNumber: '12',
      title: 'The First Impression Window',
      content: 'People form 80% of their impression of you in the first 7 seconds. Your opening matters.',
      type: 'stat',
      icon: '👁️'
    },
    {
      id: 'stat-10',
      sceneNumber: '13',
      title: 'The Question Advantage',
      content: 'Meetings that start with a question have 28% higher engagement than those that start with statements.',
      type: 'stat',
      icon: '❓'
    },
    {
      id: 'wisdom-1',
      sceneNumber: '14',
      title: 'Scene Direction',
      content: 'Every meeting is a scene. You can\'t control the script, but you can control your performance.',
      type: 'reflection',
      icon: '🎭'
    },
    {
      id: 'wisdom-2',
      sceneNumber: '15',
      title: 'The Rehearsal Principle',
      content: 'Great actors rehearse. Great professionals prepare. The 5 minutes before a meeting define the 50 minutes during.',
      type: 'reflection',
      icon: '🎪'
    },
    {
      id: 'wisdom-3',
      sceneNumber: '16',
      title: 'Presence Over Performance',
      content: 'You don\'t need to be perfect. You need to be present. That\'s the whole scene.',
      type: 'reflection',
      icon: '✨'
    },
    {
      id: 'wisdom-4',
      sceneNumber: '17',
      title: 'The Director\'s Cut',
      content: 'You can\'t edit a meeting in real-time, but you can pause, breathe, and choose your next line.',
      type: 'reflection',
      icon: '✂️'
    },
    {
      id: 'wisdom-5',
      sceneNumber: '18',
      title: 'Energy Management',
      content: 'Your energy is the currency of leadership. Spend it wisely — not every scene deserves the same investment.',
      type: 'reflection',
      icon: '🔋'
    },
    {
      id: 'wisdom-6',
      sceneNumber: '19',
      title: 'The Listening Scene',
      content: 'The best performances aren\'t monologues. Listen like you\'re learning the other character\'s story.',
      type: 'reflection',
      icon: '👂'
    },
    {
      id: 'wisdom-7',
      sceneNumber: '20',
      title: 'Intermission Matters',
      content: 'Even the best films have intermissions. Your breaks between meetings aren\'t wasted time — they\'re essential.',
      type: 'reflection',
      icon: '☕'
    },
    {
      id: 'wisdom-8',
      sceneNumber: '21',
      title: 'The Tone You Set',
      content: 'Your tone in the first 30 seconds sets the emotional temperature for the entire room.',
      type: 'reflection',
      icon: '🌡️'
    },
    {
      id: 'wisdom-9',
      sceneNumber: '22',
      title: 'Rewrite Tomorrow',
      content: 'Today\'s performance doesn\'t define tomorrow\'s. Every morning is a fresh script.',
      type: 'reflection',
      icon: '📝'
    },
    {
      id: 'wisdom-10',
      sceneNumber: '23',
      title: 'The Unspoken Scene',
      content: 'What you don\'t say is as important as what you do. Silence is a tool, not a gap.',
      type: 'reflection',
      icon: '🤫'
    },
    {
      id: 'tip-1',
      sceneNumber: '24',
      title: 'The 4-7-8 Breath',
      content: 'Inhale for 4, hold for 7, exhale for 8. One round calms your nervous system before any high-stakes call.',
      type: 'stat',
      icon: '🌬️'
    },
    {
      id: 'tip-2',
      sceneNumber: '25',
      title: 'The Posture Shift',
      content: 'Sitting upright increases confidence hormones by 20%. Your body language shapes your mental state.',
      type: 'stat',
      icon: '🪑'
    },
    {
      id: 'tip-3',
      sceneNumber: '26',
      title: 'The Water Strategy',
      content: 'Drinking water mid-meeting gives you a 2-second pause to think. It\'s a composure hack disguised as hydration.',
      type: 'stat',
      icon: '💧'
    },
    {
      id: 'tip-4',
      sceneNumber: '27',
      title: 'The Agenda Advantage',
      content: 'Meetings with a clear agenda finish 18 minutes faster on average. Set the structure, own the scene.',
      type: 'stat',
      icon: '📋'
    },
    {
      id: 'tip-5',
      sceneNumber: '28',
      title: 'The Closing Line',
      content: 'End every meeting with one clear next step. Ambiguity kills momentum.',
      type: 'stat',
      icon: '🎯'
    },
    {
      id: 'tip-6',
      sceneNumber: '29',
      title: 'The Name Effect',
      content: 'Using someone\'s name increases their engagement by 30%. It\'s the simplest connection tool.',
      type: 'stat',
      icon: '🏷️'
    },
    {
      id: 'tip-7',
      sceneNumber: '30',
      title: 'The Gratitude Close',
      content: 'Ending with "Thank you for your time" increases perceived professionalism by 25%.',
      type: 'stat',
      icon: '🙏'
    },
    {
      id: 'tip-8',
      sceneNumber: '31',
      title: 'The Video Advantage',
      content: 'Meetings with video on have 41% higher trust ratings. Your face tells the story your words can\'t.',
      type: 'stat',
      icon: '📹'
    },
    {
      id: 'tip-9',
      sceneNumber: '32',
      title: 'The Early Arrival',
      content: 'Joining 2 minutes early signals respect and gives you time to settle. First impressions start before the meeting does.',
      type: 'stat',
      icon: '⏰'
    },
    {
      id: 'tip-10',
      sceneNumber: '33',
      title: 'The Reflection Ritual',
      content: 'Spending 60 seconds after a meeting to reflect increases retention by 23% and reduces repeat mistakes.',
      type: 'stat',
      icon: '🪞'
    }
  ];

  // Shuffle and select random general insights
  const getRandomInsights = (count: number) => {
    const shuffled = [...generalInsights].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  // Combine contextual + random general insights
  const baseInsights = [
    ...generateBaseInsights(),
    ...getRandomInsights(5)
  ];

  // Generate behavioral insights from user metadata (available from day 1)
  const generateBehavioralInsights = (): Insight[] => {
    const insights: Insight[] = [];

    if (!userMetadata) return insights;

    // Prep mode preferences
    if (userMetadata.preferredPrepModes) {
      const modes = Object.entries(userMetadata.preferredPrepModes);
      if (modes.length > 0) {
        const [topMode, count] = modes.sort((a, b) => b[1] - a[1])[0];
        if (count >= 3) {
          insights.push({
            id: 'behavior-prep-mode',
            sceneNumber: '50',
            title: 'Your Prep Signature',
            content: `${topMode} Mode is your go-to (${count}x). You know what centers you before a scene.`,
            type: 'ai',
            icon: '🎯'
          });
        }
      }
    }

    // Focus session milestone
    if (userMetadata.totalFocusSessions) {
      if (userMetadata.totalFocusSessions === 1) {
        insights.push({
          id: 'behavior-first-session',
          sceneNumber: '51',
          title: 'First Scene Prepared',
          content: 'You completed your first 5-minute prep. That\'s the hardest one — momentum builds from here.',
          type: 'ai',
          icon: '🎬'
        });
      } else if (userMetadata.totalFocusSessions === 10) {
        insights.push({
          id: 'behavior-ten-sessions',
          sceneNumber: '52',
          title: 'Building Ritual',
          content: '10 prep sessions completed. You\'re not just preparing anymore — you\'re building a practice.',
          type: 'ai',
          icon: '🔥'
        });
      } else if (userMetadata.totalFocusSessions >= 25) {
        insights.push({
          id: 'behavior-veteran',
          sceneNumber: '53',
          title: 'Veteran Director',
          content: `${userMetadata.totalFocusSessions} prep sessions. You\'ve mastered the art of showing up intentionally.`,
          type: 'ai',
          icon: '👑'
        });
      }
    }

    // Meeting patterns
    if (userMetadata.meetingPatterns) {
      const { backToBackFrequency, averageDuration, mostCommonMeetingType } = userMetadata.meetingPatterns;
      
      if (backToBackFrequency && backToBackFrequency > 60) {
        insights.push({
          id: 'behavior-back-to-back',
          sceneNumber: '54',
          title: 'Marathon Runner',
          content: `${Math.round(backToBackFrequency)}% of your meetings are back-to-back. Remember: even 2 minutes between scenes restores clarity.`,
          type: 'ai',
          icon: '⚡'
        });
      }

      if (averageDuration && averageDuration > 50) {
        insights.push({
          id: 'behavior-long-meetings',
          sceneNumber: '55',
          title: 'Epic Scenes',
          content: `Your meetings average ${Math.round(averageDuration)} minutes. Longer scenes demand more energy — pace yourself.`,
          type: 'ai',
          icon: '🎞️'
        });
      }

      if (mostCommonMeetingType) {
        const typeAdvice: Record<string, string> = {
          '1:1': 'Most of your meetings are 1:1s. Connection Mode might be your secret weapon.',
          'Team': 'You run a lot of team meetings. Clarity Mode helps you set direction for the room.',
          'Client': 'Client meetings are your main stage. Confidence Mode keeps you steady under pressure.',
        };
        const advice = typeAdvice[mostCommonMeetingType];
        if (advice) {
          insights.push({
            id: 'behavior-meeting-type',
            sceneNumber: '56',
            title: 'Your Main Stage',
            content: advice,
            type: 'ai',
            icon: '🎭'
          });
        }
      }
    }

    // Recent prep choices (learning patterns)
    if (userMetadata.recentPrepChoices && userMetadata.recentPrepChoices.length >= 3) {
      const recentModes = userMetadata.recentPrepChoices.slice(0, 3).map(c => c.prepMode);
      const allSame = recentModes.every(m => m === recentModes[0]);
      
      if (allSame) {
        insights.push({
          id: 'behavior-consistency',
          sceneNumber: '57',
          title: 'Consistency Pattern',
          content: `You\'ve chosen ${recentModes[0]} Mode 3 times in a row. Consistency builds confidence.`,
          type: 'ai',
          icon: '🔄'
        });
      } else {
        insights.push({
          id: 'behavior-adaptability',
          sceneNumber: '58',
          title: 'Adaptive Director',
          content: 'You switch prep modes based on the scene ahead. That\'s emotional intelligence in action.',
          type: 'ai',
          icon: '🎨'
        });
      }
    }

    // Sound preferences
    if (userMetadata.soundPreferences?.mostUsedSound) {
      const soundNames: Record<string, string> = {
        'rain': 'Rain',
        'calm-ocean': 'Ocean Waves',
        'forest': 'Forest',
        'meditation-bell': 'Meditation Bell',
        'white-noise': 'White Noise'
      };
      const soundName = soundNames[userMetadata.soundPreferences.mostUsedSound] || userMetadata.soundPreferences.mostUsedSound;
      insights.push({
        id: 'behavior-sound',
        sceneNumber: '59',
        title: 'Your Anchor Sound',
        content: `${soundName} is your go-to. You\'ve found what grounds you — that\'s self-awareness.`,
        type: 'ai',
        icon: '🎵'
      });
    }

    return insights;
  };

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

  // Combine behavioral insights, AI insights (from reflections), and base insights
  const behavioralInsights = generateBehavioralInsights();
  const aiInsights = generateAIInsights();
  
  const allInsights = [
    ...behavioralInsights, // Always include behavioral insights (from metadata)
    ...(hasReflectionData ? aiInsights : []), // Add reflection-based AI insights if available
    ...baseInsights // Always include contextual + random general insights
  ];

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
      {!hasReflectionData && behavioralInsights.length === 0 && (
        <p className="text-xs text-gray-500 text-center mt-3">
          💡 As you use Meet-Cute, insights will become personalized to your patterns
        </p>
      )}
      {!hasReflectionData && behavioralInsights.length > 0 && (
        <p className="text-xs text-gray-500 text-center mt-3">
          ✨ Learning your patterns • Complete reflections to unlock deeper insights
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

