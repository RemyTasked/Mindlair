# 🔒 Reflection Privacy Policy

## Your Data, Your Control

Meet Cute's post-meeting reflection system is designed with **privacy-first principles**. You have complete control over what data is collected, stored, and analyzed.

---

## What Data Is Collected?

### **Always Collected (When Reflections Are Enabled):**
- **Meeting Rating:** Great, Neutral, or Draining
- **Timestamp:** When the reflection was captured
- **Meeting Metadata:** Title, start/end time (already stored for meeting prep)

### **Optionally Collected (You Control This):**
- **One-Word Description:** Your single word describing the meeting
- **Emotional Tone:** AI-generated 2-3 word analysis (only if you provide a word)
- **Longer Notes:** Optional extended reflection text

---

## Privacy Controls

### **1. Enable/Disable Reflections**
**Setting:** `Enable Post-Meeting Reflections`  
**Default:** Enabled  
**What it does:** Turn off reflection prompts entirely. No data collected.

### **2. Private Reflection Mode** 🔒
**Setting:** `Private Reflection Mode`  
**Default:** Disabled  
**What it does:**
- ✅ Stores ratings (Great/Neutral/Draining) for trend analysis
- ✅ Shows high-level insights: "Energy rising", "Mostly positive meetings"
- ❌ Does NOT store or display your one-word descriptions
- ❌ Does NOT show specific reflection text in insights
- ❌ Does NOT use AI to analyze emotional tone

**Use case:** You want trend insights but maximum privacy.

### **3. Store Reflection Text**
**Setting:** `Store Reflection Text`  
**Default:** Enabled  
**What it does:**
- When **enabled:** Saves your one-word descriptions for personalized insights
- When **disabled:** Only stores ratings (Great/Neutral/Draining), no text

**Use case:** You want to capture reflections but not store any text.

### **4. Share Anonymized Data**
**Setting:** `Share Anonymized Data`  
**Default:** Disabled  
**What it does:**
- Allows Meet Cute to analyze **anonymized, aggregated patterns** to improve the product
- **Never includes:** Your name, email, meeting titles, attendees, or any identifiable info
- **Only includes:** Anonymous patterns like "users who rate meetings 'great' tend to have shorter meetings"

**Use case:** You want to help improve Meet Cute without sharing personal data.

---

## Data Storage & Security

### **Encryption**
- All reflection data is stored in an **encrypted PostgreSQL database**
- Data is encrypted **at rest** and **in transit** (HTTPS/TLS)
- Database access is restricted to authenticated backend services only

### **Data Location**
- Stored on secure cloud infrastructure (Railway + PostgreSQL)
- No third-party analytics or tracking on reflection data
- OpenAI API used for emotional tone analysis (only if you provide a word and have text storage enabled)

### **Data Retention**
- Reflections are stored indefinitely unless you:
  1. Delete your account (all data permanently deleted)
  2. Disable reflections (stops new data collection, existing data retained)
  3. Request data deletion via support

---

## What We DON'T Do

### ❌ **Never Analyzed Without Consent:**
- Meeting content (agendas, notes, transcripts)
- Attendee names or emails
- Calendar event descriptions
- Any communication during meetings

### ❌ **Never Shared:**
- Your reflection text with other users
- Your personal data with advertisers
- Identifiable data with third parties (except OpenAI for AI analysis, if enabled)

### ❌ **Never Used For:**
- Selling your data
- Targeted advertising
- Training AI models without explicit consent (anonymized data sharing setting)

---

## AI & Third-Party Processing

### **OpenAI Emotional Tone Analysis**
**When it's used:**
- Only when you provide a one-word description
- Only when "Store Reflection Text" is enabled
- Only when reflections are enabled

**What's sent to OpenAI:**
- Your rating (Great/Neutral/Draining)
- Your one-word description (e.g., "productive")
- **NOT sent:** Meeting title, attendees, calendar data, or any other personal info

**What's returned:**
- 2-3 word emotional tone (e.g., "Confident & Focused")

**OpenAI's Data Policy:**
- API data is **not used to train OpenAI models** (per OpenAI's API terms)
- Data is processed and discarded

---

## Your Rights

### **Access Your Data**
Request a copy of all your reflection data via Settings → Account Management → Export Data (coming soon)

### **Delete Your Data**
- **Individual reflections:** Cannot be deleted individually (by design, to maintain trend integrity)
- **All reflections:** Disable "Store Reflection Text" to stop new text storage
- **Complete deletion:** Delete your Meet Cute account to permanently erase all data

### **Modify Settings Anytime**
All privacy settings can be changed instantly in Settings → Privacy & Reflection Settings

---

## Private Reflection Mode in Detail

### **What You See:**
✅ "Your energy is rising"  
✅ "You had 5 meetings this week, mostly positive"  
✅ "Average meeting satisfaction: Great"  
✅ Trend charts (energy over time)

### **What You DON'T See:**
❌ "Your most common word: 'productive'"  
❌ Individual reflection details  
❌ Specific words or notes from past reflections

### **What's Stored:**
✅ Ratings only (Great/Neutral/Draining)  
❌ No text, no words, no notes

---

## Compliance & Standards

- **GDPR Compliant:** Right to access, delete, and export data
- **CCPA Compliant:** California privacy rights respected
- **SOC 2 Type II:** Infrastructure hosted on compliant platforms
- **HIPAA:** Not applicable (no health data collected)

---

## Questions or Concerns?

**Email:** privacy@meetcuteai.com  
**Settings:** Adjust privacy controls anytime in Settings → Privacy & Reflection Settings  
**Support:** Contact us for data deletion, export, or privacy questions

---

## Updates to This Policy

Last updated: November 6, 2025

We'll notify you of any material changes to this policy via email or in-app notification.

---

**Bottom Line:**  
Your reflections are **yours**. We store them securely, use them only for your insights, and give you complete control over what's collected and how it's used. Privacy isn't an afterthought—it's the foundation.

🔒 **Your data. Your control. Always.**

