# Cue Companion – Level 1 Spec (Milestone A)

## Cue Catalogue

### Pre-Meeting Cues (5 min before start)
| Trigger | Cue Text | Actions |
|---------|----------|---------|
| Back-to-back detected | "Take one breath before you unmute." | `Breathe 20s`, `Hide` |
| High attendee count (>8) | "Big room. Lead with clarity." | `Focus Note`, `Hide` |
| Low-energy window (2-4 PM) | "Energy dip zone. Hydrate + posture check." | `Breathe 20s`, `Hide` |
| User mood = stressed | "Ground yourself. You've got this." | `Breathe 20s`, `Hide` |

### In-Meeting Cues
| Trigger | Cue Text | Actions |
|---------|----------|---------|
| T+12 min | "Breath check. Slow your next sentence." | `Breathe 20s`, `Hide` |
| 5 min remaining | "Land one clear outcome → who does what, by when?" | `Focus Note`, `Hide` |
| T+30 min (long meeting) | "Halfway. Pause for questions?" | `Focus Note`, `Hide` |

### Post-Meeting Cues (immediately after)
| Trigger | Cue Text | Actions |
|---------|----------|---------|
| Back-to-back next | "Next call in <X> min. Breathe first." | `Breathe 20s`, `Snooze 5m` |
| Meeting >45 min | "Stretch + hydrate before the next one." | `Hide` |

## Trigger Heuristics

### Calendar Density
- **Back-to-back**: `meeting.startTime <= previousMeeting.endTime + 5 min`
- **High density day**: `>5 meetings in 8-hour window`

### Time-of-Day Buckets
- **Low-energy**: 2-4 PM (configurable per user timezone)
- **Peak**: 9-11 AM
- **Wind-down**: 5-7 PM

### Attendee Thresholds
- **Small**: 2-4
- **Medium**: 5-8
- **Large**: 9+

### Mood Baseline (optional)
- User sets slider pre-meeting: `-1` (stressed) to `+1` (energized)
- Defaults to `0` (neutral) if not set

## Settings Schema

```typescript
interface CueSettings {
  enabled: boolean;
  tone: 'calm' | 'direct';
  channels: {
    toast: boolean;
    slack: boolean;
  };
  quietHours: Array<{ start: string; end: string }>; // HH:mm format
  cueFrequency: 'minimal' | 'balanced' | 'frequent';
  perMeetingOverrides: Record<string, boolean>; // meetingId -> enabled
  lowEnergyWindow: { start: string; end: string }; // default 14:00-16:00
}
```

### Frequency Mapping
- **minimal**: pre-meeting + 5-min-left only
- **balanced**: pre + T+12 + 5-min-left + post (if back-to-back)
- **frequent**: all cues enabled

## API Endpoints

### 1. Evaluate Cues (internal scheduler)
```
POST /api/cues/evaluate
Body: {
  meetingId: string;
  userId: string;
  startTime: ISO8601;
  endTime: ISO8601;
  title: string;
  attendeeCount: number;
  isBackToBack: boolean;
  previousMeetingEnd?: ISO8601;
  nextMeetingStart?: ISO8601;
  timeOfDayBucket: 'peak' | 'low-energy' | 'wind-down' | 'other';
  userMood?: -1 | 0 | 1;
}

Response: {
  cues: Array<{
    cueId: string;
    triggerAt: ISO8601;
    text: string;
    channel: 'toast' | 'slack';
    actions: Array<{ label: string; action: string }>;
  }>;
}
```

### 2. Dispatch Cue (scheduler → delivery)
```
POST /api/cues/dispatch
Body: {
  cueId: string;
  userId: string;
  meetingId: string;
  text: string;
  channel: 'toast' | 'slack';
  actions: Array<{ label: string; action: string }>;
}

Response: { status: 'queued' | 'sent' }
```

### 3. Get/Update Settings
```
GET /api/cues/settings
Response: CueSettings

PUT /api/cues/settings
Body: Partial<CueSettings>
Response: CueSettings
```

