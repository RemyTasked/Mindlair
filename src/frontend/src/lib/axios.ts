import axios from 'axios';

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: '', // Use relative URLs (same origin in production)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meetcute_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
    });

    // If 401, clear token and redirect to login
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing token');
      localStorage.removeItem('meetcute_token');
      // Don't redirect here - let the component handle it
    }

    return Promise.reject(error);
  }
);

export default api;

