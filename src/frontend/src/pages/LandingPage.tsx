import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LOGO_PATHS } from '../config/constants';
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';
import { Calendar, Sparkles, Mail, Moon, Sun, Star, Music, Heart, Brain } from 'lucide-react';
import CalDAVModal from '../components/CalDAVModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showCalDAVModal, setShowCalDAVModal] = useState(false);

  // Check if user is already logged in (PWA persistence)
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        // Check localStorage first
        let token = localStorage.getItem('meetcute_token');
        
        // If not in localStorage, check IndexedDB (PWA persistence)
        if (!token) {
          console.log('🔍 Checking IndexedDB for auth token...');
          token = await getToken();
        }
        
        if (token) {
          console.log('✅ Found existing auth token - redirecting to dashboard');
          localStorage.setItem('meetcute_token', token);
          localStorage.setItem('meetcute_session_active', 'true');
          navigate('/dashboard', { replace: true });
          return;
        }
        
        console.log('ℹ️ No existing auth token found - showing landing page');
      } catch (error) {
        console.error('⚠️ Error checking auth:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkExistingAuth();
  }, [navigate]);

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-teal-50 to-pink-100">
        <div className="text-center">
          <img
            src={LOGO_PATHS.main}
            alt="Meet Cute Logo"
            className="w-20 h-20 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-2xl font-semibold text-gray-800">Loading...</h2>
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

  const handleCalDAVAuth = () => {
    setShowCalDAVModal(true);
  };

  const handleCalDAVSuccess = () => {
    // Redirect to dashboard after successful connection
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-teal-50 to-pink-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-indigo-400/30 to-teal-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-pink-400/30 to-teal-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, -50, 0],
            x: [0, 30, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="container mx-auto px-6 py-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center items-center"
        >
          <div className="flex items-center gap-2">
            <motion.img
              src={LOGO_PATHS.main}
              alt="Meet Cute Logo"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-teal-600 to-pink-600 bg-clip-text text-transparent">
              Meet Cute
            </div>
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-indigo-200/80 to-teal-200/80 rounded-full backdrop-blur-sm"
          >
            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-700 to-teal-700 bg-clip-text text-transparent">
              🎬 5-minute pre-meeting preparation
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 via-teal-600 to-pink-600 bg-clip-text text-transparent leading-tight"
          >
            5 Minutes to Alignment
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto"
          >
            Your next scene deserves the best version of you.
          </motion.p>
          
          {/* Visual Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12 max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-br from-indigo-200/80 to-teal-200/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-4">
                <img 
                  src={LOGO_PATHS.main} 
                  alt="Meet Cute Logo" 
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                />
                <div className="text-left">
                  <div className="text-2xl font-bold text-indigo-900">Your Focus Scene</div>
                  <div className="text-indigo-700">5 minutes • Before every meeting</div>
                </div>
              </div>
              <div className="space-y-3 text-left bg-white rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <div className="font-semibold text-gray-800">5-Minute Pre-Meeting Prep</div>
                    <div className="text-gray-600 text-sm">Guided preparation ritual 5 minutes before every meeting - breathe, center, prepare</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <div className="font-semibold text-gray-800">Smart In-Meeting Cues</div>
                    <div className="text-gray-600 text-sm">
                      <strong className="text-indigo-700">Real-time composure cues</strong> delivered during your meeting to help you stay calm, focused, and present
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎵</div>
                  <div>
                    <div className="font-semibold text-gray-800">Calming Ambient Sounds</div>
                    <div className="text-gray-600 text-sm">Ocean waves, rain, white noise - pick what centers you</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
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

            <button
              onClick={handleWebexAuth}
              disabled={loading}
              aria-label="Sign in with Cisco Webex"
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-semibold disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#00BCF2"/>
                <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="#00BCF2"/>
                <path d="M2 12L12 17L22 12" stroke="#00BCF2" strokeWidth="2"/>
              </svg>
              Continue with Webex
            </button>

            <button
              onClick={handleCalDAVAuth}
              disabled={loading}
              aria-label="Sign in with Yahoo or iCloud Calendar"
              className="px-8 py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 font-semibold disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#6001D2"/>
                <path d="M13 11h-2v6h2v-6zm0-4h-2v2h2V7z" fill="white"/>
              </svg>
              Continue with Yahoo / iCloud
            </button>
          </motion.div>

          {/* CalDAV Modal */}
          <CalDAVModal
            isOpen={showCalDAVModal}
            onClose={() => setShowCalDAVModal(false)}
            onSuccess={handleCalDAVSuccess}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-sm text-gray-500">
              No app download required • Works with your existing calendar
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Read-only access
              </span>
              <span>•</span>
              <a href="/privacy" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Privacy Policy
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Presley Flow Section */}
      <section className="container mx-auto px-6 py-20 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-4">The Presley Flow</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          A complete daily rhythm mirroring cinematic storytelling
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border-2 border-yellow-200 shadow-lg"
          >
            <div className="text-4xl mb-3">☀️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Morning Prep</h3>
            <p className="text-sm text-gray-600 italic mb-2">"Opening Scene"</p>
            <p className="text-sm text-gray-700">
              Scene opens: sunlight filters in. Today unfolds at your direction.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 shadow-lg"
          >
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Daytime Flow</h3>
            <p className="text-sm text-gray-600 italic mb-2">"Scene-by-Scene"</p>
            <p className="text-sm text-gray-700">
              You're on in 5: Breathe and lead the moment. Pre-meeting cues with focus mode.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-teal-50 to-indigo-50 p-6 rounded-2xl border-2 border-teal-200 shadow-lg"
          >
            <div className="text-4xl mb-3">🌙</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Evening Flow</h3>
            <p className="text-sm text-gray-600 italic mb-2">"Presley Flow Session"</p>
            <p className="text-sm text-gray-700">
              Camera wraps — rest easy, the next act awaits. Daily wrap-up + tomorrow preview.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border-2 border-indigo-200 shadow-lg"
          >
            <div className="text-4xl mb-3">🌜</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Winding Down</h3>
            <p className="text-sm text-gray-600 italic mb-2">"Evening Wind-Down"</p>
            <p className="text-sm text-gray-700">
              No calls, no scripts—just space. Breathing and relaxation before sleep.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-teal-100 to-pink-100 rounded-2xl border-2 border-teal-300 shadow-xl"
        >
          <div className="text-center">
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Weekend — 'The Intermission'</h3>
            <p className="text-gray-700 text-lg italic mb-2">
              "The stage rests. You've earned the pause."
            </p>
            <p className="text-gray-600">
              Choose your reset tone: Calm, Creative, or Reflective. Intentional rest for no-meeting days.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20 relative z-10">
        <h2 className="text-4xl font-bold text-center mb-4">Beyond the Basics</h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          AI that learns and adapts to support you all day
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-teal-600" />}
            title="Adaptive Breathing"
            description="4 custom flows: Calm, Stressed, Focused, Unclear"
            isNew={true}
          />
          <FeatureCard
            icon={<Music className="w-8 h-8 text-teal-600" />}
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
            icon={<Mail className="w-8 h-8 text-indigo-600" />}
            title="Email + Push"
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
          <FeatureCard
            icon={<Sun className="w-8 h-8 text-yellow-600" />}
            title="Scene Library"
            description="Access focus sessions anytime"
          />
          <FeatureCard
            icon={<Moon className="w-8 h-8 text-teal-600" />}
            title="PWA Ready"
            description="Install on your phone like an app"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 bg-gradient-to-br from-indigo-100 via-teal-100 to-pink-100 rounded-3xl shadow-2xl max-w-6xl relative z-10 border border-white/50">
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
            number="💡"
            title="Stay Composed During"
            description="Receive smart in-meeting cues on your phone or desktop to help you stay calm, focused, and present throughout the conversation."
          />
          <Step
            number="✨"
            title="Walk Out Confident"
            description="Finish strong with post-meeting insights. The AI learns from your ratings and gets smarter over time."
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 p-8 bg-gradient-to-r from-white to-teal-50 rounded-2xl border-2 border-teal-300 shadow-xl"
        >
          <p className="text-center text-lg text-gray-800">
            <strong className="text-transparent bg-gradient-to-r from-teal-600 to-pink-600 bg-clip-text">The more you use it, the better it gets.</strong> AI learns which meeting types stress you and adapts your cues accordingly.
          </p>
        </motion.div>
      </section>

      {/* Security Banner */}
      <section className="container mx-auto px-6 py-12 relative z-10">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise-Grade Security</h3>
            <p className="text-gray-600">Your calendar data is safe with us</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <div className="font-semibold text-gray-900 text-sm">TLS 1.3 Encryption</div>
              <div className="text-xs text-gray-600">Bank-level security</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">👁️</div>
              <div className="font-semibold text-gray-900 text-sm">Read-Only Access</div>
              <div className="text-xs text-gray-600">We can't modify events</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔑</div>
              <div className="font-semibold text-gray-900 text-sm">OAuth 2.0</div>
              <div className="text-xs text-gray-600">Never see your password</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="font-semibold text-gray-900 text-sm">GDPR Compliant</div>
              <div className="text-xs text-gray-600">Your data, your control</div>
            </div>
          </div>
          <div className="text-center mt-6">
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
              Read our full Privacy & Security policy →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center text-gray-600">
        <p className="mb-4">Meet Cute · Cinematic-professional focus moments</p>
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy & Security</a>
          <span>·</span>
          <a href="mailto:support@meetcuteai.com" className="hover:text-indigo-600 transition-colors">Contact</a>
        </div>
        <p className="text-xs text-gray-500 max-w-2xl mx-auto mb-4">
          Meet Cute is a meeting preparation tool designed to help you focus and mentally prepare. 
          It is not a substitute for professional mental health care, therapy, or medical advice. 
          If you are experiencing mental health challenges, please consult a qualified healthcare provider.
        </p>
        <p className="text-sm">© 2025 Meet Cute. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, isNew }: { icon: React.ReactNode; title: string; description: string; isNew?: boolean }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="bg-gradient-to-br from-white to-indigo-50/50 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all relative group border border-indigo-100/50"
    >
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
          className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg"
        >
          NEW
        </motion.div>
      )}
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        {icon}
      </motion.div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.article>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex gap-6 items-start group"
    >
      <motion.div
        whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-teal-100 shadow-lg flex items-center justify-center text-4xl border-2 border-white"
      >
        {number}
      </motion.div>
      <div className="flex-1">
        <h4 className="text-2xl font-semibold mb-3 text-gray-900">{title}</h4>
        <p className="text-gray-700 text-lg leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

