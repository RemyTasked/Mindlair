/**
 * Mind Garden - Landing Page
 * 
 * A calm, nature-inspired landing page focused on mental wellness.
 * Features the garden growing metaphor and calendar-integrated wellness.
 * 
 * Performance optimized: CSS animations over JS, reduced motion, no infinite loops
 */

import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';
import { Leaf, Sparkles, Calendar, Music, Heart, Wind, Sun, Moon, ChevronDown, Chrome, Globe } from 'lucide-react';
import CalDAVModal from '../components/CalDAVModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMoreCalendars, setShowMoreCalendars] = useState(false);
  const [showCalDAVModal, setShowCalDAVModal] = useState(false);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        let token = localStorage.getItem('meetcute_token');
        
        if (!token) {
          token = await getToken();
        }
        
        if (token) {
          localStorage.setItem('meetcute_token', token);
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkExistingAuth();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-teal-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌱</div>
          <p className="text-emerald-700">Loading...</p>
        </div>
      </div>
    );
  }

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

  const handleWebexAuth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/auth/webex/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Webex auth:', error);
      setLoading(false);
    }
  };

  const handleCalDAVSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Ambient Background - CSS animations for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 text-6xl opacity-30 animate-float-slow">🌿</div>
        <div className="absolute top-40 right-20 text-5xl opacity-25 animate-float-medium">🌸</div>
        <div className="absolute bottom-40 left-1/4 text-4xl opacity-20 animate-float-fast">🦋</div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/20" />
      </div>

      {/* Header */}
      <header className="container mx-auto px-6 py-8 relative z-10">
        <div className="flex justify-center items-center gap-3 animate-fade-in">
          <span className="text-4xl">🌱</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Mind Garden
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 animate-fade-in">
            <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              Grow your mental wellness, one moment at a time
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up">
            Cultivate Calm.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Watch Your Garden Grow.
            </span>
          </h2>

          <p className="text-xl text-gray-600 mb-10 leading-relaxed animate-fade-in-up animation-delay-100">
            Micro-moments of mindfulness throughout your day. 
            Each breath, each flow, each moment of calm plants a seed in your personal garden.
          </p>

          {/* Browser Extension Feature */}
          <div className="mb-12 animate-fade-in-up animation-delay-200">
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
              {/* Static gradient orbs - no animation for perf */}
              <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
              </div>

              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 backdrop-blur-sm rounded-full text-emerald-100 text-xs font-medium mb-4 border border-emerald-400/20">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Most Popular
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-bold mb-6 leading-tight">
                    Wellness Right in<br/>Your Calendar
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                      <Calendar className="w-5 h-5 text-emerald-300" />
                      <span className="text-xs font-medium text-emerald-50">Smart Nudges</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                      <Wind className="w-5 h-5 text-emerald-300" />
                      <span className="text-xs font-medium text-emerald-50">2-Min Resets</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                      <Leaf className="w-5 h-5 text-emerald-300" />
                      <span className="text-xs font-medium text-emerald-50">Grow Daily</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                      <Music className="w-5 h-5 text-emerald-300" />
                      <span className="text-xs font-medium text-emerald-50">Focus Audio</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <a
                      href="https://chrome.google.com/webstore/detail/mind-garden"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-900 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg text-sm"
                    >
                      <Chrome className="w-4 h-4" />
                      Add to Chrome
                    </a>
                    <a
                      href="https://addons.mozilla.org/firefox/addon/mind-garden"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-800/50 text-white border border-emerald-400/30 rounded-xl font-medium hover:bg-emerald-800/70 transition-all backdrop-blur-sm text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      Firefox
                    </a>
                  </div>
                  <p className="text-emerald-200/70 text-xs mt-3 text-center md:text-left">
                    💻 Desktop only · On mobile? Use our web app — add to home screen for the full experience!
                  </p>
                </div>

                {/* Right: Mockup (Compact) - removed backdrop-blur for perf */}
                <div className="hidden md:block relative">
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/20 shadow-2xl w-full max-w-[320px] mx-auto">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-lg">🌱</div>
                        <div>
                          <div className="text-white font-semibold text-sm">Mind Garden</div>
                          <div className="text-emerald-200 text-[10px]">Thriving · 12 day streak</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                          <span className="text-amber-100 text-[10px] font-medium uppercase tracking-wider">Up Next</span>
                        </div>
                        <div className="text-white font-medium text-sm">Team Sync</div>
                        <div className="text-white/60 text-[10px]">Starts in 5 min</div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-2.5 shadow-lg flex items-center justify-between cursor-pointer hover:brightness-110 transition-all">
                        <div className="flex items-center gap-2">
                          <Wind className="w-3.5 h-3.5 text-white" />
                          <span className="text-white font-bold text-xs">Quick Focus</span>
                        </div>
                        <span className="text-white/80 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">2 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Garden Preview */}
          <div className="mb-12 bg-white/60 rounded-3xl p-8 shadow-xl border border-emerald-100 animate-fade-in-up animation-delay-300">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center">
                  <Sun className="w-8 h-8 text-amber-600" />
                </div>
                <p className="font-medium text-gray-800">Morning Flow</p>
                <p className="text-sm text-gray-500">Start with intention</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-medium text-gray-800">Micro-Flows</p>
                <p className="text-sm text-gray-500">2-5 min resets</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                  <Moon className="w-8 h-8 text-slate-600" />
                </div>
                <p className="font-medium text-gray-800">Evening Wind-Down</p>
                <p className="text-sm text-gray-500">Rest and reflect</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Your garden grows with every moment of mindfulness</span>
            </div>
          </div>

          {/* Auth Buttons - Primary */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4 animate-fade-in-up animation-delay-400">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-medium disabled:opacity-50"
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
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-medium disabled:opacity-50"
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

          {/* More Calendar Options - Visible on mobile */}
          <div className="mb-6">
            <button
              onClick={() => setShowMoreCalendars(!showMoreCalendars)}
              className="px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all flex items-center gap-2 mx-auto font-medium text-sm"
            >
              More sign-in options
              <ChevronDown className={`w-4 h-4 transition-transform ${showMoreCalendars ? 'rotate-180' : ''}`} />
            </button>

            {showMoreCalendars && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <button
                  onClick={handleWebexAuth}
                  disabled={loading}
                  className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#00BCF2"/>
                    <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="#00BCF2"/>
                    <path d="M2 12L12 17L22 12" stroke="#00BCF2" strokeWidth="2"/>
                  </svg>
                  Continue with Webex
                </button>

                <button
                  onClick={() => setShowCalDAVModal(true)}
                  disabled={loading}
                  className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/>
                    <path d="M3 10H21" stroke="#6B7280" strokeWidth="2"/>
                    <path d="M8 2V6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M16 2V6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  iCloud / Yahoo / Other
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 animate-fade-in animation-delay-600">
            Connect your calendar for smart, contextual wellness moments
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16 relative z-10">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Nurture Your Mental Wellness
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Wind className="w-7 h-7 text-sky-500" />}
            title="Guided Flows"
            description="Breathing exercises and micro-meditations tailored to your day"
          />
          <FeatureCard
            icon={<Calendar className="w-7 h-7 text-teal-500" />}
            title="Calendar Smart"
            description="Contextual wellness based on your schedule and stress patterns"
          />
          <FeatureCard
            icon={<Heart className="w-7 h-7 text-rose-500" />}
            title="Serenity Games"
            description="Playful activities that reduce anxiety and build focus"
          />
          <FeatureCard
            icon={<Music className="w-7 h-7 text-cyan-500" />}
            title="Spotify Integration"
            description="Calming playlists that complement your wellness practice"
          />
        </div>
      </section>

      {/* Garden Preview */}
      <section className="container mx-auto px-6 py-16 relative z-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl p-8 sm:p-12 border border-emerald-200">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Watch Your Progress Bloom
            </h3>
            <p className="text-gray-600">
              Every wellness activity grows your personal garden. Track your journey visually.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-8">
            {['🌱', '🌿', '🌷', '🌻', '🌳'].map((emoji, i) => (
              <div
                key={i}
                className="aspect-square bg-white/60 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
              >
                {emoji}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="px-3 py-1 bg-white/60 rounded-full text-emerald-700">
              🌬️ Breathing = Bamboo
            </span>
            <span className="px-3 py-1 bg-white/60 rounded-full text-amber-700">
              ✨ Gratitude = Golden Flowers
            </span>
            <span className="px-3 py-1 bg-white/60 rounded-full text-rose-700">
              🧘 Meditation = Lotus
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">🌱</span>
          <span className="text-lg font-semibold text-gray-700">Mind Garden</span>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Cultivating calm, one moment at a time
        </p>
        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <a href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-emerald-600 transition-colors">Terms</a>
        </div>
        <p className="text-xs text-gray-400 mt-6 max-w-lg mx-auto">
          Mind Garden is a wellness tool, not a replacement for professional mental health care.
        </p>
      </footer>

      {/* CalDAV Modal */}
      <CalDAVModal
        isOpen={showCalDAVModal}
        onClose={() => setShowCalDAVModal(false)}
        onSuccess={handleCalDAVSuccess}
      />
    </div>
  );
}

const FeatureCard = memo(function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/70 rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
      <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
});
