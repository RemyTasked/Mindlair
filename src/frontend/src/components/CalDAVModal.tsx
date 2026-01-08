/**
 * CalDAV Connection Modal
 * For Yahoo Calendar, iCloud Calendar, and other CalDAV providers
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import api from '../lib/axios';
import { saveToken } from '../utils/persistentStorage';

interface CalDAVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CalDAVModal({ isOpen, onClose, onSuccess }: CalDAVModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the signin endpoint that creates user + returns JWT token
      const response = await api.post('/api/auth/caldav/signin', {
        email,
        password,
      });

      const { token, provider } = response.data;

      // Store token in both localStorage AND IndexedDB for PWA persistence
      await saveToken(token);
      localStorage.setItem('meetcute_session_active', 'true');

      console.log('✅ CalDAV signin successful:', {
        provider,
        tokenStored: !!localStorage.getItem('meetcute_token'),
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess(); // Navigate to dashboard
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('CalDAV signin error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to connect. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setPassword('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Connect Calendar</h3>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Connected!</h4>
                  <p className="text-gray-600">Your calendar has been connected successfully.</p>
                </motion.div>
              ) : (
                <>
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Yahoo, iCloud, or CalDAV Calendar
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Enter your email and app password to connect your calendar.
                    </p>
                    
                    {/* Info box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <p className="font-semibold mb-1">Need an app password?</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Yahoo:</strong> Account Security → Generate app password</li>
                            <li><strong>iCloud:</strong> Apple ID → App-Specific Passwords</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@yahoo.com"
                          required
                          disabled={loading}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Password input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        App Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••••••"
                          required
                          disabled={loading}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use an app-specific password, not your regular password
                      </p>
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                      </motion.div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect Calendar'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

