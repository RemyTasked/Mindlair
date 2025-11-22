# Settings & Notifications Simplification Plan

## Current Problems

1. **Too Many Notification Types** (9 types × 4 channels = 36 toggles)
   - Pre-meeting, In-meeting, Post-meeting, Presley Flow, Wellness, Winding Down, Meeting Insights, Morning Recap, Daily Wrap-Up
   - Each has 4 channel variants (Email, Slack, Push, SMS)
   - Creates a massive matrix that's overwhelming

2. **Settings Page is Crowded**
   - 10+ collapsible sections
   - Complex notification matrix table
   - Too many granular controls
   - Hard to understand what's actually important

3. **Notification Overload**
   - Users get too many notifications
   - No smart defaults or recommendations
   - Every notification type is enabled by default

## Proposed Simplification

### Phase 1: Consolidate Notification Types

**Group into 3 Core Categories:**

1. **Meeting Moments** (combines pre, during, post)
   - Pre-meeting focus (5 min before)
   - In-meeting cues (Cue Companion)
   - Post-meeting reflection
   - **Single toggle per channel** instead of 3 separate toggles

2. **Daily Rhythm** (combines Presley Flow, Morning Recap, Daily Wrap-Up, Winding Down)
   - Morning prep (Opening Scene)
   - Evening wrap (Presley Flow)
   - Winding down
   - **Single toggle per channel** instead of 4 separate toggles

3. **Wellness & Insights** (combines Wellness Reminders + Meeting Insights)
   - Wellness check-ins
   - Meeting insights/patterns
   - **Single toggle per channel** instead of 2 separate toggles

**Result:** 9 notification types → 3 categories (reduces from 36 toggles to 12 toggles)

### Phase 2: Simplify Channel Selection

**Smart Defaults Approach:**

Instead of 4 separate channel toggles with granular controls:
- **Primary Channel:** Choose ONE primary channel (Email OR Push)
- **Secondary Channels:** Optional add-ons (Slack, SMS)
- **Auto-disable logic:** If you choose Push as primary, email defaults to off for most types

**Result:** Instead of 4 master toggles + 36 granular toggles = 40 toggles, we have:
- 1 primary channel selector
- 2 optional secondary channels
- 3 category toggles per channel = 9 toggles total
- **Total: ~12 toggles instead of 40**

### Phase 3: Redesign Settings Page

**New Structure (6 sections instead of 10+):**

1. **Notifications** (simplified)
   - Primary channel selector (Email/Push)
   - Secondary channels (Slack/SMS) - optional
   - 3 category toggles with descriptions
   - "Advanced" link for power users (shows old granular matrix)

2. **Meeting Preferences**
   - Tone, Focus Scene timing, Prep Mode defaults
   - (Keep as-is, already simple)

3. **Daily Rhythm**
   - Presley Flow times (morning/evening)
   - Winding Down time
   - (Consolidate from separate sections)

4. **Focus & Sound**
   - Ambient sound settings
   - Voice narration
   - (Keep as-is)

5. **Privacy & Data**
   - Reflection settings
   - Data sharing preferences
   - (Keep as-is)

6. **Account**
   - Calendar connections
   - Delete account
   - (Keep as-is)

### Phase 4: Smart Notification Logic

**Backend Changes:**

1. **Notification Frequency Limits**
   - Max 1 notification per hour per category
   - Coalesce similar notifications (e.g., if 3 meetings in a row, send 1 summary)

2. **Smart Defaults**
   - New users: Only Push notifications for Meeting Moments
   - Email: Only for Daily Rhythm (morning/evening)
   - Slack/SMS: Opt-in only

3. **Quiet Hours**
   - Global quiet hours setting (e.g., 9 PM - 7 AM)
   - Overrides all notification types

4. **Notification Priority**
   - High: Pre-meeting focus (5 min before)
   - Medium: Daily rhythm, post-meeting
   - Low: Wellness reminders, insights

### Phase 5: UI/UX Improvements

1. **Notification Preview**
   - Show examples of what each category looks like
   - "You'll receive notifications like: '🎬 You're on in 5: Team Standup'"

2. **Frequency Indicators**
   - "You'll receive ~3-5 notifications per day with these settings"
   - Help users understand volume

3. **One-Click Presets**
   - "Minimal" - Only pre-meeting focus
   - "Balanced" - Pre-meeting + daily rhythm
   - "Full" - Everything enabled
   - Custom - Advanced controls

4. **Mobile-First Design**
   - Stack toggles vertically instead of table
   - Larger touch targets
   - Clearer visual hierarchy

## Implementation Steps

### Step 1: Backend Schema Changes
- Add `notificationPreferences` JSON field to UserPreferences
- Migrate existing DeliverySettings to new simplified structure
- Keep old schema for backward compatibility during migration

### Step 2: Backend Logic Updates
- Update scheduler to use new notification categories
- Implement smart defaults and frequency limits
- Add notification coalescing logic

### Step 3: Frontend Settings Page
- Redesign Settings.tsx with new structure
- Add preset buttons (Minimal/Balanced/Full)
- Add "Advanced" expandable section for power users
- Add notification preview/examples

### Step 4: Migration Script
- Migrate existing user preferences to new format
- Set smart defaults based on current settings
- Preserve user intent (if they had email enabled, keep it)

### Step 5: Testing & Rollout
- Test with existing users
- Monitor notification volume
- Gather feedback
- Iterate on defaults

## Expected Outcomes

1. **Reduced Complexity**
   - 40 toggles → 12 toggles (70% reduction)
   - 10+ sections → 6 sections (40% reduction)

2. **Better UX**
   - Clearer mental model (3 categories vs 9 types)
   - Faster setup (presets)
   - Less overwhelming

3. **Reduced Notification Fatigue**
   - Smart defaults prevent overload
   - Frequency limits prevent spam
   - Coalescing reduces duplicates

4. **Easier Maintenance**
   - Less code to maintain
   - Simpler logic
   - Fewer edge cases

## Migration Strategy

1. **Phase 1** (Week 1): Backend schema + logic
2. **Phase 2** (Week 2): Frontend redesign
3. **Phase 3** (Week 3): Migration script + testing
4. **Phase 4** (Week 4): Rollout + monitoring

## Rollback Plan

- Keep old DeliverySettings schema
- Feature flag to switch between old/new
- Can rollback frontend without backend changes
- Migration is reversible

