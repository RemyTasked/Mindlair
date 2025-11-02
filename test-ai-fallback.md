# Testing AI Fallback System

## Step 1: Check Health Status

Visit or run:
```bash
curl https://www.meetcuteai.com/api/test/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "ai": {
    "providers": ["OpenAI", "Gemini"],
    "primary": "OpenAI",
    "fallback": "Gemini",
    "available": true
  },
  "services": {
    "openai": true,
    "gemini": true,
    ...
  }
}
```

✅ **Success:** Both providers show up  
⚠️ **Issue:** Only one provider or `available: false`

---

## Step 2: Run Full AI Test

Visit: **https://www.meetcuteai.com/api/test/ai**

**Expected Results:**

### Test 1: AI Provider Configuration ✅
```json
{
  "name": "AI Provider Configuration",
  "status": "passed",
  "details": {
    "configuredProviders": ["OpenAI", "Gemini"],
    "primaryProvider": "OpenAI",
    "fallbackProvider": "Gemini",
    "openaiConfigured": true,
    "geminiConfigured": true
  }
}
```

### Test 2: OpenAI API Connection ✅
Should see:
- `provider: "OpenAI"`
- `model: "gpt-4o-mini-2024-07-18"` (or similar)
- Actual generated text

### Test 3: Meet Cute Prompt Generation ✅
Should see:
- Pre-meeting cue generated
- Length > 0
- Professional message

### Test 4: Presley Flow Generation ✅
Should see:
- Opening scene, meeting previews, visualization
- Complete JSON structure

---

## Step 3: Check Railway Logs

1. Go to Railway dashboard
2. Click on your Meet Cute service
3. Go to **Deployments** → Latest deployment
4. Click **View Logs**

**Look for these log entries:**

✅ **On Startup:**
```
[INFO] AI Service initialized
  totalProviders: 2
  configuredProviders: ["OpenAI", "Gemini"]
```

✅ **During AI Requests:**
```
[INFO] Attempting AI request with OpenAI
[INFO] OpenAI response received
  provider: OpenAI
  model: gpt-4
  tokensUsed: 150
```

---

## Step 4: Test Fallback (Optional Advanced Test)

To test that Gemini actually works as fallback:

1. **Temporarily break OpenAI** (in Railway):
   - Go to Variables
   - Rename `OPENAI_API_KEY` to `OPENAI_API_KEY_BACKUP`
   - Wait for redeploy

2. **Test again:**
   - Visit `/api/test/ai`
   - Should now see `provider: "Gemini"`
   - All tests should still pass!

3. **Restore OpenAI:**
   - Rename back to `OPENAI_API_KEY`
   - System switches back to OpenAI

---

## What You're Looking For

### ✅ Perfect Setup:
- Health shows both providers
- Test 1 shows both configured
- Tests 2-4 use OpenAI (primary)
- Logs show "OpenAI" as provider

### ⚠️ Common Issues:

**Issue 1: Only OpenAI shows**
- Check Gemini API key is correct
- Key should start with `AIza`
- Variable name must be exactly `GOOGLE_GEMINI_API_KEY`

**Issue 2: "No AI providers configured"**
- At least one key must be valid
- Check for typos in variable names
- Verify keys are active in provider dashboards

**Issue 3: Tests fail**
- Check Railway logs for specific errors
- Verify network/firewall not blocking API calls
- Check provider status pages

---

## Success Confirmation

You'll know it's working when you see:

1. ✅ Both providers in health check
2. ✅ "OpenAI" used for all test requests
3. ✅ Logs show successful AI generation
4. ✅ All 4 tests pass

**Your app now has:**
- Primary AI: OpenAI GPT-4 (high quality)
- Backup AI: Gemini 1.5-Flash (free tier)
- Automatic failover if OpenAI has issues
- Zero user-facing errors

🎬 **You're fully protected!**