### 4. Record Telemetry
```
POST /api/cues/telemetry
Body: {
  cueId: string;
  meetingId: string;
  userId: string;
  action: 'clicked' | 'dismissed' | 'ignored';
  actionType?: 'breathe' | 'focus-note' | 'hide';
  timestamp: ISO8601;
}

Response: { status: 'recorded' }
```

### 5. Set Pre-Meeting Mood (optional)
```
POST /api/cues/mood
Body: {
  meetingId: string;
  userId: string;
  value: -1 | 0 | 1;
  timestamp: ISO8601;
}

Response: { status: 'saved' }
```

## Database Schema

### CueSettings Table
```sql
CREATE TABLE cue_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  tone VARCHAR(10) DEFAULT 'calm',
  toast_enabled BOOLEAN DEFAULT true,
  slack_enabled BOOLEAN DEFAULT false,
  quiet_hours JSONB DEFAULT '[]',
  cue_frequency VARCHAR(20) DEFAULT 'balanced',
  per_meeting_overrides JSONB DEFAULT '{}',
  low_energy_start TIME DEFAULT '14:00',
  low_energy_end TIME DEFAULT '16:00',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### CueTelemetry Table
```sql
CREATE TABLE cue_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cue_id VARCHAR(255) NOT NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  action_type VARCHAR(50),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(user_id, timestamp),
  INDEX(cue_id)
);
```

### MeetingMood Table (optional)
```sql
CREATE TABLE meeting_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 0, 1)),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);
```

## Frontend Components

### Toast Component
```typescript
interface CueToastProps {
  cueId: string;
  text: string;
  actions: Array<{ label: string; action: string }>;
  onAction: (action: string) => void;
  onDismiss: () => void;
}
```

**Position**: Bottom-right corner, 4rem from edge, z-index 9999
**Duration**: Auto-dismiss after 15s unless user interacts
**Animation**: Slide up + fade in

### Settings Panel (new section in Settings page)
- Toggle: Enable Cue Companion
- Dropdown: Tone (Calm / Direct)
- Dropdown: Frequency (Minimal / Balanced / Frequent)
- Checkboxes: Toast / Slack delivery
- Time pickers: Quiet hours + Low-energy window
- Per-meeting override list (future)

### Mood Slider (pre-meeting, optional)
- Appears 10 min before meeting start
- 3-state slider: Stressed / Neutral / Energized
- Saves to `/api/cues/mood`

## Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- [ ] Database migrations (CueSettings, CueTelemetry, MeetingMood)
- [ ] API routes skeleton
- [ ] Rules engine: evaluate cues based on heuristics
- [ ] Scheduler integration: call evaluate 5 min before meetings

### Phase 2: Frontend UI (Week 1.5)
- [ ] Toast component + event bus
- [ ] Settings panel for Cue Companion
- [ ] Mood slider (optional, can defer)
- [ ] Telemetry hooks on toast actions

### Phase 3: Slack Integration (Week 2)
- [ ] Slack self-DM fallback
- [ ] Channel preference logic
- [ ] Test end-to-end delivery

### Phase 4: QA & Polish (Week 2.5-3)
- [ ] Edge cases: timezone, back-to-back chains, quiet hours
- [ ] Performance: ensure cues don't block meeting sync
- [ ] Privacy copy review
- [ ] Telemetry dashboard (internal)

## Privacy & Consent
- No meeting content analyzed (title keywords only for high-level categorization)
- Telemetry is aggregated; no PII beyond userId + meetingId
- User can disable per-meeting or globally
- Quiet hours respected strictly

## Success Metrics (internal telemetry)
- Cue engagement rate (clicked / total shown)
- Action distribution (Breathe vs Focus Note vs Hide)
- Frequency preference distribution
- Time-to-dismiss (indicates relevance)

---

**Next Steps**: Review this spec, confirm trigger logic + cue text, then proceed to implementation Phase 1.

