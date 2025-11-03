import { useState } from 'react';
import api from '../lib/axios';
import { Calendar, Sparkles, Mail, Moon, Sun, Star, Music, Heart, Brain } from 'lucide-react';

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
              🎬 5-minute pre-meeting preparation
            </span>
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Enter Every Meeting Centered
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            5 minutes before your meeting, get an AI cue + guided breathing + ambient sounds.
            <strong className="text-gray-800"> Walk in prepared, not panicked.</strong>
          </p>
          
          {/* Visual Preview */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-5xl">🎬</div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-indigo-900">Your Focus Scene</div>
                  <div className="text-indigo-700">5 minutes • Before every meeting</div>
                </div>
              </div>
              <div className="space-y-3 text-left bg-white rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">1️⃣</div>
                  <div>
                    <div className="font-semibold text-gray-800">AI Cue</div>
                    <div className="text-gray-600 text-sm">Personalized prep message based on your patterns</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">2️⃣</div>
                  <div>
                    <div className="font-semibold text-gray-800">Mind State Check</div>
                    <div className="text-gray-600 text-sm">Select: Calm, Stressed, Focused, or Unclear</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">3️⃣</div>
                  <div>
                    <div className="font-semibold text-gray-800">Adaptive Breathing</div>
                    <div className="text-gray-600 text-sm">Custom flow matched to your state + ambient sounds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
        <h2 className="text-4xl font-bold text-center mb-4">Beyond the 5-Minute Prep</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          AI that learns and adapts to support you all day
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-purple-600" />}
            title="Adaptive Breathing"
            description="4 custom flows: Calm, Stressed, Focused, Unclear"
            isNew={true}
          />
          <FeatureCard
            icon={<Music className="w-8 h-8 text-purple-600" />}
            title="Ambient Sounds"
            description="Ocean, rain, forest, bells, or silence"
            isNew={true}
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-indigo-600" />}
            title="AI Pattern Learning"
            description="Learns your stress triggers and adapts"
            isNew={true}
          />
          <FeatureCard
            icon={<Heart className="w-8 h-8 text-red-500" />}
            title="Daily Wellness"
            description="Reminders to breathe, walk, or pause"
          />
          <FeatureCard
            icon={<Moon className="w-8 h-8 text-purple-600" />}
            title="Evening Prep"
            description="Preview tomorrow with stress insights"
          />
          <FeatureCard
            icon={<Sun className="w-8 h-8 text-yellow-600" />}
            title="Morning Boost"
            description="Wake up with personalized confidence"
          />
          <FeatureCard
            icon={<Mail className="w-8 h-8 text-indigo-600" />}
            title="Email + SMS"
            description="Get cues however you prefer"
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-indigo-600" />}
            title="Auto-Sync"
            description="Google Calendar & Outlook"
          />
          <FeatureCard
            icon={<Star className="w-8 h-8 text-indigo-600" />}
            title="Meeting Ratings"
            description="Rate meetings, AI improves"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-xl max-w-6xl">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        
        <div className="space-y-8">
          <Step
            number="📧"
            title="Get the Cue"
            description="5 minutes before your meeting, receive an email or SMS with your personalized AI prep message."
          />
          <Step
            number="🎬"
            title="Open Focus Scene"
            description="Click the link. Select your mind state. Get a custom breathing flow (2-3 min) with ambient sounds."
          />
          <Step
            number="✨"
            title="Walk In Ready"
            description="Enter the meeting centered, not scattered. The AI learns from your ratings and gets smarter over time."
          />
        </div>

        <div className="mt-16 p-8 bg-white rounded-2xl border-2 border-purple-200">
          <p className="text-center text-lg text-gray-700">
            <strong className="text-purple-600">The more you use it, the better it gets.</strong> AI learns which meeting types stress you and adapts your cues accordingly.
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

