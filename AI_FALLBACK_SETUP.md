# AI Fallback System - Setup Guide

Meet Cute now supports **multiple AI providers** with automatic fallback for maximum reliability! 🚀

## 🎯 How It Works

The system tries AI providers in priority order:
1. **OpenAI GPT-4** (Primary) - High quality, production-tested
2. **Google Gemini** (Fallback) - Fast, cost-effective backup

If OpenAI fails (API down, rate limit, timeout), the system **automatically** switches to Gemini without any user-facing errors.

## 📊 Current Status

Your current setup:
- **Primary:** OpenAI ✅ (Already configured)
- **Fallback:** Gemini ⚠️ (Needs configuration)

## 🔧 Setting Up Gemini (Fallback)

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Get API Key"**
3. Click **"Create API key in new project"** (or use existing project)
4. Copy the API key (starts with `AIza...`)

**Note:** Gemini has a generous **FREE tier**:
- 15 requests per minute
- 1,500 requests per day
- Perfect for fallback usage

### Step 2: Add to Railway

1. Go to your Railway dashboard
2. Select your Meet Cute project
3. Go to **Variables** tab
4. Click **"+ New Variable"**
5. Add:
   - **Name:** `GOOGLE_GEMINI_API_KEY`
   - **Value:** Your API key (paste it)
6. Click **"Add"**

### Step 3: Redeploy

Railway will automatically redeploy with the new variable.

## ✅ Verify Setup

Once deployed, test your AI fallback system:

### Check Health Endpoint
```bash
curl https://www.meetcuteai.com/api/test/health
```

You should see:
```json
{
  "ai": {
    "providers": ["OpenAI", "Gemini"],
    "primary": "OpenAI",
    "fallback": "Gemini",
    "available": true
  }
}
```

### Run Full AI Test
Visit: `https://www.meetcuteai.com/api/test/ai`

This will show which provider was used for each test.

## 🎬 What Gets Generated

All AI features use the fallback system:
- ✅ Pre-meeting cues
- ✅ Evening Presley Flow sessions
- ✅ Morning recaps
- ✅ Daily wrap-ups
- ✅ Meeting type inference

## 📝 Logs

The system logs which provider is used for each request:

```
[INFO] Attempting AI request with OpenAI
[INFO] AI request succeeded: provider=OpenAI model=gpt-4
```

If OpenAI fails:
```
[WARN] OpenAI failed, trying next provider
[INFO] Attempting AI request with Gemini
[INFO] AI request succeeded: provider=Gemini model=gemini-1.5-flash
```

## 💰 Cost Comparison

| Feature | OpenAI GPT-4 | Gemini 1.5 Flash |
|---------|--------------|------------------|
| Input (1M tokens) | ~$30 | FREE (up to limit) |
| Output (1M tokens) | ~$60 | FREE (up to limit) |
| Free Tier | None | 1,500 req/day |
| Best For | Primary, high quality | Fallback, cost savings |

## 🚨 Fallback Scenarios

The system automatically falls back to Gemini when:
1. ⏱️ **OpenAI API timeout** (>30 seconds)
2. 🚫 **Rate limit exceeded** (too many requests)
3. 💥 **API error** (500, 503, etc.)
4. 🔌 **Network issues** (connection failed)
5. 🔑 **Authentication error** (invalid key)

## 🔄 Future Providers

Want to add more AI providers? The system is designed to support:
- Anthropic Claude
- Cohere
- Azure OpenAI
- AWS Bedrock

Just let me know and I can add them! 🎯

## 🛠️ Troubleshooting

### "No AI providers configured"
- Check that at least one API key is set (OpenAI or Gemini)
- Verify keys are correct and active

### "All AI providers failed"
- Check Railway logs for specific errors
- Verify both API keys are valid
- Check provider status pages

### Gemini returns different quality
- Gemini is optimized for speed over quality
- For critical requests, OpenAI is always tried first
- Gemini is 90%+ as good for most use cases

## 📞 Support

If you see errors or want to adjust the fallback behavior, the code is in:
- `/src/backend/services/ai/aiService.ts` - Main fallback logic
- `/src/backend/services/ai/providers/` - Individual providers

