/**
 * Mind Garden - Settings Page
 * 
 * Clean, simple settings organized into logical sections:
 * - Flow Preferences
 * - Notifications  
 * - Calendar Connections
 * - Account
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { Save, ChevronDown, ChevronUp, Bell, Calendar, Leaf, User, Plus, Smartphone, CheckCircle2, XCircle, Send, AlertTriangle } from 'lucide-react';
import { pushNotificationService } from '../services/pushNotificationService';
import DashboardLayout from '../components/Garden/DashboardLayout';

interface Preferences {
  // Flow settings
  enableMorningFlow: boolean;
  morningFlowTime: string;
  enableEveningFlow: boolean;
  eveningFlowTime: string;
  enableVoiceNarration: boolean;
  enableFocusSound: boolean;
  focusSoundType: string;
  // Notification settings
  enableNotifications: boolean;
  notificationChannel: 'push' | 'email' | 'none';
  quietHoursStart: string;
  quietHoursEnd: string;
  enableWellnessReminders: boolean;
  wellnessReminderFrequency: number;
  // New notification types
  enableMeetingReminders: boolean;
  enableWellnessCues: boolean;
  enableWeeklyRecap: boolean;
}

interface CalendarAccount {
  id: string;
  provider: string;
  email: string;
  label: string;
  isPrimary: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['flows']));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  const [preferences, setPreferences] = useState<Preferences>({
    enableMorningFlow: true,
    morningFlowTime: '07:00',
    enableEveningFlow: true,
    eveningFlowTime: '21:00',
    enableVoiceNarration: true,
    enableFocusSound: true,
    focusSoundType: 'calm-ocean',
    enableNotifications: true,
    notificationChannel: 'push',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    enableWellnessReminders: true,
    wellnessReminderFrequency: 3,
    enableMeetingReminders: true,
    enableWellnessCues: true,
    enableWeeklyRecap: true,
  });
  
  // PWA and notification status
  const [isPWA, setIsPWA] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);

  useEffect(() => {
    loadSettings();
    checkPWAStatus();
    checkNotificationStatus();
  }, []);
  
  const checkPWAStatus = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsPWA(isStandalone);
  };
  
  const checkNotificationStatus = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(Notification.permission);
    
    const subscribed = await pushNotificationService.isSubscribed();
    setIsSubscribed(subscribed);
  };
  
  const handleSendTestNotification = async () => {
    setSendingTest(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
      if (!token) {
        setTestResult('error');
        return;
      }
      
      const success = await pushNotificationService.sendTestNotification(token);
      setTestResult(success ? 'success' : 'error');
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult('error');
    } finally {
      setSendingTest(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };
  
  const handleEnableNotifications = async () => {
    try {
      const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
      if (!token) return;
      
      const success = await pushNotificationService.subscribe(token);
      if (success) {
        setNotificationPermission('granted');
        setIsSubscribed(true);
        setMessage('Notifications enabled!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setMessage('Failed to enable notifications');
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await api.get('/api/user/profile');
      
      if (response.data.user.email) {
        setUserEmail(response.data.user.email);
      }
      if (response.data.user.preferences) {
        setPreferences(prev => ({ ...prev, ...response.data.user.preferences }));
      }
      if (response.data.user.calendarAccounts) {
        setCalendarAccounts(response.data.user.calendarAccounts);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await api.put('/api/user/preferences', preferences);
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const response = await api.get('/api/auth/google/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Google auth:', error);
    }
  };

  const connectMicrosoftCalendar = async () => {
    try {
      const response = await api.get('/api/auth/microsoft/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Microsoft auth:', error);
    }
  };

  const connectWebexCalendar = async () => {
    try {
      const response = await api.get('/api/auth/webex/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Webex auth:', error);
    }
  };

  const [showCalDAVModal, setShowCalDAVModal] = useState(false);
  const [caldavForm, setCaldavForm] = useState({
    serverUrl: '',
    username: '',
    password: '',
    calendarName: '',
  });

  const connectCalDAV = async () => {
    try {
      await api.post('/api/auth/caldav/connect', caldavForm);
      setShowCalDAVModal(false);
      setCaldavForm({ serverUrl: '', username: '', password: '', calendarName: '' });
      await loadSettings();
      setMessage('CalDAV calendar connected!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error connecting CalDAV:', error);
      setMessage('Error connecting calendar');
    }
  };

  const handleDisconnectCalendar = async (accountId: string) => {
    if (!window.confirm('Disconnect this calendar? You can reconnect anytime.')) return;

    try {
      await api.delete(`/api/auth/calendar/${accountId}`);
      await loadSettings();
      setMessage('Calendar disconnected');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account?\n\n' +
      'This will permanently delete all your data and cannot be undone.'
    );

    if (!confirmed) return;

    const confirmation = window.prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') return;

    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) return;

      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      await api.delete('/api/auth/account', { data: { userId: decoded.userId } });
      
      localStorage.clear();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  return (
    <DashboardLayout activeSection="settings">
      <div className="p-4 md:p-8 pb-32 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)]">Settings</h1>
            <p className="text-[var(--mg-text-secondary)] text-sm">Customize your Mind Garden experience</p>
          </div>
          
          <div className="flex items-center gap-3">
            {message && (
              <span className={`text-sm font-medium ${
                message.includes('Error') ? 'text-red-400' : 'text-teal-400'
              }`}>
                {message}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Flow Preferences */}
          <Section
            id="flows"
            title="Flow Preferences"
            icon={<Leaf className="w-5 h-5 text-teal-600" />}
            isExpanded={expandedSections.has('flows')}
            onToggle={toggleSection}
          >
            <div className="space-y-6">
              <Toggle
                label="Morning Flow"
                description="Start your day with intention"
                checked={preferences.enableMorningFlow}
                onChange={(checked) => setPreferences({ ...preferences, enableMorningFlow: checked })}
              />
              
              {preferences.enableMorningFlow && (
                <div className="ml-6 pl-4 border-l-2 border-teal-500/30">
                  <label className="block text-sm font-medium text-[var(--mg-text-secondary)] mb-2">
                    Morning Flow Time
                  </label>
                  <input
                    type="time"
                    value={preferences.morningFlowTime}
                    onChange={(e) => setPreferences({ ...preferences, morningFlowTime: e.target.value })}
                    className="px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-[var(--mg-text-primary)]"
                  />
                </div>
              )}

              <Toggle
                label="Evening Wind-Down"
                description="End your day with reflection"
                checked={preferences.enableEveningFlow}
                onChange={(checked) => setPreferences({ ...preferences, enableEveningFlow: checked })}
              />
              
              {preferences.enableEveningFlow && (
                <div className="ml-6 pl-4 border-l-2 border-teal-500/30">
                  <label className="block text-sm font-medium text-[var(--mg-text-secondary)] mb-2">
                    Evening Flow Time
                  </label>
                  <input
                    type="time"
                    value={preferences.eveningFlowTime}
                    onChange={(e) => setPreferences({ ...preferences, eveningFlowTime: e.target.value })}
                    className="px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-[var(--mg-text-primary)]"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-[var(--mg-border)]">
                <Toggle
                  label="Voice Guidance"
                  description="Spoken instructions during flows"
                  checked={preferences.enableVoiceNarration}
                  onChange={(checked) => setPreferences({ ...preferences, enableVoiceNarration: checked })}
                />
              </div>

              <Toggle
                label="Ambient Sound"
                description="Background audio during flows"
                checked={preferences.enableFocusSound}
                onChange={(checked) => setPreferences({ ...preferences, enableFocusSound: checked })}
              />
              
              {preferences.enableFocusSound && (
                <div className="ml-6 pl-4 border-l-2 border-teal-500/30">
                  <label className="block text-sm font-medium text-[var(--mg-text-secondary)] mb-2">
                    Sound Type
                  </label>
                  <select
                    value={preferences.focusSoundType}
                    onChange={(e) => setPreferences({ ...preferences, focusSoundType: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-[var(--mg-text-primary)]"
                  >
                    <option value="calm-ocean">Calm Ocean</option>
                    <option value="rain">Gentle Rain</option>
                    <option value="forest">Forest</option>
                    <option value="white-noise">White Noise</option>
                    <option value="none">Silence</option>
                  </select>
                </div>
              )}
            </div>
          </Section>

          {/* Notifications */}
          <Section
            id="notifications"
            title="Notifications"
            icon={<Bell className="w-5 h-5 text-amber-600" />}
            isExpanded={expandedSections.has('notifications')}
            onToggle={toggleSection}
          >
            <div className="space-y-6">
              {/* PWA & Notification Status */}
              <div className="p-4 bg-[var(--mg-bg-primary)] rounded-xl space-y-3">
                <h4 className="font-medium text-[var(--mg-text-primary)] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-teal-400" />
                  App Status
                </h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--mg-text-muted)]">Installation</span>
                  <span className={`flex items-center gap-1.5 font-medium ${isPWA ? 'text-teal-400' : 'text-[var(--mg-text-muted)]'}`}>
                    {isPWA ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Installed as App
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Running in Browser
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--mg-text-muted)]">Push Notifications</span>
                  <span className={`flex items-center gap-1.5 font-medium ${
                    notificationPermission === 'granted' && isSubscribed ? 'text-teal-400' : 
                    notificationPermission === 'denied' ? 'text-red-400' : 'text-[var(--mg-text-muted)]'
                  }`}>
                    {notificationPermission === 'unsupported' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Not Supported
                      </>
                    ) : notificationPermission === 'denied' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Blocked
                      </>
                    ) : notificationPermission === 'granted' && isSubscribed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Not Enabled
                      </>
                    )}
                  </span>
                </div>
                
                {notificationPermission === 'denied' && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/30">
                    Notifications are blocked. Please enable them in your browser settings for this site.
                  </p>
                )}
                
                {notificationPermission !== 'granted' && notificationPermission !== 'denied' && notificationPermission !== 'unsupported' && (
                  <button
                    onClick={handleEnableNotifications}
                    className="w-full py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors font-medium text-sm"
                  >
                    Enable Push Notifications
                  </button>
                )}
                
                {notificationPermission === 'granted' && isSubscribed && (
                  <button
                    onClick={handleSendTestNotification}
                    disabled={sendingTest}
                    className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg transition-colors font-medium text-sm ${
                      testResult === 'success' ? 'bg-teal-500/20 text-teal-400' :
                      testResult === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-[var(--mg-bg-card)] border border-[var(--mg-border)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-bg-primary)]'
                    }`}
                  >
                    {sendingTest ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : testResult === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Test Sent!
                      </>
                    ) : testResult === 'error' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Failed to Send
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Test Notification
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <Toggle
                label="Enable Notifications"
                description="Receive reminders for flows and wellness check-ins"
                checked={preferences.enableNotifications}
                onChange={(checked) => setPreferences({ ...preferences, enableNotifications: checked })}
              />

              {preferences.enableNotifications && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--mg-text-secondary)] mb-2">
                      Notification Method
                    </label>
                    <select
                      value={preferences.notificationChannel}
                      onChange={(e) => setPreferences({ ...preferences, notificationChannel: e.target.value as any })}
                      className="w-full px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-[var(--mg-text-primary)]"
                    >
                      <option value="push">Push Notifications</option>
                      <option value="email">Email</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  
                  {/* Notification Type Toggles */}
                  <div className="pt-4 border-t border-[var(--mg-border)]">
                    <h4 className="font-medium text-[var(--mg-text-primary)] mb-4">Notification Types</h4>
                    <div className="space-y-4">
                      <Toggle
                        label="Meeting Reminders"
                        description="Get notified 10 minutes before meetings with a suggested flow"
                        checked={preferences.enableMeetingReminders}
                        onChange={(checked) => setPreferences({ ...preferences, enableMeetingReminders: checked })}
                      />
                      
                      <Toggle
                        label="Wellness Cues"
                        description="Gentle reminders to take mindful breaks throughout the day"
                        checked={preferences.enableWellnessCues}
                        onChange={(checked) => setPreferences({ ...preferences, enableWellnessCues: checked })}
                      />
                      
                      <Toggle
                        label="Weekly Recap"
                        description="Sunday summary of your wellness journey and garden growth"
                        checked={preferences.enableWeeklyRecap}
                        onChange={(checked) => setPreferences({ ...preferences, enableWeeklyRecap: checked })}
                      />
                    </div>
                  </div>

                  <Toggle
                    label="Wellness Reminders"
                    description="Gentle reminders to take mindful breaks"
                    checked={preferences.enableWellnessReminders}
                    onChange={(checked) => setPreferences({ ...preferences, enableWellnessReminders: checked })}
                  />

                  {preferences.enableWellnessReminders && (
                    <div className="ml-6 pl-4 border-l-2 border-amber-500/30">
                      <label className="block text-sm font-medium text-[var(--mg-text-secondary)] mb-2">
                        Reminder Frequency
                      </label>
                      <select
                        value={preferences.wellnessReminderFrequency}
                        onChange={(e) => setPreferences({ ...preferences, wellnessReminderFrequency: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-[var(--mg-text-primary)]"
                      >
                        <option value="2">Every 2 hours</option>
                        <option value="3">Every 3 hours</option>
                        <option value="4">Every 4 hours</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[var(--mg-border)]">
                    <h4 className="font-medium text-[var(--mg-text-primary)] mb-3">Quiet Hours</h4>
                    <p className="text-sm text-[var(--mg-text-muted)] mb-4">No notifications during these hours</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[var(--mg-text-muted)] mb-1">Start</label>
                        <input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={(e) => setPreferences({ ...preferences, quietHoursStart: e.target.value })}
                          className="w-full px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 text-[var(--mg-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[var(--mg-text-muted)] mb-1">End</label>
                        <input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                          className="w-full px-4 py-2 bg-[var(--mg-bg-primary)] border border-[var(--mg-border)] rounded-lg focus:ring-2 focus:ring-teal-500 text-[var(--mg-text-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Calendar Connections */}
          <Section
            id="calendars"
            title="Calendar Connections"
            icon={<Calendar className="w-5 h-5 text-blue-600" />}
            isExpanded={expandedSections.has('calendars')}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <p className="text-sm text-[var(--mg-text-muted)]">
                Connect your calendar for smart, contextual wellness moments based on your schedule.
              </p>

              {calendarAccounts.length > 0 ? (
                <div className="space-y-3">
                  {calendarAccounts.map((account) => {
                    const providerConfig: Record<string, { bg: string; label: string; letter: string }> = {
                      google: { bg: 'bg-blue-500', label: 'Google Calendar', letter: 'G' },
                      microsoft: { bg: 'bg-blue-600', label: 'Outlook', letter: 'M' },
                      webex: { bg: 'bg-cyan-500', label: 'Webex', letter: 'W' },
                      caldav: { bg: 'bg-gray-600', label: 'CalDAV', letter: 'C' },
                      apple: { bg: 'bg-gray-800', label: 'Apple Calendar', letter: 'A' },
                    };
                    const config = providerConfig[account.provider] || { bg: 'bg-gray-500', label: account.provider, letter: '?' };
                    
                    return (
                      <div key={account.id} className="flex items-center justify-between p-4 bg-[var(--mg-bg-primary)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${config.bg}`}>
                            {config.letter}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--mg-text-primary)]">{account.email || account.label}</p>
                            <p className="text-xs text-[var(--mg-text-muted)]">
                              {config.label}
                              {account.isPrimary && ' • Primary'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnectCalendar(account.id)}
                          className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-[var(--mg-bg-primary)] rounded-xl text-center">
                  <p className="text-[var(--mg-text-muted)] mb-4">No calendars connected</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={connectGoogleCalendar}
                  className="px-4 py-3 bg-[var(--mg-bg-card)] border-2 border-[var(--mg-border)] rounded-xl hover:border-blue-400 transition-colors font-medium flex items-center justify-center gap-2 text-[var(--mg-text-primary)]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button
                  onClick={connectMicrosoftCalendar}
                  className="px-4 py-3 bg-[var(--mg-bg-card)] border-2 border-[var(--mg-border)] rounded-xl hover:border-blue-400 transition-colors font-medium flex items-center justify-center gap-2 text-[var(--mg-text-primary)]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  Outlook
                </button>
                <button
                  onClick={connectWebexCalendar}
                  className="px-4 py-3 bg-[var(--mg-bg-card)] border-2 border-[var(--mg-border)] rounded-xl hover:border-teal-400 transition-colors font-medium flex items-center justify-center gap-2 text-[var(--mg-text-primary)]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <circle fill="#00CF64" cx="12" cy="12" r="10"/>
                    <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                  Webex
                </button>
                <button
                  onClick={() => setShowCalDAVModal(true)}
                  className="px-4 py-3 bg-[var(--mg-bg-card)] border-2 border-[var(--mg-border)] rounded-xl hover:border-[var(--mg-text-muted)] transition-colors font-medium flex items-center justify-center gap-2 text-[var(--mg-text-primary)]"
                >
                  <Plus className="w-5 h-5 text-[var(--mg-text-muted)]" />
                  CalDAV / Other
                </button>
              </div>
              <p className="text-xs text-[var(--mg-text-muted)] mt-3">
                CalDAV works with Apple Calendar, Fastmail, Nextcloud, and more.
              </p>
            </div>
          </Section>

          {/* CalDAV Modal */}
          {showCalDAVModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Connect CalDAV Calendar</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Works with iCloud, Fastmail, Nextcloud, Synology, and other CalDAV servers.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
                    <input
                      type="url"
                      placeholder="https://caldav.example.com"
                      value={caldavForm.serverUrl}
                      onChange={(e) => setCaldavForm({ ...caldavForm, serverUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                    <input
                      type="text"
                      placeholder="your@email.com"
                      value={caldavForm.username}
                      onChange={(e) => setCaldavForm({ ...caldavForm, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password / App Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={caldavForm.password}
                      onChange={(e) => setCaldavForm({ ...caldavForm, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For iCloud, use an app-specific password from appleid.apple.com
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Name (optional)</label>
                    <input
                      type="text"
                      placeholder="Work, Personal, etc."
                      value={caldavForm.calendarName}
                      onChange={(e) => setCaldavForm({ ...caldavForm, calendarName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCalDAVModal(false);
                      setCaldavForm({ serverUrl: '', username: '', password: '', calendarName: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={connectCalDAV}
                    disabled={!caldavForm.serverUrl || !caldavForm.username || !caldavForm.password}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Account */}
          <Section
            id="account"
            title="Account"
            icon={<User className="w-5 h-5 text-gray-600" />}
            isExpanded={expandedSections.has('account')}
            onToggle={toggleSection}
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--mg-text-muted)] mb-1">Email</label>
                <p className="text-[var(--mg-text-primary)]">{userEmail || 'Not set'}</p>
              </div>

              <div className="pt-4 border-t border-[var(--mg-border)]">
                <h4 className="font-medium text-red-400 mb-3">Danger Zone</h4>
                <p className="text-sm text-[var(--mg-text-muted)] mb-4">
                  Permanently delete your account and all data. This cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Section({ 
  id,
  title, 
  icon,
  children, 
  isExpanded, 
  onToggle 
}: { 
  id: string;
  title: string; 
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mg-card overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-5 hover:bg-[var(--mg-bg-primary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-[var(--mg-text-primary)]">{title}</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--mg-text-muted)]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--mg-text-muted)]" />
        )}
      </button>
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[var(--mg-border)] pt-5">
          {children}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="font-medium text-[var(--mg-text-primary)]">{label}</div>
        <div className="text-sm text-[var(--mg-text-muted)] mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-[var(--mg-bg-primary)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
