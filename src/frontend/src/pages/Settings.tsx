import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { ArrowLeft, Save } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';

interface Preferences {
  tone: 'executive' | 'cinematic' | 'balanced' | 'calm';
  alertMinutesBefore: number;
  enableDailyWrapUp: boolean;
  enableFocusScene: boolean;
  enableFocusSound: boolean;
  focusSoundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enableVoiceNarration: boolean;
  morningFlowTime: string;
  eveningFlowTime: string;
  enableMorningFlow: boolean;
  enableEveningFlow: boolean;
  enableWellnessReminders: boolean;
  wellnessReminderFrequency: number;
}

interface DeliverySettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  pushPreMeetingCues: boolean;
  pushPresleyFlow: boolean;
  pushWellnessReminders: boolean;
  pushMeetingInsights: boolean;
  pushMorningRecap: boolean;
  pushDailyWrapUp: boolean;
  phoneNumber?: string;
  slackWebhookUrl?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>({
    tone: 'balanced',
    alertMinutesBefore: 10,
    enableDailyWrapUp: true,
    enableFocusScene: true,
    enableFocusSound: true,
    focusSoundType: 'calm-ocean',
    enableVoiceNarration: true,
    morningFlowTime: '06:00',
    eveningFlowTime: '18:00',
    enableMorningFlow: true,
    enableEveningFlow: true,
    enableWellnessReminders: true,
    wellnessReminderFrequency: 3,
  });
  const [delivery, setDelivery] = useState<DeliverySettings>({
    emailEnabled: true,
    slackEnabled: false,
    smsEnabled: false,
    pushEnabled: true,
    pushPreMeetingCues: true,
    pushPresleyFlow: true,
    pushWellnessReminders: true,
    pushMeetingInsights: true,
    pushMorningRecap: true,
    pushDailyWrapUp: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await api.get('/api/user/profile');
      
      if (response.data.user.preferences) {
        setPreferences(response.data.user.preferences);
      }
      if (response.data.user.deliverySettings) {
        setDelivery(response.data.user.deliverySettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await Promise.all([
        api.put('/api/user/preferences', preferences),
        api.put('/api/user/delivery', delivery),
      ]);

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectCalendar = async (provider: 'google' | 'microsoft') => {
    const confirmed = window.confirm(
      `Are you sure you want to disconnect your ${provider === 'google' ? 'Google' : 'Microsoft'} calendar?\n\n` +
      'This will:\n' +
      '• Remove all synced meetings\n' +
      '• Stop future syncing\n' +
      '• Delete all focus sessions\n\n' +
      'You can always reconnect later.'
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        navigate('/');
        return;
      }

      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      const userId = decoded.userId;

      await api.delete(`/api/auth/calendar/${provider}`, {
        data: { userId },
      });

      alert(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar disconnected successfully.\n\nYou will be logged out.`);
      
      // Log out and redirect
      localStorage.removeItem('meetcute_token');
      navigate('/');
    } catch (error: any) {
      alert('Error disconnecting calendar: ' + (error.response?.data?.message || error.message));
      console.error('Error disconnecting calendar:', error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to delete your account?\n\n' +
      'This will permanently delete:\n' +
      '• All calendar connections\n' +
      '• All meetings and focus sessions\n' +
      '• All preferences and settings\n' +
      '• All wellness check-ins and history\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    );

    if (!confirmed) return;

    const confirmation = window.prompt('Type DELETE to confirm account deletion:');
    
    if (confirmation !== 'DELETE') {
      alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
      return;
    }

    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        navigate('/');
        return;
      }

      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      const userId = decoded.userId;

      await api.delete('/api/auth/account', {
        data: { userId },
      });

      alert('Your account has been permanently deleted.\n\nThank you for using Meet Cute. We hope to see you again someday. 💜');
      
      // Log out and redirect
      localStorage.removeItem('meetcute_token');
      navigate('/');
    } catch (error: any) {
      alert('Error deleting account: ' + (error.response?.data?.message || error.message));
      console.error('Error deleting account:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Settings</h1>
            </div>
            
            {/* Save Button in Header */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {message && (
                <span
                  className={`text-sm font-medium ${
                    message.includes('success') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {message}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="space-y-8">
          {/* Preferences */}
          <Section title="Preferences">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone
                </label>
                <select
                  value={preferences.tone}
                  onChange={(e) =>
                    setPreferences({ ...preferences, tone: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="executive">Executive - Professional & Strategic</option>
                  <option value="cinematic">Cinematic - Dramatic & Visual</option>
                  <option value="balanced">Balanced - Professional yet Warm</option>
                  <option value="calm">Calm - Gentle & Mindful</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Scene Availability (minutes before meeting)
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={preferences.alertMinutesBefore}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      alertMinutesBefore: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Focus Scene becomes available this many minutes before your meeting (default: 10 minutes)
                </p>
              </div>

              <Toggle
                label="Enable Daily Wrap-Up"
                description="Receive end-of-day reflection emails"
                checked={preferences.enableDailyWrapUp}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableDailyWrapUp: checked })
                }
              />

              <Toggle
                label="Enable Focus Scene"
                description="Include link to 5-minute guided preparation"
                checked={preferences.enableFocusScene}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableFocusScene: checked })
                }
              />
            </div>
          </Section>

          {/* Focus Sound Settings */}
          <Section title="Focus Sound">
            <div className="space-y-6">
              <Toggle
                label="Enable Ambient Sound"
                description="Play relaxing sounds during Focus Scene"
                checked={preferences.enableFocusSound}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableFocusSound: checked })
                }
              />

              {preferences.enableFocusSound && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sound Type
                  </label>
                  <select
                    value={preferences.focusSoundType}
                    onChange={(e) =>
                      setPreferences({ ...preferences, focusSoundType: e.target.value as any })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="calm-ocean">Calm Ocean Waves</option>
                    <option value="rain">Gentle Rain</option>
                    <option value="forest">Forest Ambience</option>
                    <option value="meditation-bell">Meditation Bell</option>
                    <option value="white-noise">White Noise</option>
                    <option value="none">Silence</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    Choose a calming sound to accompany your pre-meeting meditation
                  </p>
                </div>
              )}

              <Toggle
                label="Enable Voice Narration"
                description="Soothing voice guides you through focus flows"
                checked={preferences.enableVoiceNarration}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableVoiceNarration: checked })
                }
              />

              {preferences.enableVoiceNarration && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>🎙️ Voice Narration</strong> provides a calm, professional voice that walks you 
                    through each phase of your focus session. The ambient sound automatically dims when the voice 
                    speaks. You can toggle voice on/off at any time during a flow using the button in the top-right corner.
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Presley Flow Settings */}
          <Section title="Presley Flow">
            <div className="space-y-6">
              <Toggle
                label="Enable Morning Flow"
                description="Morning prep for today's meetings (default: 6:00 AM)"
                checked={preferences.enableMorningFlow}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableMorningFlow: checked })
                }
              />

              {preferences.enableMorningFlow && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Morning Flow Availability
                  </label>
                  <input
                    type="time"
                    value={preferences.morningFlowTime}
                    onChange={(e) =>
                      setPreferences({ ...preferences, morningFlowTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Morning flow becomes available at this time (default: 6:00 AM)
                  </p>
                </div>
              )}

              <Toggle
                label="Enable Evening Flow"
                description="Daily wrap-up + tomorrow's mental rehearsal (default: 6:00 PM)"
                checked={preferences.enableEveningFlow}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableEveningFlow: checked })
                }
              />

              {preferences.enableEveningFlow && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evening Flow Availability
                  </label>
                  <input
                    type="time"
                    value={preferences.eveningFlowTime}
                    onChange={(e) =>
                      setPreferences({ ...preferences, eveningFlowTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Evening flow becomes available at this time (default: 6:00 PM)
                  </p>
                </div>
              )}

              {(preferences.enableMorningFlow || preferences.enableEveningFlow) && (

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎬</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        What is Presley Flow?
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        A two-part daily ritual to frame your day with intention and reflection.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li>
                          <strong>🌅 Morning Flow:</strong> Prep for today's meetings with AI-powered insights and intention-setting
                        </li>
                        <li>
                          <strong>🌙 Evening Flow:</strong> Reflect on today's outcomes, then mentally rehearse tomorrow's meetings
                        </li>
                        <li>• Guided visualization & breathing</li>
                        <li>• Takes 3-7 minutes per session</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Wellness Reminders */}
          <Section title="Wellness Reminders">
            <div className="space-y-6">
              <Toggle
                label="Enable Wellness Reminders"
                description="Receive periodic reminders to breathe, walk, or take mindful breaks"
                checked={preferences.enableWellnessReminders}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableWellnessReminders: checked })
                }
              />

              {preferences.enableWellnessReminders && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Frequency (hours)
                    </label>
                    <select
                      value={preferences.wellnessReminderFrequency}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          wellnessReminderFrequency: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="1">Every hour</option>
                      <option value="2">Every 2 hours</option>
                      <option value="3">Every 3 hours (recommended)</option>
                      <option value="4">Every 4 hours</option>
                      <option value="6">Every 6 hours</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      Reminders are sent during working hours (9 AM - 6 PM)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">🧘</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          AI-Powered Wellness Check-ins
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Based on your stress patterns, we'll send personalized reminders when you need them most.
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>🌬️ <strong>Breathing exercises</strong> - When stress is high</li>
                          <li>🚶 <strong>Walk breaks</strong> - During afternoon slumps</li>
                          <li>🧘 <strong>Mindful moments</strong> - Quick mental resets</li>
                          <li>📊 <strong>Pattern learning</strong> - Gets smarter over time</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Delivery Methods */}
          <Section title="Delivery Methods">
            <div className="space-y-6">
              <Toggle
                label="Email"
                description="Receive cues via email"
                checked={delivery.emailEnabled}
                onChange={(checked) =>
                  setDelivery({ ...delivery, emailEnabled: checked })
                }
              />

              <div>
                <Toggle
                  label="Slack"
                  description="Receive cues in Slack"
                  checked={delivery.slackEnabled}
                  onChange={(checked) =>
                    setDelivery({ ...delivery, slackEnabled: checked })
                  }
                />
                {delivery.slackEnabled && (
                  <input
                    type="url"
                    placeholder="Slack Webhook URL"
                    value={delivery.slackWebhookUrl || ''}
                    onChange={(e) =>
                      setDelivery({ ...delivery, slackWebhookUrl: e.target.value })
                    }
                    className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Push Notifications */}
              <div className="border-t pt-6">
                <PushNotificationManager
                  token={localStorage.getItem('meetcute_token') || ''}
                  enabled={delivery.pushEnabled}
                  onToggle={(enabled) => setDelivery({ ...delivery, pushEnabled: enabled })}
                />
                
                {/* Granular push notification preferences */}
                {delivery.pushEnabled && (
                  <div className="mt-6 pl-6 space-y-4 border-l-2 border-indigo-200">
                    <p className="text-sm font-medium text-gray-700 mb-4">Choose which notifications to receive:</p>
                    
                    <Toggle
                      label="Pre-Meeting Focus Sessions"
                      description="Alerts for upcoming meeting focus flows"
                      checked={delivery.pushPreMeetingCues}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushPreMeetingCues: checked })
                      }
                    />
                    
                    <Toggle
                      label="Presley Flow (Morning & Evening)"
                      description="Morning prep and evening mental rehearsal notifications"
                      checked={delivery.pushPresleyFlow}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushPresleyFlow: checked })
                      }
                    />
                    
                    <Toggle
                      label="Wellness Reminders"
                      description="Periodic wellness check-ins throughout the day"
                      checked={delivery.pushWellnessReminders}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushWellnessReminders: checked })
                      }
                    />
                    
                    <Toggle
                      label="Meeting Insights"
                      description="Post-meeting reflection and insights"
                      checked={delivery.pushMeetingInsights}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushMeetingInsights: checked })
                      }
                    />
                    
                    <Toggle
                      label="Morning Recap"
                      description="Early morning summary of today's meetings"
                      checked={delivery.pushMorningRecap}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushMorningRecap: checked })
                      }
                    />
                    
                    <Toggle
                      label="Daily Wrap-Up"
                      description="Evening summary of completed meetings"
                      checked={delivery.pushDailyWrapUp}
                      onChange={(checked) =>
                        setDelivery({ ...delivery, pushDailyWrapUp: checked })
                      }
                    />
                  </div>
                )}
              </div>

              <div>
                <Toggle
                  label="SMS"
                  description="Receive cues via text message"
                  checked={delivery.smsEnabled}
                  onChange={(checked) =>
                    setDelivery({ ...delivery, smsEnabled: checked })
                  }
                />
                {delivery.smsEnabled && (
                  <input
                    type="tel"
                    placeholder="Phone Number (+1234567890)"
                    value={delivery.phoneNumber || ''}
                    onChange={(e) =>
                      setDelivery({ ...delivery, phoneNumber: e.target.value })
                    }
                    className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>
            </div>
          </Section>

          {/* Account Management */}
          <Section title="Account Management">
            <div className="space-y-6">
              {/* Connected Calendars */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Calendars</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                        G
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Google Calendar</p>
                        <p className="text-sm text-gray-500">Syncing meetings automatically</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnectCalendar('google')}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  Disconnecting will remove all synced meetings and stop future syncing.
                </p>
              </div>

              {/* Danger Zone */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Delete Account</h4>
                      <p className="text-sm text-gray-700 mb-4">
                        Permanently delete your Meet Cute account and all associated data. This action cannot be undone.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        <li>• All calendar connections will be removed</li>
                        <li>• All meetings and focus sessions will be deleted</li>
                        <li>• All preferences and settings will be erased</li>
                        <li>• Your data cannot be recovered</li>
                      </ul>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Bottom save button removed - using header button only */}
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {children}
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
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

