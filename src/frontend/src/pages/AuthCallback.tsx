import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveToken } from '../utils/persistentStorage';
import api from '../lib/axios';
import Logo from '../components/Logo';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      
      console.log('🔍 AuthCallback - Received:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token?.substring(0, 20) + '...',
        error: error,
        fullUrl: window.location.href,
        allParams: Object.fromEntries(searchParams.entries()),
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        alert(`Authentication error: ${error}`);
        navigate('/');
        return;
      }

      if (token) {
        try {
          // Save token to both localStorage AND IndexedDB for PWA persistence
          await saveToken(token);
          localStorage.setItem('meetcute_session_active', 'true'); // Mark session as active
          console.log('✅ Token stored in persistent storage (localStorage + IndexedDB)');
          
          // Verify token was stored
          const storedToken = localStorage.getItem('meetcute_token');
          console.log('✅ Verified token in localStorage:', {
            stored: !!storedToken,
            matches: storedToken === token,
          });
          
          // Check for referral code and link it to the user
          const referralCode = localStorage.getItem('mindgarden_referral_code');
          if (referralCode) {
            try {
              console.log('🌱 Linking referral code:', referralCode);
              const response = await api.post('/api/auth/link-referral', { referralCode });
              if (response.data.success) {
                console.log('✅ Referral linked:', response.data.message);
                // Store flag to show gift message in onboarding
                localStorage.setItem('mindgarden_has_referral_gift', 'true');
              } else {
                console.log('ℹ️ Referral not linked:', response.data.message);
              }
            } catch (refErr) {
              console.warn('⚠️ Could not link referral:', refErr);
            }
            // Clear the referral code regardless of success
            localStorage.removeItem('mindgarden_referral_code');
          }
          
          console.log('🚀 Navigating to /dashboard');
          navigate('/dashboard', { replace: true });
        } catch (err) {
          console.error('❌ Error storing token:', err);
          alert('Failed to save authentication. Please try again.');
          navigate('/');
        }
      } else {
        console.error('❌ No token found in URL params');
        console.error('Full URL:', window.location.href);
        console.error('Search params:', window.location.search);
        alert('Authentication failed: No token received. Please try again.');
        navigate('/');
      }
    };

    handleAuth();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-50">
      <div className="text-center">
        <div className="mx-auto mb-4">
          <Logo size="lg" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800">Completing setup...</h2>
      </div>
    </div>
  );
}

