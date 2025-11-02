import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { ArrowLeft, Save } from 'lucide-react';

interface Preferences {
  tone: 'executive' | 'cinematic' | 'balanced' | 'calm';
  alertMinutesBefore: number;
  enableDailyWrapUp: boolean;
  enableFocusScene: boolean;
  enableFocusSound: boolean;
  focusSoundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enablePresleyFlow: boolean;
  presleyFlowTime: string;
  enableMorningRecap: boolean;
}

interface DeliverySettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
  slackWebhookUrl?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>({
    tone: 'balanced',
    alertMinutesBefore: 5,
    enableDailyWrapUp: true,
    enableFocusScene: true,
    enableFocusSound: true,
    focusSoundType: 'calm-ocean',
    enablePresleyFlow: true,
    presleyFlowTime: '20:00',
    enableMorningRecap: true,
  });
  const [delivery, setDelivery] = useState<DeliverySettings>({
    emailEnabled: true,
    slackEnabled: false,
    smsEnabled: false,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Settings</h1>
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
                  Alert Timing (minutes before meeting)
                </label>
                <input
                  type="number"
                  min="1"
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
            </div>
          </Section>

          {/* Presley Flow Settings */}
          <Section title="Presley Flow">
            <div className="space-y-6">
              <Toggle
                label="Enable Presley Flow"
                description="Evening mental rehearsal for tomorrow's meetings"
                checked={preferences.enablePresleyFlow}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enablePresleyFlow: checked })
                }
              />

              {preferences.enablePresleyFlow && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evening Notification Time
                    </label>
                    <input
                      type="time"
                      value={preferences.presleyFlowTime}
                      onChange={(e) =>
                        setPreferences({ ...preferences, presleyFlowTime: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Receive your evening mental rehearsal at this time (default: 8:00 PM)
                    </p>
                  </div>

                  <Toggle
                    label="Enable Morning Recap"
                    description="Quick morning message after your Presley Flow"
                    checked={preferences.enableMorningRecap}
                    onChange={(checked) =>
                      setPreferences({ ...preferences, enableMorningRecap: checked })
                    }
                  />

                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">🎬</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          What is Presley Flow?
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          A cinematic evening ritual that helps you mentally rehearse tomorrow's meetings before bed. 
                          Think of it as previewing tomorrow's script—reducing anxiety and building calm confidence.
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Preview each meeting as a "scene"</li>
                          <li>• Guided visualization & breathing</li>
                          <li>• Set your intention for tomorrow</li>
                          <li>• Takes 3-7 minutes</li>
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

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {message && (
              <span
                className={`text-sm ${
                  message.includes('success') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message}
              </span>
            )}
          </div>
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

