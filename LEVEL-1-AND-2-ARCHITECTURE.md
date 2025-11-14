# Level 1 & Level 2 Cue Companion Architecture

## Overview

Meet Cute has two complementary cue systems that work together to support users during meetings:

- **Level 1: Smart Cues** - AI-generated cues delivered via push notifications (always active)
- **Level 2: Real-Time Coach** - On-device audio analysis for real-time composure coaching (opt-in per meeting)

## Level 1: Smart Cues (Existing System)

### How It Works
1. **Pre-Meeting**: AI generates personalized cues based on meeting context, user preferences, and historical data
2. **During Meeting**: Cues are delivered via push notifications at strategic moments
3. **Display**: `CueToast.tsx` component shows cues with Meet Cute branding
4. **Polling**: Dashboard polls for active cues every 30 seconds
5. **Meeting Detection**: `meetingDetection.ts` utility tracks which meeting is currently active

### Key Files
- `src/frontend/src/components/CueToast.tsx` - UI for displaying Level 1 cues
- `src/frontend/src/pages/Dashboard.tsx` - Polling logic and active meeting detection
- `src/frontend/src/utils/meetingDetection.ts` - Meeting window detection utility
- `src/backend/routes/cues.ts` - Backend cue generation and delivery

### User Experience
- **Always On**: Works automatically once user enables Cue Companion in Settings
- **No Permissions Needed**: Uses push notifications, no microphone access required
- **Delivery Methods**: Email, Slack, SMS, Push (configurable per alert type)
- **Tone Options**: Calm, Direct, Balanced, Executive, Cinematic

## Level 2: Real-Time Coach (New System)

### How It Works
1. **Opt-In**: User clicks toggle button during a meeting (in FocusScene)
2. **Microphone Access**: Requests permission to access microphone
3. **Calibration**: First 60 seconds establishes user's baseline speaking patterns
4. **Analysis**: Continuously analyzes non-verbal speech patterns:
   - Pace (rushing vs. steady)
   - Volume (loud vs. soft)
   - Pause rhythm (breathless vs. hesitant)
   - Energy curve (escalating vs. calm)
   - Monologuing (floor-taking vs. inviting replies)
5. **Cue Delivery**: 2-3 word cinematic cues appear briefly and auto-dismiss
6. **Adaptive Learning**: System learns user's tendencies and adjusts thresholds

### Key Files
- `src/frontend/src/components/Level2CueCompanion.tsx` - UI component with toggle and cue display
- `src/frontend/src/services/audioAnalyzer.ts` - Core audio analysis engine
- `src/frontend/src/services/mlFeatureExtractor.ts` - Advanced ML feature extraction
- `src/frontend/src/services/mlModelLoader.ts` - ONNX model loading and inference
- `src/frontend/src/services/adaptiveLearning.ts` - User pattern learning and threshold adjustment
- `src/frontend/src/pages/FocusScene.tsx` - Integration point (renders during 'reflection' and 'complete' phases)

### User Experience
- **Opt-In Per Meeting**: User decides each time whether to enable Level 2
- **Microphone Required**: Needs permission, but audio stays on-device
- **Floating Toggle**: Bottom-right button with status indicator:
  - Gray = off
  - Purple = active
  - Pulsing green = speaking detected
  - Orange = calibrating
- **Cue Display**: Minimal, 2-3 word cues that auto-dismiss after 3 seconds
- **End-of-Meeting Summary**: Pace trend, volume trend, cue stats, and suggestion

### Privacy Guarantees
- **No Recording**: Audio is never saved to disk or memory
- **No Transcription**: System analyzes *how* you sound, not *what* you say
- **100% On-Device**: All processing happens in the browser using WebAudio API
- **No Cloud**: Feature vectors are ephemeral, never sent to server
- **One-Tap Disable**: User can turn off at any time

## How They Work Together

