import axios from 'axios';
import { getToken, removeToken } from '../utils/persistentStorage';

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: '', // Use relative URLs (same origin in production)
  timeout: 10000, // 10 second timeout to prevent hanging when backend is down
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token (check both localStorage and IndexedDB)
api.interceptors.request.use(
  async (config) => {
    // Try localStorage first (fast)
    let token = localStorage.getItem('meetcute_token');
    
    // If not in localStorage, check IndexedDB (PWA persistence)
    if (!token) {
      console.log('🔍 Token not in localStorage, checking IndexedDB...');
      token = await getToken();
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
      tokenSource: localStorage.getItem('meetcute_token') ? 'localStorage' : 'IndexedDB',
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

    // If 401, clear token from all storage and redirect to login
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing token from all storage');
      removeToken(); // Clear from both localStorage and IndexedDB
      // Don't redirect here - let the component handle it
    }

    return Promise.reject(error);
  }
);

export default api;

