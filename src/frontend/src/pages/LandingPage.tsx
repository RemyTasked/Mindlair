import { useState } from 'react';
import axios from 'axios';
import { Calendar, Sparkles, Clock, Mail, MessageSquare, Smartphone } from 'lucide-react';

export default function LandingPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/google/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      setLoading(false);
    }
  };

  const handleMicrosoftAuth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/microsoft/url');
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
            <div className="text-3xl">🎬</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Meet Cute
            </h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Transform Your Pre-Meeting Ritual
          </h2>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            Meet Cute is an AI-enhanced pre-meeting ritual that helps you mentally prepare 
            five minutes before every meeting. Turn routine calendar alerts into 
            cinematic-professional focus moments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
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
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Calendar className="w-8 h-8 text-indigo-600" />}
            title="Calendar Sync"
            description="Automatically detects meetings from Google Calendar or Outlook"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-purple-600" />}
            title="AI-Powered Cues"
            description="Personalized messages that help you focus and prepare"
          />
          <FeatureCard
            icon={<Clock className="w-8 h-8 text-indigo-600" />}
            title="Focus Scene"
            description="5-minute guided experience with breathing and reflection"
          />
          <FeatureCard
            icon={<Mail className="w-8 h-8 text-purple-600" />}
            title="Email Delivery"
            description="Beautiful pre-meeting cues delivered to your inbox"
          />
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8 text-indigo-600" />}
            title="Slack Integration"
            description="Get alerts where you already work"
          />
          <FeatureCard
            icon={<Smartphone className="w-8 h-8 text-purple-600" />}
            title="SMS Alerts"
            description="Optional text messages for on-the-go prep"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 bg-white rounded-3xl shadow-xl max-w-5xl">
        <h3 className="text-4xl font-bold text-center mb-16">How It Works</h3>
        
        <div className="space-y-12">
          <Step
            number="1"
            title="Connect Your Calendar"
            description="Link your Google or Outlook calendar in seconds"
          />
          <Step
            number="2"
            title="Get Pre-Meeting Cues"
            description="5 minutes before each meeting, receive a personalized focus message"
          />
          <Step
            number="3"
            title="Enter Focus Scene"
            description="Optional: Click to open a guided 5-minute preparation experience"
          />
          <Step
            number="4"
            title="Step In Ready"
            description="Join your meeting centered, confident, and clear"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center text-gray-600">
        <p className="mb-4">Meet Cute · Cinematic-professional focus moments</p>
        <p className="text-sm">© 2025 Meet Cute. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
        {number}
      </div>
      <div>
        <h4 className="text-2xl font-semibold mb-2">{title}</h4>
        <p className="text-gray-600 text-lg">{description}</p>
      </div>
    </div>
  );
}

