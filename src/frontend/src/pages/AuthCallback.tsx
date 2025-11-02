import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    console.log('🔍 AuthCallback - Token received:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 20) + '...',
      allParams: Object.fromEntries(searchParams.entries()),
    });

    if (token) {
      localStorage.setItem('meetcute_token', token);
      console.log('✅ Token stored in localStorage');
      console.log('🚀 Navigating to /dashboard');
      navigate('/dashboard');
    } else {
      console.error('❌ No token found in URL, redirecting to landing page');
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🎬</div>
        <h2 className="text-2xl font-semibold text-gray-800">Completing setup...</h2>
      </div>
    </div>
  );
}

