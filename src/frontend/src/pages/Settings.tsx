  const connectGoogleCalendar = async () => {
    try {
      const response = await api.get('/api/auth/google/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      alert('Failed to start Google authorization');
    }
  };

  const connectMicrosoftCalendar = async () => {
    try {
      const response = await api.get('/api/auth/microsoft/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error initiating Microsoft auth:', error);
      alert('Failed to start Microsoft authorization');
    }
  };
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { ArrowLeft, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';

// Simplified notification types
type NotificationChannel = 'email' | 'push' | 'slack' | 'sms' | 'none';
type NotificationCategory = 'meetingMoments' | 'dailyRhythm' | 'wellnessInsights';

interface NotificationPreset {
  name: string;
  description: string;
  primaryChannel: NotificationChannel;
  secondaryChannels: NotificationChannel[];
  categories: Record<NotificationCategory, boolean>;
}

// Simplified Preferences interface matching the new backend schema
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
  enableWindingDown: boolean;
  windingDownTime: string;
  enableWellnessReminders: boolean;
  wellnessReminderFrequency: number;
  enableReflections: boolean;
  privateReflectionMode: boolean;
  reflectionDataSharing: boolean;
  storeReflectionText: boolean;
  defaultPrepModes: Record<string, string>;
  // New simplified notification fields
  primaryNotificationChannel: 'email' | 'push' | 'none';
  secondaryNotificationChannels: string[];
  notificationCategoryMeetingMoments: boolean;
  notificationCategoryDailyRhythm: boolean;
  notificationCategoryWellnessInsights: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface DeliverySettings {
  // Master toggles
  emailEnabled: boolean;
  slackEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  
  // Email granular
  emailPreMeetingCues: boolean;
  emailInMeetingCues: boolean;
  emailPostMeetingCues: boolean;
  emailPresleyFlow: boolean;
  emailWellnessReminders: boolean;
  emailMeetingInsights: boolean;
  emailMorningRecap: boolean;
  emailDailyWrapUp: boolean;
  emailWindingDown: boolean;
  
  // Slack granular
  slackPreMeetingCues: boolean;
  slackInMeetingCues: boolean;
  slackPostMeetingCues: boolean;
  slackPresleyFlow: boolean;
  slackWellnessReminders: boolean;
  slackMeetingInsights: boolean;
  slackMorningRecap: boolean;
  slackDailyWrapUp: boolean;
  slackWindingDown: boolean;
  
  // SMS granular
  smsPreMeetingCues: boolean;
  smsInMeetingCues: boolean;
  smsPostMeetingCues: boolean;
  smsPresleyFlow: boolean;
  smsWellnessReminders: boolean;
  smsMeetingInsights: boolean;
  smsMorningRecap: boolean;
  smsDailyWrapUp: boolean;
  smsWindingDown: boolean;
  
  // Push granular
  pushPreMeetingCues: boolean;
  pushInMeetingCues: boolean;
  pushPostMeetingCues: boolean;
  pushPresleyFlow: boolean;
  pushWellnessReminders: boolean;
  pushMeetingInsights: boolean;
  pushMorningRecap: boolean;
  pushDailyWrapUp: boolean;
  pushWindingDown: boolean;
  
  phoneNumber?: string;
  slackWebhookUrl?: string;
}

type BooleanDeliveryKey = Exclude<{
  [K in keyof DeliverySettings]: DeliverySettings[K] extends boolean ? K : never
}[keyof DeliverySettings], undefined>;

type ChannelId = 'email' | 'slack' | 'push' | 'sms';
type ChannelEnabledKey = Extract<BooleanDeliveryKey, 'emailEnabled' | 'slackEnabled' | 'pushEnabled' | 'smsEnabled'>;

type DeliveryBooleanMap = Record<BooleanDeliveryKey, boolean>;

interface AlertType {
  id: string;
  label: string;
  description: string;
  highlight?: boolean;
  fields: Record<ChannelId, BooleanDeliveryKey>;
}

const CHANNELS: Array<{
  id: ChannelId;
  label: string;
  enabledKey: ChannelEnabledKey;
}> = [
  { id: 'email', label: '📧 Email', enabledKey: 'emailEnabled' },
  { id: 'slack', label: '💬 Slack', enabledKey: 'slackEnabled' },
  { id: 'push', label: '📱 Push', enabledKey: 'pushEnabled' },
  { id: 'sms', label: '💬 SMS', enabledKey: 'smsEnabled' },
];

const ALERT_TYPES: AlertType[] = [
  {
    id: 'pre-meeting',
    label: 'Pre-Meeting Focus (5 min)',
    description: 'Guided preparation before meetings',
    fields: {
      email: 'emailPreMeetingCues',
      slack: 'slackPreMeetingCues',
      push: 'pushPreMeetingCues',
      sms: 'smsPreMeetingCues',
    },
  },
  {
    id: 'in-meeting',
    label: 'In-Meeting Cues',
    description: 'Real-time nudges during meetings',
    highlight: true,
    fields: {
      email: 'emailInMeetingCues',
      slack: 'slackInMeetingCues',
      push: 'pushInMeetingCues',
      sms: 'smsInMeetingCues',
    },
  },
  {
    id: 'post-meeting',
    label: 'Post-Meeting Reflection',
    description: 'Insights and cues after meetings',
    fields: {
      email: 'emailPostMeetingCues',
      slack: 'slackPostMeetingCues',
      push: 'pushPostMeetingCues',
      sms: 'smsPostMeetingCues',
    },
  },
  {
    id: 'presley-flow',
    label: 'Presley Flow (Morning/Evening)',
    description: 'Opening scene & final wrap rituals',
    fields: {
      email: 'emailPresleyFlow',
      slack: 'slackPresleyFlow',
      push: 'pushPresleyFlow',
      sms: 'smsPresleyFlow',
    },
  },
  {
    id: 'wellness-reminders',
    label: 'Wellness Reminders',
    description: 'Periodic check-ins throughout the day',
    fields: {
      email: 'emailWellnessReminders',
      slack: 'slackWellnessReminders',
      push: 'pushWellnessReminders',
      sms: 'smsWellnessReminders',
    },
  },
  {
    id: 'winding-down',
    label: 'Winding Down',
    description: 'Evening ritual notifications',
    fields: {
      email: 'emailWindingDown',
      slack: 'slackWindingDown',
      push: 'pushWindingDown',
      sms: 'smsWindingDown',
    },
  },
  {
    id: 'meeting-insights',
    label: 'Meeting Insights',
    description: 'Post-meeting summaries & highlights',
    fields: {
      email: 'emailMeetingInsights',
      slack: 'slackMeetingInsights',
      push: 'pushMeetingInsights',
      sms: 'smsMeetingInsights',
    },
  },
  {
    id: 'morning-recap',
    label: 'Morning Recap',
    description: "Early morning summary of today's meetings",
    fields: {
      email: 'emailMorningRecap',
      slack: 'slackMorningRecap',
      push: 'pushMorningRecap',
      sms: 'smsMorningRecap',
    },
  },
  {
    id: 'daily-wrap',
    label: 'Daily Wrap-Up',
    description: 'Evening summary of completed meetings',
    fields: {
      email: 'emailDailyWrapUp',
      slack: 'slackDailyWrapUp',
      push: 'pushDailyWrapUp',
      sms: 'smsDailyWrapUp',
    },
  },
];

interface CueSettings {
  enabled: boolean;
  tone: 'calm' | 'direct';
  toastEnabled: boolean;
  slackEnabled: boolean;
  quietHours: Array<{ start: string; end: string }>;
  cueFrequency: 'minimal' | 'balanced' | 'frequent';
  lowEnergyStart: string;
  lowEnergyEnd: string;
  perMeetingOverrides: Record<string, boolean>;
}

export default function Settings() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic'])); // Only 'basic' expanded by default
  const [preferences, setPreferences] = useState<Preferences>({
    tone: 'balanced',
    alertMinutesBefore: 5,
    enableDailyWrapUp: true,
    enableFocusScene: true,
    enableFocusSound: true,
    focusSoundType: 'calm-ocean',
    enableVoiceNarration: true,
    morningFlowTime: '06:00',
    eveningFlowTime: '18:00',
    enableMorningFlow: true,
    enableEveningFlow: true,
    enableWindingDown: true,
    windingDownTime: '21:00',
    enableWellnessReminders: true,
    wellnessReminderFrequency: 3,
    enableReflections: true,
    privateReflectionMode: false,
    reflectionDataSharing: false,
    storeReflectionText: true,
    defaultPrepModes: {},
    // Simplified notification fields
    primaryNotificationChannel: 'push',
    secondaryNotificationChannels: [],
    notificationCategoryMeetingMoments: true,
    notificationCategoryDailyRhythm: true,
    notificationCategoryWellnessInsights: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  // Simplified notification state
  const [primaryChannel, setPrimaryChannel] = useState<NotificationChannel>('push');
  const [secondaryChannels, setSecondaryChannels] = useState<NotificationChannel[]>([]);
  const [meetingMoments, setMeetingMoments] = useState(true);
  const [dailyRhythm, setDailyRhythm] = useState(true);
  const [wellnessInsights, setWellnessInsights] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  // Notification presets
  const presets: NotificationPreset[] = [
    {
      name: 'Minimal',
      description: 'Only essential notifications',
      primaryChannel: 'push',
      secondaryChannels: [],
      categories: {
        meetingMoments: true,
        dailyRhythm: false,
        wellnessInsights: false,
      },
    },
    {
      name: 'Balanced',
      description: 'Key moments and daily rhythm',
      primaryChannel: 'push',
      secondaryChannels: [],
      categories: {
        meetingMoments: true,
        dailyRhythm: true,
        wellnessInsights: false,
      },
    },
    {
      name: 'Full',
      description: 'All notifications enabled',
      primaryChannel: 'push',
      secondaryChannels: ['email'],
      categories: {
        meetingMoments: true,
        dailyRhythm: true,
        wellnessInsights: true,
      },
    },
  ];

  const applyPreset = (preset: NotificationPreset) => {
    setPrimaryChannel(preset.primaryChannel);
    setSecondaryChannels(preset.secondaryChannels);
    setMeetingMoments(preset.categories.meetingMoments);
    setDailyRhythm(preset.categories.dailyRhythm);
    setWellnessInsights(preset.categories.wellnessInsights);
  };

  const [delivery, setDelivery] = useState<DeliverySettings>({
    emailEnabled: true,
    slackEnabled: false,
    smsEnabled: false,
    pushEnabled: true,
    
    // Email defaults
    emailPreMeetingCues: true,
    emailInMeetingCues: false,
    emailPostMeetingCues: true,
    emailPresleyFlow: true,
    emailWellnessReminders: true,
    emailMeetingInsights: true,
    emailMorningRecap: true,
    emailDailyWrapUp: true,
    emailWindingDown: true,
    
    // Slack defaults
    slackPreMeetingCues: true,
    slackInMeetingCues: true,
    slackPostMeetingCues: true,
    slackPresleyFlow: true,
    slackWellnessReminders: true,
    slackMeetingInsights: true,
    slackMorningRecap: true,
    slackDailyWrapUp: true,
    slackWindingDown: true,
    
    // SMS defaults
    smsPreMeetingCues: true,
    smsInMeetingCues: false,
    smsPostMeetingCues: false,
    smsPresleyFlow: true,
    smsWellnessReminders: true,
    smsMeetingInsights: false,
    smsMorningRecap: true,
    smsDailyWrapUp: true,
    smsWindingDown: true,
    
    // Push defaults
    pushPreMeetingCues: true,
    pushInMeetingCues: true,
    pushPostMeetingCues: true,
    pushPresleyFlow: true,
    pushWellnessReminders: true,
    pushMeetingInsights: true,
    pushMorningRecap: true,
    pushDailyWrapUp: true,
    pushWindingDown: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [slackStatus, setSlackStatus] = useState<{
    connected: boolean;
    teamName?: string;
    channelName?: string;
  } | null>(null);
  const [calendarAccounts, setCalendarAccounts] = useState<Array<{
    id: string;
    provider: string;
    email: string;
    createdAt: string;
    label: string;
    color: string | null;
    isPrimary: boolean;
  }>>([]);
  const [cueSettings, setCueSettings] = useState<CueSettings>({
    enabled: true,
    tone: 'calm',
    toastEnabled: true,
    slackEnabled: false,
    quietHours: [],
    cueFrequency: 'balanced',
    lowEnergyStart: '14:00',
    lowEnergyEnd: '16:00',
    perMeetingOverrides: {},
  });

  const updateDeliveryField = (field: BooleanDeliveryKey, value: boolean) => {
    setDelivery((prev) => ({
      ...prev,
      [field as keyof DeliverySettings]: value,
    }) as DeliverySettings);
  };

  useEffect(() => {
    loadSettings();
    loadSlackStatus();
  }, []);

  const loadSlackStatus = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) return;

      const response = await api.get('/api/slack/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSlackStatus(response.data);
    } catch (error) {
      console.error('Error loading Slack status:', error);
    }
  };

  const getSlackAuthUrl = () => {
    const clientId = 'YOUR_SLACK_CLIENT_ID'; // This will be set via env var
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/slack/oauth/callback`);
    const token = localStorage.getItem('meetcute_token');
    const userId = token; // Use token as state for security
    const scopes = 'incoming-webhook,chat:write';
    
    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${userId}`;
  };

  const handleDisconnectSlack = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) return;

      await api.post('/api/slack/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSlackStatus({ connected: false });
      setMessage('Slack disconnected successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      setMessage('Failed to disconnect Slack');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        navigate('/');
        return;
      }

      // Check for cached profile first (instant load)
      const cachedProfile = localStorage.getItem('meetcute_profile_cache');
      if (cachedProfile) {
        try {
          const cached = JSON.parse(cachedProfile);
          if (cached.email) setUserEmail(cached.email);
          if (cached.preferences) setPreferences(cached.preferences);
          if (cached.deliverySettings) setDelivery(cached.deliverySettings);
          if (cached.calendarAccounts) setCalendarAccounts(cached.calendarAccounts);
          console.log('✅ Using cached profile in Settings');
        } catch (parseError) {
          console.warn('⚠️ Invalid cached profile, clearing cache', parseError);
          localStorage.removeItem('meetcute_profile_cache');
        }
      }

      // Fetch fresh data in background
      const response = await api.get('/api/user/profile');
      
      // Update cache
      localStorage.setItem('meetcute_profile_cache', JSON.stringify(response.data.user));
      
      if (response.data.user.email) {
        setUserEmail(response.data.user.email);
      }
      if (response.data.user.preferences) {
        setPreferences(response.data.user.preferences);
      }
      if (response.data.user.deliverySettings) {
        setDelivery(response.data.user.deliverySettings);
      }
      if (response.data.user.calendarAccounts) {
        setCalendarAccounts(response.data.user.calendarAccounts);
      }
      
      // Load Cue Companion settings
      const cueResponse = await api.get('/api/cues/settings');
      if (cueResponse.data) {
        const data = cueResponse.data;

        let parsedQuietHours: Array<{ start: string; end: string }> = [];
        if (Array.isArray(data.quietHours)) {
          parsedQuietHours = data.quietHours;
        } else if (typeof data.quietHours === 'string' && data.quietHours.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.quietHours);
            if (Array.isArray(parsed)) {
              parsedQuietHours = parsed;
            }
          } catch (parseError) {
            console.warn('Unable to parse cue quietHours JSON', parseError);
          }
        }

        let parsedOverrides: Record<string, boolean> = {};
        if (data.perMeetingOverrides && typeof data.perMeetingOverrides === 'object' && !Array.isArray(data.perMeetingOverrides)) {
          parsedOverrides = data.perMeetingOverrides as Record<string, boolean>;
        } else if (typeof data.perMeetingOverrides === 'string' && data.perMeetingOverrides.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.perMeetingOverrides);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsedOverrides = parsed;
            }
          } catch (parseError) {
            console.warn('Unable to parse cue perMeetingOverrides JSON', parseError);
          }
        }

        const normalizedCueSettings: CueSettings = {
          enabled: data.enabled ?? true,
          tone: (data.tone === 'direct' ? 'direct' : 'calm'),
          toastEnabled: data.toastEnabled ?? true,
          slackEnabled: data.slackEnabled ?? false,
          quietHours: parsedQuietHours,
          cueFrequency: (data.cueFrequency === 'minimal' || data.cueFrequency === 'frequent')
            ? data.cueFrequency
            : 'balanced',
          lowEnergyStart: data.lowEnergyStart || '14:00',
          lowEnergyEnd: data.lowEnergyEnd || '16:00',
          perMeetingOverrides: parsedOverrides,
        };

        setCueSettings(normalizedCueSettings);
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

    if (cueSettings.slackEnabled && !slackStatus?.connected) {
      setSaving(false);
      setMessage('Connect Slack before enabling Slack cue notifications.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      const cuePayload = {
        enabled: cueSettings.enabled,
        tone: cueSettings.tone,
        toastEnabled: cueSettings.toastEnabled,
        slackEnabled: cueSettings.slackEnabled,
        quietHours: Array.isArray(cueSettings.quietHours) ? cueSettings.quietHours : [],
        cueFrequency: cueSettings.cueFrequency,
        lowEnergyStart: cueSettings.lowEnergyStart,
        lowEnergyEnd: cueSettings.lowEnergyEnd,
        perMeetingOverrides: cueSettings.perMeetingOverrides || {},
      };

      await Promise.all([
        api.put('/api/user/preferences', preferences),
        api.put('/api/user/delivery', delivery),
        api.put('/api/cues/settings', cuePayload),
      ]);

      await Promise.all([loadSettings(), loadSlackStatus()]);

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorPayload = (error as any)?.response?.data?.error;
      const normalizedError =
        typeof errorPayload === 'string'
          ? errorPayload
          : errorPayload?.message
          ? String(errorPayload.message)
          : 'Error saving settings';
      setMessage(normalizedError);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectCalendar = async (accountId: string, providerLabel: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to disconnect "${providerLabel}"?\n\n` +
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

      await api.delete(`/api/auth/calendar/${accountId}`);

      alert('Calendar disconnected successfully.');
      await loadSettings();
    } catch (error: any) {
      alert('Error disconnecting calendar: ' + (error.response?.data?.message || error.message));
      console.error('Error disconnecting calendar:', error);
    }
  };

  const handleCalendarFieldChange = (accountId: string, field: 'label' | 'color', value: string) => {
    setCalendarAccounts(prev =>
      prev.map(account =>
        account.id === accountId
          ? {
              ...account,
              [field]: field === 'label' ? value : value || null,
            }
          : account
      )
    );
  };

  const handleSaveCalendarAccount = async (accountId: string) => {
    const account = calendarAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    try {
      await api.put(`/api/calendar/accounts/${accountId}`, {
        label: account.label,
        color: account.color,
      });
      await loadSettings();
      setMessage('Calendar updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error updating calendar account:', error);
      alert('Failed to update calendar account');
    }
  };

  const handleSetPrimaryCalendar = async (accountId: string) => {
    try {
      await api.post(`/api/calendar/accounts/${accountId}/primary`);
      await loadSettings();
      setMessage('Primary calendar updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error setting primary calendar:', error);
      alert('Failed to set primary calendar');
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Settings</h1>
            </div>
            
            {/* Save Button in Header */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {typeof message === 'string' && message && (
                <span
                  className={`text-xs sm:text-sm font-medium flex-1 sm:flex-none ${
                    message.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {message}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg text-sm sm:text-base whitespace-nowrap"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Settings'}</span>
                <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-5xl">
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Preferences */}
          <Section title="Preferences" id="basic" isExpanded={expandedSections.has('basic')} onToggle={toggleSection}>
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
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          {/* Prep Mode Defaults */}
          <Section title="Prep Mode Defaults" id="prep-modes" isExpanded={expandedSections.has('prep-modes')} onToggle={toggleSection}>
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong>Set your go-to prep modes for different meeting types.</strong> When a meeting title matches a pattern you've set, that mode will be automatically recommended. You can always choose a different mode if needed.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">Common Patterns</h4>
                
                {Object.entries(preferences.defaultPrepModes).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No default modes set yet. Add patterns below to get started.</p>
                )}

                {Object.entries(preferences.defaultPrepModes).map(([pattern, mode]) => (
                  <div key={pattern} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Meetings containing "{pattern}"
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        → {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newModes = { ...preferences.defaultPrepModes };
                        delete newModes[pattern];
                        setPreferences({ ...preferences, defaultPrepModes: newModes });
                      }}
                      className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Pattern</h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      id="new-pattern"
                      placeholder="e.g., '1:1' or 'standup'"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <select
                      id="new-mode"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select mode...</option>
                      <option value="clarity">Clarity</option>
                      <option value="confidence">Confidence</option>
                      <option value="connection">Connection</option>
                      <option value="composure">Composure</option>
                      <option value="momentum">Momentum</option>
                    </select>
                    <button
                      onClick={() => {
                        const patternInput = document.getElementById('new-pattern') as HTMLInputElement;
                        const modeSelect = document.getElementById('new-mode') as HTMLSelectElement;
                        const pattern = patternInput.value.trim();
                        const mode = modeSelect.value;
                        
                        if (pattern && mode) {
                          setPreferences({
                            ...preferences,
                            defaultPrepModes: {
                              ...preferences.defaultPrepModes,
                              [pattern]: mode,
                            },
                          });
                          patternInput.value = '';
                          modeSelect.value = '';
                        }
                      }}
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Examples: "1:1" → Connection, "standup" → Clarity, "presentation" → Confidence
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Focus Sound Settings */}
          <Section title="Focus Sound" id="sound" isExpanded={expandedSections.has('sound')} onToggle={toggleSection}>
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
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          <Section title="Presley Flow" id="presley" isExpanded={expandedSections.has('presley')} onToggle={toggleSection}>
            <div className="space-y-6">
              <Toggle
                label="Enable Morning Flow — 'Opening Scene'"
                description="Scene opens: Today unfolds at your direction (default: 6:00 AM)"
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
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Morning flow becomes available at this time (default: 6:00 AM)
                  </p>
                </div>
              )}

              <Toggle
                label="Enable Evening Flow — 'Presley Flow Session'"
                description="Camera wraps — rest easy, the next act awaits (default: 6:00 PM)"
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
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Evening flow becomes available at this time (default: 6:00 PM)
                  </p>
                </div>
              )}

              <Toggle
                label="Enable Winding Down Session — 'Evening Wind-Down'"
                description="No calls, no scripts—just space to breathe and reset (default: 9:00 PM)"
                checked={preferences.enableWindingDown}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableWindingDown: checked })
                }
              />

              {preferences.enableWindingDown && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Winding Down Time
                  </label>
                  <input
                    type="time"
                    value={preferences.windingDownTime}
                    onChange={(e) =>
                      setPreferences({ ...preferences, windingDownTime: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Winding down session becomes available at this time (default: 9:00 PM)
                  </p>
                </div>
              )}

              {(preferences.enableMorningFlow || preferences.enableEveningFlow || preferences.enableWindingDown) && (

                <div className="bg-gradient-to-br from-teal-50 to-indigo-50 p-6 rounded-xl border border-teal-200">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎬</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        The Presley Flow — Daily Cinematic Rhythm
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        A complete daily rhythm mirroring cinematic storytelling — from opening scene to final wrap.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-3">
                        <li>
                          <strong>☀️ Morning Prep — 'Opening Scene':</strong><br/>
                          <span className="text-gray-500 italic">"Scene opens: sunlight filters in. Today unfolds at your direction."</span><br/>
                          Sets emotional theme, breathing ritual, and scene forecast for the day.
                        </li>
                        <li>
                          <strong>⏰ Daytime — 'Scene-by-Scene':</strong><br/>
                          <span className="text-gray-500 italic">"You're on in 5: Breathe and lead the moment."</span><br/>
                          Pre-meeting cues 5 minutes before each meeting with focus mode.
                        </li>
                        <li>
                          <strong>🌙 Evening — 'Presley Flow Session':</strong><br/>
                          <span className="text-gray-500 italic">"Camera wraps — rest easy, the next act awaits."</span><br/>
                          Daily wrap-up + gentle preview of tomorrow's schedule.
                        </li>
                        <li>
                          <strong>🌜 Winding Down — 'Evening Wind-Down':</strong><br/>
                          <span className="text-gray-500 italic">"No calls, no scripts—just space."</span><br/>
                          Standalone breathing and relaxation before sleep.
                        </li>
                        <li>
                          <strong>🌙 Weekend — 'The Intermission':</strong><br/>
                          <span className="text-gray-500 italic">"The stage rests. You've earned the pause."</span><br/>
                          Choose your reset tone: Calm, Creative, or Reflective.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Privacy & Reflection Settings */}
          <Section title="Privacy & Reflection Settings" id="privacy" isExpanded={expandedSections.has('privacy')} onToggle={toggleSection}>
            <div className="space-y-6">
              {/* Privacy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">Your Data, Your Control</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      All reflection data is stored securely and encrypted. You control what's stored, 
                      how it's analyzed, and whether it's used for insights. No meeting content is ever 
                      analyzed without your explicit consent.
                    </p>
                  </div>
                </div>
              </div>

              <Toggle
                label="Enable Post-Meeting Reflections"
                description="Show reflection prompts after meetings to capture your emotional state"
                checked={preferences.enableReflections}
                onChange={(checked) =>
                  setPreferences({ ...preferences, enableReflections: checked })
                }
              />

              {preferences.enableReflections && (
                <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-6">
                  <Toggle
                    label="Private Reflection Mode"
                    description="Only show high-level trends (energy, ratings). Hide specific words and text from insights."
                    checked={preferences.privateReflectionMode}
                    onChange={(checked) =>
                      setPreferences({ ...preferences, privateReflectionMode: checked })
                    }
                  />

                  <Toggle
                    label="Store Reflection Text"
                    description="Save your one-word descriptions for personalized insights. Disable to only store ratings."
                    checked={preferences.storeReflectionText}
                    onChange={(checked) =>
                      setPreferences({ ...preferences, storeReflectionText: checked })
                    }
                  />

                  <Toggle
                    label="Share Anonymized Data"
                    description="Help improve Meet Cute by sharing anonymized reflection patterns (no personal info or meeting content)"
                    checked={preferences.reflectionDataSharing}
                    onChange={(checked) =>
                      setPreferences({ ...preferences, reflectionDataSharing: checked })
                    }
                  />

                  {preferences.privateReflectionMode && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">🔒</span>
                        <div>
                          <h5 className="font-semibold text-teal-900 mb-1">Private Mode Active</h5>
                          <p className="text-sm text-teal-800">
                            Director's Insights will show trends like "energy rising" or "mostly positive meetings" 
                            but won't display specific words or individual reflection details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Delete Level 2 Meeting Data */}
              <div className="pt-6 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🗑️</span>
                    <div className="flex-1">
                      <h5 className="font-semibold text-red-900 mb-1">Level 2 Meeting Data</h5>
                      <p className="text-sm text-red-800 mb-3">
                        Delete your stored voice patterns and baseline data. This only affects locally stored analysis data—no audio is ever saved.
                      </p>
                      <button
                        onClick={() => {
                          if (confirm('Delete all Level 2 Companion meeting data? Your baseline patterns will be recalibrated in your next meeting.')) {
                            // Import AudioAnalyzer class and call static delete method
                            try {
                              // We'll need to import this at the top
                              // For now, just clear localStorage directly
                              localStorage.removeItem('meetcute_level2_baseline');
                              alert('✅ Level 2 meeting data deleted. Your patterns will recalibrate in your next meeting.');
                            } catch (error) {
                              console.error('Failed to delete data:', error);
                              alert('Failed to delete data. Please try again.');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete Meeting Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Wellness Reminders */}
          <Section title="Wellness Reminders" id="wellness" isExpanded={expandedSections.has('wellness')} onToggle={toggleSection}>
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
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          <Section title="Notification Preferences" id="delivery" isExpanded={expandedSections.has('delivery')} onToggle={toggleSection}>
            <div className="space-y-6">

              {/* Quick Presets */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="font-semibold text-gray-900 mb-1">{preset.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{preset.description}</div>
                      <div className="text-xs text-gray-500">
                        {preset.primaryChannel !== 'none' && `Primary: ${preset.primaryChannel}`}
                        {preset.secondaryChannels.length > 0 && ` + ${preset.secondaryChannels.join(', ')}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Categories */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">What to Notify About</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">🎯 Meeting Moments</div>
                      <div className="text-sm text-gray-600">Pre, during, and post-meeting cues</div>
                    </div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={meetingMoments}
                        onChange={(e) => setMeetingMoments(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">🌅 Daily Rhythm</div>
                      <div className="text-sm text-gray-600">Morning flows, evening wrap-ups, and winding down</div>
                    </div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={dailyRhythm}
                        onChange={(e) => setDailyRhythm(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">💡 Wellness Insights</div>
                      <div className="text-sm text-gray-600">Check-ins, meeting insights, and wellness reminders</div>
                    </div>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={wellnessInsights}
                        onChange={(e) => setWellnessInsights(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">How to Deliver Notifications</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Channel</label>
                    <select
                      value={primaryChannel}
                      onChange={(e) => setPrimaryChannel(e.target.value as NotificationChannel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="push">📱 Push Notifications</option>
                      <option value="email">📧 Email</option>
                      <option value="none">🚫 None</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Channels (Optional)</label>
                    <div className="space-y-2">
                      {(['email', 'slack', 'sms'] as NotificationChannel[]).map((channel) => (
                        <label key={channel} className="inline-flex items-center mr-6">
                          <input
                            type="checkbox"
                            checked={secondaryChannels.includes(channel)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSecondaryChannels([...secondaryChannels, channel]);
                              } else {
                                setSecondaryChannels(secondaryChannels.filter(c => c !== channel));
                              }
                            }}
                            disabled={primaryChannel === channel}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span className="ml-2 text-sm">
                            {channel === 'email' && '📧 Email'}
                            {channel === 'slack' && '💬 Slack'}
                            {channel === 'sms' && '📱 SMS'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🌙 Quiet Hours</h4>
                <p className="text-gray-600 text-sm mb-4">Pause notifications during these hours</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Legacy Channel Enablement */}
              <div className="border-t pt-6 mt-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Legacy Channel Settings</h4>
                <p className="text-sm text-gray-600 mb-4">
                  The settings below are automatically managed by your choices above. You can still fine-tune them if needed.
                </p>

                <div className="space-y-6">
              <div>
                <Toggle
                  label="Email"
                  description="Receive cues via email"
                  checked={delivery.emailEnabled}
                  onChange={(checked) =>
                    setDelivery({ ...delivery, emailEnabled: checked })
                  }
                />
                {delivery.emailEnabled && (
                  <div className="ml-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900 mb-1">
                          ✅ Email Notifications Enabled
                        </p>
                        <p className="text-xs text-green-700">
                          Test your email delivery to make sure it's working
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('meetcute_token');
                            if (!token) return;
                            
                            setSaving(true);
                            await api.post('/api/test/email/send', {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            alert('✅ Test email sent! Check your inbox at ' + userEmail);
                          } catch (error: any) {
                            alert('❌ Failed to send test email: ' + (error.response?.data?.error || error.message));
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
                      >
                        {saving ? 'Sending...' : '📧 Send Test'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Slack</h3>
                    <p className="text-sm text-gray-600">Receive cues in Slack</p>
                  </div>
                  {slackStatus?.connected ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      ✓ Connected
                    </span>
                  ) : null}
                </div>

                {slackStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-900">
                            {slackStatus.teamName || 'Slack Workspace'}
                          </p>
                          <p className="text-sm text-green-700">
                            Notifications sent to #{slackStatus.channelName || 'channel'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDisconnectSlack}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Disconnect Slack
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <a
                      href={getSlackAuthUrl()}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#4A154B] hover:bg-[#611f69] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                      </svg>
                      Add to Slack
                    </a>
                    
                    <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <span className="text-lg">✨</span>
                      <div className="text-sm text-teal-900">
                        <p className="font-medium mb-1">One-Click Setup</p>
                        <p className="text-teal-700">
                          Click "Add to Slack" to connect your workspace. You'll choose which channel receives notifications.
                        </p>
                      </div>
                    </div>
                  </div>
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
                      label="Presley Flow — 'Opening Scene' & 'Final Wrap'"
                      description="Morning prep and evening cinematic reflection notifications"
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

              {/* Granular Notification Matrix */}
              <div className="border-t pt-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fine-Tune Your Alerts</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Control exactly which alerts you receive through each channel. Toggle master switches above to enable/disable entire channels.
                </p>

                {/* Desktop/Tablet View - Table */}
                <div className="hidden lg:block overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                              Alert Type
                            </th>
                            {CHANNELS.map((channel) => (
                              <th
                                key={channel.id}
                                scope="col"
                                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                              >
                                {channel.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {ALERT_TYPES.map((alert) => (
                            <tr
                              key={alert.id}
                              className={`hover:bg-gray-50 ${alert.highlight ? 'bg-amber-50' : ''}`}
                            >
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                <div className="font-medium text-gray-900">{alert.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{alert.description}</div>
                              </td>
                              {CHANNELS.map((channel) => {
                                const rawFieldKey = alert.fields[channel.id];
                                if (!rawFieldKey) {
                                  return (
                                    <td key={channel.id} className="whitespace-nowrap px-3 py-4 text-center text-gray-300">
                                      —
                                    </td>
                                  );
                                }
                                const fieldKey = rawFieldKey as BooleanDeliveryKey;
                                const deliveryMap = delivery as unknown as DeliveryBooleanMap;
                                const channelEnabled = deliveryMap[channel.enabledKey];
                                const fieldValue = deliveryMap[fieldKey];
                                return (
                                  <td key={channel.id} className="whitespace-nowrap px-3 py-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={fieldValue}
                                      disabled={!channelEnabled}
                                      onChange={(e) => updateDeliveryField(fieldKey, e.target.checked)}
                                      className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile/Tablet View - Stacked Cards */}
                <div className="lg:hidden space-y-3 sm:space-y-4">
                  {ALERT_TYPES.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg ${alert.highlight ? 'bg-amber-50' : 'bg-gray-50'}`}
                    >
                      <div className="font-medium text-gray-900 mb-3">{alert.label}</div>
                      <div className="text-xs text-gray-500 mb-3">{alert.description}</div>
                      <div className="space-y-2">
                        {CHANNELS.map((channel) => {
                          const rawFieldKey = alert.fields[channel.id];
                          if (!rawFieldKey) {
                            return null;
                          }
                          const fieldKey = rawFieldKey as BooleanDeliveryKey;
                          const deliveryMap = delivery as unknown as DeliveryBooleanMap;
                          const channelEnabled = deliveryMap[channel.enabledKey];
                          const fieldValue = deliveryMap[fieldKey];
                          return (
                            <label
                              key={channel.id}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700">{channel.label}</span>
                              <input
                                type="checkbox"
                                checked={fieldValue}
                                disabled={!channelEnabled}
                                onChange={(e) => updateDeliveryField(fieldKey, e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How this works</p>
                      <p className="text-blue-700">
                        Master toggles above (Email, Slack, Push, SMS) control whether each channel is enabled at all.
                        Then use this table to choose which specific alerts you want through each channel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
                </div> {/* Close space-y-6 div */}
              </div> {/* Close border-t pt-6 mt-8 div */}
            </div> {/* Close main space-y-6 div */}
          </Section>

          {/* Account Management */}
          <Section title="Account Management" id="account" isExpanded={expandedSections.has('account')} onToggle={toggleSection}>
            <div className="space-y-6">

              {/* Connected Calendars */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Calendars</h3>
                {calendarAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {calendarAccounts.map((account) => {
                      const fallbackLabel = `${account.provider === 'google' ? 'Google' : 'Microsoft'} • ${account.email}`;
                      const displayLabel = account.label && account.label.trim().length > 0 ? account.label : fallbackLabel;
                      const displayColor = account.color || '#6366f1';

                      return (
                        <div key={account.id} className="p-4 bg-gray-50 rounded-lg space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                                account.provider === 'google'
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                  : 'bg-gradient-to-br from-blue-400 to-blue-600'
                              }`}>
                                {account.provider === 'google' ? 'G' : 'M'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {account.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'}
                                </p>
                                <p className="text-sm text-gray-600 font-medium">{account.email}</p>
                                {account.isPrimary && (
                                  <p className="text-xs font-semibold text-indigo-600 mt-1">
                                    Primary calendar
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDisconnectCalendar(account.id, displayLabel)}
                              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                            >
                              Disconnect
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-600 uppercase">
                                Calendar label
                              </label>
                              <input
                                type="text"
                                value={displayLabel}
                                onChange={(e) => handleCalendarFieldChange(account.id, 'label', e.target.value)}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Work, Personal, Client, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-600 uppercase">
                                Color
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={displayColor}
                                  onChange={(e) => handleCalendarFieldChange(account.id, 'color', e.target.value)}
                                  className="w-12 h-12 rounded cursor-pointer border border-gray-300"
                                />
                                <input
                                  type="text"
                                  value={account.color || ''}
                                  onChange={(e) => handleCalendarFieldChange(account.id, 'color', e.target.value)}
                                  placeholder="#6366f1"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                              <button
                                onClick={() => handleSaveCalendarAccount(account.id)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => handleSetPrimaryCalendar(account.id)}
                                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium disabled:opacity-50"
                                disabled={account.isPrimary}
                              >
                                {account.isPrimary ? 'Primary Calendar' : 'Set as Primary'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600">No calendars connected</p>
                    <p className="text-sm text-gray-500 mt-1">Connect a calendar to start syncing meetings</p>
                  </div>
                )}
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={connectGoogleCalendar}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-sm hover:shadow-md"
                  >
                    Add Google Calendar
                  </button>
                  <button
                    onClick={connectMicrosoftCalendar}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium shadow-sm hover:shadow-md"
                  >
                    Add Outlook Calendar
                  </button>
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

          {/* Cue Companion Section */}
          <Section title="🔔 Cue Companion" id="cues" isExpanded={expandedSections.has('cues')} onToggle={toggleSection}>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Contextual Meeting Nudges</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Get timed, context-aware cues during meetings to help you stay grounded, focused, and intentional—no audio access required.
                </p>
              </div>

              <Toggle
                label="Enable Cue Companion"
                description="Receive contextual nudges before, during, and after meetings"
                checked={cueSettings.enabled}
                onChange={(checked) => setCueSettings({ ...cueSettings, enabled: checked })}
              />

              {cueSettings.enabled && (
                <div className="space-y-6 pl-4 border-l-2 border-gray-200">
                  {/* Info about Level 2 */}
                  <div className="bg-gradient-to-r from-teal-50 to-indigo-50 rounded-lg p-4 border border-teal-200">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-teal-900 mb-1">Level 2: Real-Time Coach Available</h4>
                        <p className="text-xs text-teal-800 mb-2">
                          During meetings, you can optionally enable <strong>Level 2</strong> for real-time audio analysis. 
                          It listens to how you sound (not what you say) to provide composure cues.
                        </p>
                        <p className="text-xs text-teal-700">
                          💡 Look for the "Level 2" toggle button during your next meeting to try it out!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cue Tone
                    </label>
                    <select
                      value={cueSettings.tone}
                      onChange={(e) => setCueSettings({ ...cueSettings, tone: e.target.value as 'calm' | 'direct' })}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="calm">Calm & Supportive</option>
                      <option value="direct">Direct & Brief</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {cueSettings.tone === 'calm' ? 'Gentle, encouraging language' : 'Short, actionable prompts'}
                    </p>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cue Frequency
                    </label>
                    <select
                      value={cueSettings.cueFrequency}
                      onChange={(e) => setCueSettings({ ...cueSettings, cueFrequency: e.target.value as 'minimal' | 'balanced' | 'frequent' })}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="minimal">Minimal (Pre-meeting + 5-min-left only)</option>
                      <option value="balanced">Balanced (Recommended)</option>
                      <option value="frequent">Frequent (All cues enabled)</option>
                    </select>
                  </div>

                  {/* Delivery Channels */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Delivery Channels</h4>
                    <div className="space-y-3">
                      <Toggle
                        label="Toast Notifications"
                        description="Show cues as small toasts in the bottom-right corner"
                        checked={cueSettings.toastEnabled}
                        onChange={(checked) => setCueSettings({ ...cueSettings, toastEnabled: checked })}
                      />
                      <Toggle
                        label="Slack DM to Self"
                        description="Send cues as Slack direct messages (requires Slack connection)"
                        checked={cueSettings.slackEnabled}
                        onChange={(checked) => setCueSettings({ ...cueSettings, slackEnabled: checked })}
                      />
                    </div>
                  </div>

                  {/* Low-Energy Window */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Low-Energy Window</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Time window when you typically experience an energy dip (e.g., 2-4 PM). Cues will be adjusted accordingly.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                        <input
                          type="time"
                          value={cueSettings.lowEnergyStart}
                          onChange={(e) => setCueSettings({ ...cueSettings, lowEnergyStart: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                        <input
                          type="time"
                          value={cueSettings.lowEnergyEnd}
                          onChange={(e) => setCueSettings({ ...cueSettings, lowEnergyEnd: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Example Cues */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Example Cues</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• <span className="font-medium">Pre-meeting:</span> "Take one breath before you unmute."</li>
                      <li>• <span className="font-medium">Mid-meeting:</span> "Breath check. Slow your next sentence."</li>
                      <li>• <span className="font-medium">5 min left:</span> "Land one clear outcome → who does what, by when?"</li>
                      <li>• <span className="font-medium">Post-meeting:</span> "Next call in 3 min. Breathe first."</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* App Update Section */}
          <Section title="✨ App Update" id="update" isExpanded={expandedSections.has('update')} onToggle={toggleSection}>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-teal-50 border-l-4 border-indigo-400 p-6 rounded-lg">
                <h3 className="font-semibold text-indigo-900 mb-2">Refresh to Latest Version</h3>
                <p className="text-sm text-indigo-800 mb-4">
                  Get the latest features and improvements! This will refresh your app to ensure you have the newest version of Meet Cute.
                </p>
                <button
                  onClick={async () => {
                    try {
                      if (!confirm('Meet Cute wants to refresh to the latest version. Your account and settings will remain intact.')) {
                        console.log('❌ User canceled app refresh');
                        return;
                      }
                      
                      console.log('✨ App refresh initiated...');
                      
                      // Show updating state
                      const btn = document.activeElement as HTMLButtonElement;
                      if (btn) {
                        btn.disabled = true;
                        btn.innerHTML = '🔄 Updating...';
                      }
                      
                      // Clear localStorage (except token)
                      const token = localStorage.getItem('meetcute_token');
                      localStorage.clear();
                      if (token) localStorage.setItem('meetcute_token', token);
                      console.log('✅ Cleared localStorage (kept token)');
                      
                      // Clear all caches
                      if ('caches' in window) {
                        const names = await caches.keys();
                        console.log(`🗑️ Clearing ${names.length} caches...`);
                        await Promise.all(names.map(name => caches.delete(name)));
                        console.log('✅ Cleared all caches');
                      }
                      
                      // Unregister service workers
                      if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        console.log(`🗑️ Unregistering ${registrations.length} service workers...`);
                        await Promise.all(registrations.map(r => r.unregister()));
                        console.log('✅ Unregistered all service workers');
                      }
                      
                      console.log('🔄 Reloading app...');
                      // Reload immediately
                      window.location.reload();
                    } catch (error) {
                      console.error('❌ Error during app refresh:', error);
                      alert('Failed to refresh app. Please try closing and reopening the app.');
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  ✨ Refresh to Latest Version
                </button>
              </div>
            </div>
          </Section>

          {/* Bottom save button removed - using header button only */}
        </div>
      </main>
    </div>
  );
}

function Section({ 
  title, 
  children, 
  id, 
  isExpanded, 
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode;
  id: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 sm:p-5 lg:p-6 hover:bg-gray-50 transition-colors text-left"
      >
        <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold pr-4">{title}</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 sm:p-5 lg:p-6 xl:p-8 pt-0 border-t border-gray-100">
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
    <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 py-2 sm:py-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm sm:text-base">{label}</div>
        <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
        aria-label={`Toggle ${label}`}
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

