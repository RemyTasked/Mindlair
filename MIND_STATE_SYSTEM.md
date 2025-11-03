# Mind State Tracking & Adaptive Wellness System

## Overview
Meet Cute now features an intelligent mind state tracking system that learns from your emotional patterns before meetings and provides personalized, grounded support.

## Key Features

### 1. Mind State Selector in Focus Sessions
When users start a focus session before a meeting, they select their current mind state:
- **😌 Calm**: Centered and peaceful
- **😰 Stressed**: Tense or overwhelmed
- **🎯 Focused**: Alert and ready
- **🌫️ Unclear**: Foggy or uncertain

### 2. Adaptive Breathing Flows
Each mind state triggers a customized breathing exercise:

- **Calm (4-4-6)**: Balanced breathing to maintain centered state
- **Stressed (4-7-8)**: Extended exhales to activate relaxation response
- **Focused (3-3-3)**: Energizing rhythm to sharpen attention
- **Unclear (5-5-7)**: Grounding flow to bring mental clarity

Each flow runs for 5 cycles with animated visual guidance and specific instructions.

### 3. Mind State Pattern Analysis
The system analyzes your mind state history to identify:

#### Temporal Patterns
- **Stressful days of week**: e.g., "Mondays and Fridays tend to be more stressful"
- **Stressful times of day**: Morning, afternoon, or evening stress patterns
- **Recent trends**: Improving, stable, or worsening stress levels

#### Meeting-Type Patterns
- Which types of meetings (1:1, team, client, etc.) cause the most stress
- Stress rates for each meeting type
- Historical performance correlations

#### Overall Metrics
- Stress frequency percentage across all meetings
- Most common mind state
- Personalized insights and recommendations

### 4. Grounded AI Cues
Pre-meeting cues are now enhanced with mind state patterns:

**Before:**
> "You've got this! Go crush that client meeting!"

**After (for user with high client meeting stress):**
> "Client meetings have been challenging lately. You've prepared well—focus on listening first, then responding. Take three deep breaths before joining."

The AI provides:
- **Practical strategies** instead of generic motivation
- **Acknowledgment** of stress patterns
- **Specific techniques** based on what typically causes stress
- **Grounding language** for stressed users vs. energizing language for calm users

### 5. Personalized Presley Flow (Evening Prep)
Tomorrow's meeting preview now includes mind state insights:

```
MIND STATE INSIGHTS FOR TOMORROW:
- Tomorrow is Monday, which tends to be more stressful for you. Plan some extra self-care.
- You have a client meeting tomorrow, which you often find stressful. Extra preparation could help.
- You have morning meetings tomorrow, which can be stressful for you. Consider a calming morning routine.
```

The AI incorporates these insights naturally into the evening mental rehearsal script.

### 6. Enhanced Morning Recaps
Morning messages reference your typical stress patterns for the day ahead:

```
Note: You have morning meetings tomorrow, which can be stressful for you. 
Consider a calming morning routine.
```

### 7. Adaptive Wellness Reminders
Throughout the day (9 AM - 6 PM), the system sends personalized wellness check-ins:

#### Reminder Types
- **🌬️ Breathing**: Deep breathing exercises
- **🚶 Walking**: Suggestions to step outside
- **🧘 Mindful Moments**: Brief meditation prompts

#### Personalization Logic
- **High stress users** (>50% stressed sessions): More frequent breathing reminders
- **Worsening trend**: Extra supportive messages and break suggestions
- **Afternoon slump** (2-4 PM): Walking suggestions
- **Frequency**: Configurable (default: every 3 hours)

#### Example Messages
For high-stress user:
> "You've been experiencing high stress before meetings lately. Take a moment to reset with some deep breaths."

For afternoon energy dip:
> "Afternoon energy dip? A quick walk can refresh your mind and boost your focus."

## Database Schema

### FocusSession (Enhanced)
```prisma
model FocusSession {
  mindState         String?  // "calm", "stressed", "focused", "unclear"
  breathingFlowType String?  // Type of breathing flow used
  // ... existing fields
}
```

### WellnessCheckIn (New)
```prisma
model WellnessCheckIn {
  id        String
  userId    String
  type      String   // "breathing", "walk", "mindful_moment"
  completed Boolean
  mindState String?
  notes     String?
  createdAt DateTime
}
```

### UserPreferences (Enhanced)
```prisma
model UserPreferences {
  enableWellnessReminders     Boolean @default(true)
  wellnessReminderFrequency   Int     @default(3)  // Hours between reminders
  // ... existing fields
}
```

## API Endpoints

### Complete Focus Session
```typescript
POST /api/focus-scene/:userId/:meetingId/complete
Body: {
  breathingExerciseCompleted: boolean,
  reflectionNotes?: string,
  mindState?: "calm" | "stressed" | "focused" | "unclear"
}
```

## Pattern Analysis Insights

The system provides actionable insights like:

- "You experience stress before meetings more than half the time. Consider building in more buffer time between meetings."
- "Monday and Friday tend to be more stressful for you. Extra self-care on these days could help."
- "Morning meetings often find you stressed. A morning routine or earlier wake-up time might help."
- "Client meetings are particularly stressful (75% of the time). Extra preparation for these might help."
- "Your stress levels have been improving recently. Keep up whatever you're doing!"

## User Experience Flow

1. **Pre-Meeting (5-10 min before)**
   - User receives personalized cue email (now informed by stress patterns)
   - Clicks "Start Focus Session"
   - Selects current mind state
   - Completes adaptive breathing flow (5 cycles, ~2-3 minutes)
   - Reflects and enters meeting

2. **Evening (8 PM)**
   - Receives Presley Flow with tomorrow's insights
   - Learns which meetings might be stressful and why
   - Gets specific preparation strategies

3. **Morning (7 AM)**
   - Receives morning recap with day-specific insights
   - Reminded of stress patterns for the day

4. **Throughout Day (9 AM - 6 PM)**
   - Receives wellness reminders every 3 hours (configurable)
   - Reminders personalized based on stress patterns and time of day

## Benefits

### For Users
- **Self-awareness**: Understand your stress patterns
- **Practical support**: Get grounded advice, not just motivation
- **Proactive wellness**: Regular check-ins prevent burnout
- **Personalization**: System learns and adapts to your patterns

### For Meeting Performance
- **Better preparation**: Know when to prepare more
- **Stress management**: Tools to handle stressful meeting types
- **Pattern breaking**: Identify and address recurring stress triggers
- **Improved outcomes**: More centered, prepared state before meetings

## Future Enhancements

Potential additions:
- Mobile app with push notifications for wellness reminders
- Integration with wearables (heart rate, sleep data)
- Team insights (anonymized patterns across organization)
- Customizable breathing flow patterns
- Voice-guided breathing exercises
- Wellness streak tracking and gamification