### Meeting Flow
1. **5 Minutes Before Meeting**: Level 1 sends pre-meeting cue via push notification
2. **User Opens Focus Scene**: Completes breathing flow and prep ritual
3. **Meeting Starts**: 
   - Level 1 continues to send strategic cues via push notifications
   - User can optionally enable Level 2 for real-time audio coaching
4. **During Meeting**:
   - Level 1: Periodic push notifications with strategic cues
   - Level 2 (if enabled): Real-time audio analysis with brief on-screen cues
5. **Meeting Ends**:
   - Level 1: Post-meeting insights and reflection prompts
   - Level 2 (if enabled): End-of-meeting summary with trends and suggestions

### Complementary Strengths
- **Level 1**: Strategic, context-aware, works without microphone
- **Level 2**: Real-time, responsive, adapts to in-the-moment composure needs

### User Control
- **Settings Page**: Enable/disable Cue Companion globally, configure Level 1 preferences
- **Per-Meeting Toggle**: Enable/disable Level 2 for specific meetings
- **Granular Delivery**: Choose which alert types go to which channels (email, Slack, SMS, push)

## Technical Architecture

### Meeting Detection
```typescript
// src/frontend/src/utils/meetingDetection.ts
export function isMeetingActive(startTime: Date, endTime: Date): boolean {
  const now = new Date();
  const prepWindowStart = new Date(start.getTime() - 5 * 60 * 1000); // 5 min before
  return now >= prepWindowStart && now <= end;
}
```

### Level 1 Polling (Dashboard)
```typescript
// Poll for active cues every 30 seconds
const cueInterval = setInterval(() => {
  pollActiveCues();
}, 30 * 1000);

// Detect active meeting
const activeMeeting = getActiveMeeting(meetings);
if (activeMeeting) {
  setActiveMeetingId(activeMeeting.meetingId);
}
```

### Level 2 Toggle (FocusScene)
```typescript
// Level 2 is opt-in per meeting
const [level2Enabled, setLevel2Enabled] = useState(false);

// Render during meeting phases
{(currentPhase === 'reflection' || currentPhase === 'complete') && (
  <Level2CueCompanion
    enabled={level2Enabled}
    onToggle={setLevel2Enabled}
  />
)}
```

### Audio Analysis Pipeline (Level 2)
```
Microphone → WebAudio API → Feature Extraction → Z-Score Normalization → 
ML Model (optional) → Cue Trigger Logic → UI Display
```

### Adaptive Learning (Level 2)
```typescript
// Track user patterns
- Baseline speaking patterns (pace, volume, pause ratio)
- Cue effectiveness (did it help?)
- Spike prediction (when does user typically escalate?)
- Dynamic threshold adjustment (personalized triggers)
```

## Configuration

### Settings Page
- **Enable Cue Companion**: Master toggle for Level 1
- **Cue Tone**: Calm, Direct, Balanced, Executive, Cinematic
- **Cue Frequency**: Minimal, Balanced, Frequent
- **Delivery Channels**: Email, Slack, SMS, Push (with granular per-alert-type control)
- **Low Energy Window**: Time range for gentler cues
- **Level 2 Info Box**: Explains how to enable Level 2 during meetings

### In-Meeting Controls
- **Level 2 Toggle**: Floating button in bottom-right corner
- **Status Indicator**: Shows calibration progress, active status, speaking detection
- **Cue Display**: Minimal overlay with auto-dismiss
- **Summary Modal**: End-of-meeting insights (if Level 2 was used)

## Future Enhancements

### Level 1
- [ ] Calendar-based cue scheduling (send cues at specific times)
- [ ] Multi-meeting cue batching (prepare for back-to-back meetings)
- [ ] Cue effectiveness tracking (user ratings)

### Level 2
- [ ] Custom cue phrases (user-defined)
- [ ] Meeting type presets (1-on-1, team, presentation, interview)
- [ ] Export meeting summaries (PDF, email)
- [ ] Integration with Level 1 (share insights between systems)

### Both
- [ ] Unified analytics dashboard (Level 1 + Level 2 insights)
- [ ] Cross-session learning (improve over time)
- [ ] Team insights (aggregated patterns for managers)

