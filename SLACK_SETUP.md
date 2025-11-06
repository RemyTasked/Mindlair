# 🎬 Meet Cute - Slack Integration Setup Guide

Get your meeting cues and daily wrap-ups delivered directly to Slack!

---

## 📋 What You'll Get

When enabled, Meet Cute will send you:

### 🎬 Pre-Meeting Cues (5 minutes before)
- **Meeting title** and time
- **AI-generated focus cue** tailored to your meeting
- **"Enter Focus Scene →" button** to start your prep session
- Beautiful formatted message with emoji

### 🌙 Daily Wrap-Up (End of day)
- **Summary message** of your day's performance
- **Stats**: Total meetings, scene preps, focus sessions
- Reflection and insights

---

## 🚀 Setup Instructions

### Step 1: Create a Slack Incoming Webhook

1. **Go to Slack API**: https://api.slack.com/apps
2. **Click "Create New App"**
3. **Choose "From scratch"**
4. **Name your app**: "Meet Cute" (or whatever you prefer)
5. **Select your workspace**

### Step 2: Enable Incoming Webhooks

1. In your app settings, click **"Incoming Webhooks"** in the left sidebar
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. **Select the channel** where you want notifications (e.g., `#meet-cute` or DM yourself)
5. Click **"Allow"**

### Step 3: Copy Your Webhook URL

1. You'll see a **Webhook URL** that looks like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
2. **Copy this entire URL** - you'll need it in the next step

### Step 4: Configure Meet Cute

1. **Go to Meet Cute Settings**: https://www.meetcuteai.com/settings
2. Scroll to **"Delivery Settings"** section
3. **Toggle "Slack"** to ON
4. **Paste your Webhook URL** in the input field
5. Click **"Save Settings"** at the top

---

## ✅ Test Your Integration

### Option 1: Wait for a Meeting
- Schedule a test meeting in your calendar
- Wait for the pre-meeting cue (5 minutes before)
- Check your Slack channel

### Option 2: Trigger Daily Wrap-Up
- Daily wrap-ups are sent automatically at the end of your day
- You'll see a summary of all your meetings and sessions

---

## 🎨 What the Messages Look Like

### Pre-Meeting Cue Example:
```
🎬 You're on in 5

Team Sync - Product Roadmap

Bring focused energy and clear questions. This is your moment 
to align on priorities and move the roadmap forward with confidence.

[Enter Focus Scene →]
```

### Daily Wrap-Up Example:
```
🌙 Daily Wrap-Up

Today you showed up prepared and present. Three meetings, 
three opportunities to lead with clarity. Well done.

5               3               3
Meetings    Scene Preps    Focus Sessions
```

---

## 🔧 Troubleshooting

### Not receiving messages?

1. **Check webhook URL**: Make sure it's correct and complete
2. **Verify channel permissions**: Ensure the app has permission to post
3. **Check Slack app status**: Go to https://api.slack.com/apps and verify your app is active
4. **Test the webhook**: Use this curl command:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
   --data '{"text":"Test from Meet Cute!"}' \
   YOUR_WEBHOOK_URL
   ```

### Messages going to wrong channel?

1. Go back to your Slack app settings
2. Remove the old webhook
3. Add a new webhook to the correct channel
4. Update the URL in Meet Cute settings

### Want to change channels?

- You can create multiple webhooks for different channels
- Just add a new webhook in your Slack app settings
- Update the URL in Meet Cute

---

## 🎯 Pro Tips

### 1. **Create a Dedicated Channel**
   - Create a `#meet-cute` or `#focus` channel
   - Keep all your cues and wrap-ups organized
   - Easy to reference throughout the day

### 2. **DM Yourself**
   - Select "Direct Message" when adding webhook
   - Keep notifications private
   - Perfect for personal use

### 3. **Customize Notifications**
   - In Slack, set notification preferences for the channel
   - Choose "All new messages" for immediate alerts
   - Or "Mentions only" for quieter notifications

### 4. **Combine with Other Channels**
   - Enable Email + Slack for redundancy
   - Use Push for mobile, Slack for desktop
   - Mix and match based on your workflow

---

## 🔐 Security & Privacy

- **Webhook URLs are private**: Only you have access
- **Stored securely**: Encrypted in our database
- **No data sharing**: Messages only go to your workspace
- **Revocable**: Delete the webhook anytime in Slack settings
- **No Slack permissions needed**: We only send messages, never read

---

## 📱 Need Help?

- **Documentation**: Check our main README.md
- **Settings Page**: Visit https://www.meetcuteai.com/settings
- **Questions?**: The webhook URL is the only thing you need!

---

## 🎬 That's It!

You're all set! Your next meeting cue will arrive in Slack 5 minutes before showtime.

**Break a leg!** 🎭✨

