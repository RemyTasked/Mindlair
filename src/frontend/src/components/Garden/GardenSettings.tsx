/**
 * Mind Garden - Garden Settings Component
 * 
 * Allows customization of garden display:
 * - Time of Day setting (Auto, Morning, Afternoon, Evening, Night, Dynamic)
 * - Weather display toggle and override
 * - Sound and animation settings
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Sun, Moon, Cloud, Droplets, Snowflake, Sparkles, Volume2, VolumeX, Eye, EyeOff, X, Check } from 'lucide-react';
import api from '../../lib/axios';

// Types
type TimeOfDaySetting = 'auto' | 'morning' | 'afternoon' | 'evening' | 'night' | 'dynamic';
type WeatherOverride = 'auto' | 'sunny' | 'partly-cloudy' | 'cloudy' | 'golden-hour' | 'mist' | 'gentle-rain' | 'soft-snow';

interface GardenSettingsData {
  timeOfDay: TimeOfDaySetting;
  showWeather: boolean;
  weatherOverride: WeatherOverride;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

interface GardenSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: GardenSettingsData) => void;
}

// Time of day options with descriptions
const TIME_OPTIONS: { value: TimeOfDaySetting; label: string; icon: JSX.Element; description: string }[] = [
  { value: 'auto', label: 'Auto', icon: <Sparkles className="w-4 h-4" />, description: 'Follows real-world time' },
  { value: 'morning', label: 'Morning', icon: <Sun className="w-4 h-4 text-amber-400" />, description: '6 AM light' },
  { value: 'afternoon', label: 'Afternoon', icon: <Sun className="w-4 h-4 text-yellow-400" />, description: '2 PM full sun' },
  { value: 'evening', label: 'Evening', icon: <Sun className="w-4 h-4 text-orange-400" />, description: '7 PM golden hour' },
  { value: 'night', label: 'Night', icon: <Moon className="w-4 h-4 text-slate-400" />, description: '9 PM moonlight' },
  { value: 'dynamic', label: 'Dynamic', icon: <Sparkles className="w-4 h-4 text-amber-400" />, description: 'Cycles through 24h' },
];

// Weather options with icons
const WEATHER_OPTIONS: { value: WeatherOverride; label: string; icon: JSX.Element }[] = [
  { value: 'auto', label: 'Auto', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'sunny', label: 'Sunny', icon: <Sun className="w-4 h-4 text-yellow-400" /> },
  { value: 'partly-cloudy', label: 'Partly Cloudy', icon: <Cloud className="w-4 h-4 text-gray-400" /> },
  { value: 'cloudy', label: 'Cloudy', icon: <Cloud className="w-4 h-4 text-gray-500" /> },
  { value: 'golden-hour', label: 'Golden Hour', icon: <Sun className="w-4 h-4 text-orange-400" /> },
  { value: 'mist', label: 'Mist', icon: <Cloud className="w-4 h-4 text-slate-300" /> },
  { value: 'gentle-rain', label: 'Gentle Rain', icon: <Droplets className="w-4 h-4 text-blue-400" /> },
  { value: 'soft-snow', label: 'Soft Snow', icon: <Snowflake className="w-4 h-4 text-cyan-300" /> },
];

export default function GardenSettings({ isOpen, onClose, onSettingsChange }: GardenSettingsProps) {
  const [settings, setSettings] = useState<GardenSettingsData>({
    timeOfDay: 'auto',
    showWeather: true,
    weatherOverride: 'auto',
    soundEnabled: true,
    animationsEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/api/garden/settings');
        if (response.data.settings) {
          setSettings(response.data.settings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Try localStorage fallback
        const localSettings = localStorage.getItem('mindgarden_garden_settings');
        if (localSettings) {
          setSettings(JSON.parse(localSettings));
        }
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/api/garden/settings', settings);
      // Also save to localStorage for offline support
      localStorage.setItem('mindgarden_garden_settings', JSON.stringify(settings));
      onSettingsChange?.(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Save to localStorage anyway
      localStorage.setItem('mindgarden_garden_settings', JSON.stringify(settings));
      onSettingsChange?.(settings);
    } finally {
      setSaving(false);
    }
  };

  // Update a setting
  const updateSetting = <K extends keyof GardenSettingsData>(
    key: K,
    value: GardenSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[var(--mg-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--mg-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--mg-accent)]/20">
                <Settings className="w-5 h-5 text-[var(--mg-accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--mg-text-primary)]">
                Garden Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--mg-text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--mg-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Time of Day */}
                <section>
                  <h3 className="text-sm font-medium text-[var(--mg-text-secondary)] mb-3 flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Time of Day
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updateSetting('timeOfDay', option.value)}
                        className={`p-3 rounded-xl border transition-all ${
                          settings.timeOfDay === option.value
                            ? 'bg-[var(--mg-accent)]/20 border-[var(--mg-accent)]'
                            : 'bg-[var(--mg-bg-card)] border-[var(--mg-border)] hover:border-[var(--mg-accent)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {option.icon}
                        </div>
                        <div className="text-xs font-medium text-[var(--mg-text-primary)]">
                          {option.label}
                        </div>
                        <div className="text-[10px] text-[var(--mg-text-muted)] mt-1">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Weather Settings */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--mg-text-secondary)] flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      Weather Effects
                    </h3>
                    <button
                      onClick={() => updateSetting('showWeather', !settings.showWeather)}
                      className={`p-2 rounded-lg transition-colors ${
                        settings.showWeather
                          ? 'bg-[var(--mg-accent)]/20 text-[var(--mg-accent)]'
                          : 'bg-[var(--mg-bg-card)] text-[var(--mg-text-muted)]'
                      }`}
                    >
                      {settings.showWeather ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  {settings.showWeather && (
                    <div className="grid grid-cols-4 gap-2">
                      {WEATHER_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateSetting('weatherOverride', option.value)}
                          className={`p-2 rounded-xl border transition-all ${
                            settings.weatherOverride === option.value
                              ? 'bg-[var(--mg-accent)]/20 border-[var(--mg-accent)]'
                              : 'bg-[var(--mg-bg-card)] border-[var(--mg-border)] hover:border-[var(--mg-accent)]/50'
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            {option.icon}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--mg-text-primary)] truncate">
                            {option.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Additional Settings */}
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--mg-text-secondary)] mb-3">
                    Additional Settings
                  </h3>

                  {/* Sound */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
                    <div className="flex items-center gap-3">
                      {settings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-[var(--mg-accent)]" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-[var(--mg-text-muted)]" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-[var(--mg-text-primary)]">
                          Garden Sounds
                        </div>
                        <div className="text-xs text-[var(--mg-text-muted)]">
                          Ambient nature sounds
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        settings.soundEnabled ? 'bg-[var(--mg-accent)]' : 'bg-[var(--mg-border)]'
                      }`}
                    >
                      <motion.div
                        className="w-4 h-4 bg-white rounded-full shadow"
                        animate={{ x: settings.soundEnabled ? 22 : 2 }}
                      />
                    </button>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
                    <div className="flex items-center gap-3">
                      <Sparkles className={`w-5 h-5 ${
                        settings.animationsEnabled ? 'text-[var(--mg-accent)]' : 'text-[var(--mg-text-muted)]'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-[var(--mg-text-primary)]">
                          Animations
                        </div>
                        <div className="text-xs text-[var(--mg-text-muted)]">
                          Plant sway, companions, effects
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('animationsEnabled', !settings.animationsEnabled)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        settings.animationsEnabled ? 'bg-[var(--mg-accent)]' : 'bg-[var(--mg-border)]'
                      }`}
                    >
                      <motion.div
                        className="w-4 h-4 bg-white rounded-full shadow"
                        animate={{ x: settings.animationsEnabled ? 22 : 2 }}
                      />
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--mg-border)]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[var(--mg-text-secondary)] hover:bg-[var(--mg-bg-card)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={saving || loading}
              className="px-6 py-2 bg-[var(--mg-accent)] hover:bg-[var(--mg-accent-light)] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : null}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

