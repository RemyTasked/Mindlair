import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveToken } from '../utils/persistentStorage';
import { LOGO_PATHS } from '../config/constants';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-teal-50">
      <div className="text-center">
        <img
          src={LOGO_PATHS.main}
          alt="Meet Cute Logo"
          className="w-20 h-20 mx-auto mb-4 animate-pulse"
        />
        <h2 className="text-2xl font-semibold text-gray-800">Completing setup...</h2>
      </div>
    </div>
  );
}

