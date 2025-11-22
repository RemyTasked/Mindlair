# Notifications Summary

## What We Send

### 📧 **Email Notifications** (via SendGrid)

1. **Pre-Meeting Cues** (`sendPreMeetingCue`)
   - Sent 5-10 minutes before a meeting starts
   - Subject: "🎬 You're on in 5: [Meeting Title]"
   - Includes meeting title, cue message, and Focus Scene link
   - Controlled by: `emailPreMeetingCues` in DeliverySettings

2. **Post-Meeting Insights** (`sendPostMeetingInsight`)
   - Sent after a meeting ends
   - Subject: "✨ How did your meeting go? [Meeting Title]"
   - Includes meeting rating link
   - Controlled by: `emailPostMeetingCues` in DeliverySettings

3. **Presley Flow Sessions** (`sendPresleyFlowNotification`)
   - Morning: "☀️ Presley Flow is ready — prepare for today's scenes"
   - Evening: "🌙 Presley Flow is ready — preview tomorrow's scenes"
   - Sent at user-configured times
   - Controlled by: `emailPresleyFlow` in DeliverySettings

4. **Morning Recaps** (`sendMorningRecap`)
   - Sent at 7 AM daily
   - Subject: "☀️ Good morning — your first scene awaits"
   - Includes recap message and first meeting time
   - Controlled by: `emailMorningRecap` in DeliverySettings

5. **Daily Wrap-Ups** (`sendDailyWrapUp`)
   - Sent at user's evening flow time
   - Subject: "🌙 Daily Wrap-Up: Meet Cute"
   - Includes stats (meetings, scenes completed, focus sessions)
   - Controlled by: `emailDailyWrapUp` in DeliverySettings

6. **Wellness Reminders** (`sendWellnessReminder`)
   - Types: breathing, walk, mindful_moment, sleep, morning_energy
   - Sent based on user preferences
   - Controlled by: `emailWellnessReminders` in DeliverySettings

7. **Winding Down Notifications** (`sendWindingDownNotification`)
   - Sent at user's winding down time
   - Subject: "🌙 Time to Wind Down — Your evening ritual awaits"
   - Includes link to winding down session
   - Controlled by: `emailWindingDown` in DeliverySettings

### 📱 **Push Notifications** (Web Push via VAPID)

All the same types as emails, but sent as browser push notifications:
- Pre-meeting cues
- Post-meeting insights
- Presley Flow sessions
- Morning recaps
- Daily wrap-ups
- Wellness reminders
- Winding down notifications

Controlled by: `pushEnabled` and individual `push*` flags in DeliverySettings

### 💬 **Slack Notifications** (if configured)

Same types as emails, sent to user's Slack channel:
- Pre-meeting cues
- Post-meeting insights
- Presley Flow sessions
- Morning recaps
- Daily wrap-ups
- Wellness reminders
- Winding down notifications

Controlled by: `slackEnabled` and individual `slack*` flags in DeliverySettings

### 📱 **SMS Notifications** (if configured)

Limited types (usually too intrusive):
- Pre-meeting cues
- Presley Flow sessions
- Morning recaps
- Daily wrap-ups
- Wellness reminders

Controlled by: `smsEnabled` and individual `sms*` flags in DeliverySettings

## Scheduler Frequency

- **Every minute**: Check for upcoming meetings, evaluate and dispatch cues
- **Every 5 minutes**: Check for post-meeting insights
- **Every hour**: Daily wrap-ups, Presley Flow sessions, wellness reminders, winding down notifications
- **Daily at 7 AM**: Morning recaps

## User Preferences

All notifications respect user preferences in `DeliverySettings`:
- Master toggles: `emailEnabled`, `pushEnabled`, `slackEnabled`, `smsEnabled`
- Granular toggles for each notification type
- Quiet hours settings
- Per-meeting overrides

