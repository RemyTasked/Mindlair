import { useState } from 'react';
import api from '../lib/axios';
import { Calendar, Sparkles, Clock, Mail, Smartphone, Moon, Sun, Star, Music, Heart, Brain } from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/auth/google/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      setLoading(false);
    }
  };

  const handleMicrosoftAuth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/auth/microsoft/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Microsoft auth:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <div className="flex justify-center items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl" role="img" aria-label="Film camera emoji">🎬</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Meet Cute
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full">
            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              🧠 NEW: AI learns your stress patterns & adapts to support you
            </span>
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI That Understands Your Stress
          </h1>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            Meet Cute learns when meetings stress you most—then provides grounded, practical support.
            Adaptive breathing flows, wellness check-ins, and AI that gets smarter with every session.
            <strong className="text-gray-800"> Not just motivation. Real support.</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              aria-label="Sign in with Google Calendar"
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-semibold disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleMicrosoftAuth}
              disabled={loading}
              aria-label="Sign in with Microsoft Outlook"
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-semibold disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Continue with Outlook
            </button>
          </div>

          <p className="text-sm text-gray-500">
            No app download required • Works with your existing calendar
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">AI That Learns Your Patterns</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          The more you use it, the smarter it gets about what you need
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {/* NEW: Highlight mind state features */}
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-purple-600" />}
            title="🧠 Mind State Tracking"
            description="Tell us how you're feeling (calm, stressed, focused, unclear) and get adaptive breathing flows matched to your state"
            isNew={true}
          />
          <FeatureCard
            icon={<Heart className="w-8 h-8 text-red-500" />}
            title="💙 Wellness Check-Ins"
            description="Throughout the day, get personalized reminders to breathe, walk, or pause—based on your stress patterns"
            isNew={true}
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-indigo-600" />}
            title="✨ Pattern Recognition"
            description="AI learns which days, times, and meeting types stress you most—then provides extra support when you need it"
            isNew={true}
          />
          <FeatureCard
            icon={<Moon className="w-8 h-8 text-purple-600" />}
            title="Presley Flow"
            description="Evening mental rehearsal with insights about tomorrow's potentially stressful meetings"
          />
          <FeatureCard
            icon={<Sun className="w-8 h-8 text-yellow-600" />}
            title="Morning Recap"
            description="Wake up to personalized prep tips based on your typical stress patterns for the day ahead"
          />
          <FeatureCard
            icon={<Star className="w-8 h-8 text-indigo-600" />}
            title="Meeting Ratings"
            description="Rate your performance. AI learns what preparation style works best for you"
          />
          <FeatureCard
            icon={<Clock className="w-8 h-8 text-indigo-600" />}
            title="Focus Scene"
            description="5-minute guided preparation with breathing exercises and cinematic animations"
          />
          <FeatureCard
            icon={<Music className="w-8 h-8 text-purple-600" />}
            title="Ambient Sounds"
            description="Relaxing meditation audio: ocean waves, rain, forest, bells, or silence"
          />
          <FeatureCard
            icon={<Mail className="w-8 h-8 text-indigo-600" />}
            title="Email Delivery"
            description="Beautiful HTML emails with focus cues, evening sessions, and insights"
          />
          <FeatureCard
            icon={<Smartphone className="w-8 h-8 text-purple-600" />}
            title="SMS Alerts"
            description="Get notifications via text message. Perfect for on-the-go preparation"
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-indigo-600" />}
            title="Calendar Sync"
            description="Works with Google Calendar and Outlook. Auto-detects all your meetings"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-xl max-w-6xl">
        <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          AI that learns your stress patterns and adapts to support you
        </p>
        
        <div className="space-y-12">
          <Step
            number="🌙"
            title="Evening (8 PM): Smart Preparation"
            description="Get tomorrow's meeting preview with insights: 'Mondays are typically stressful for you—plan extra self-care' or 'You have a client meeting tomorrow, which you often find challenging.'"
          />
          <Step
            number="☀️"
            title="Morning (7 AM): Personalized Boost"
            description="Wake up to a message tailored to your patterns: 'You have morning meetings today, which can be stressful for you. Consider a calming routine.'"
          />
          <Step
            number="⏰"
            title="Pre-Meeting (5 min before): Adaptive Support"
            description="Receive grounded, practical cues based on your history. Open Focus Scene, select your mind state (calm/stressed/focused/unclear), and get a breathing flow matched to how you feel."
          />
          <Step
            number="🧘"
            title="Throughout Day: Wellness Check-Ins"
            description="Get personalized reminders to breathe, walk, or pause—timed based on your stress patterns. High-stress users get more breathing prompts. Afternoon slumps trigger walk suggestions."
          />
          <Step
            number="⭐"
            title="Post-Meeting: Learn & Improve"
            description="Rate your meeting. AI analyzes patterns: Which meeting types stress you? Which days? Which times? Then uses this data to provide better support next time."
          />
        </div>

        <div className="mt-16 p-8 bg-white rounded-2xl border-2 border-purple-200">
          <p className="text-center text-lg text-gray-700 mb-2">
            <strong className="text-purple-600">Real support, not just motivation.</strong>
          </p>
          <p className="text-center text-gray-600">
            After 10+ rated meetings, Meet Cute knows your patterns: "Team meetings are stressful 80% of the time for you. Here's a specific strategy..."
            Instead of generic "You've got this!", you get practical, grounded support based on your actual experience.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center text-gray-600">
        <p className="mb-4">Meet Cute · Cinematic-professional focus moments</p>
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="mailto:support@meetcuteai.com" className="hover:text-indigo-600 transition-colors">Contact</a>
        </div>
        <p className="text-sm">© 2025 Meet Cute. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, isNew }: { icon: React.ReactNode; title: string; description: string; isNew?: boolean }) {
  return (
    <article className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all relative group">
      {isNew && (
        <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
          NEW
        </div>
      )}
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </article>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start group">
      <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="text-2xl font-semibold mb-3 text-gray-800">{title}</h4>
        <p className="text-gray-600 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

