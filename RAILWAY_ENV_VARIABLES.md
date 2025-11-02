# Railway Environment Variables - Meet Cute

Copy and paste these into Railway → Your Service → Variables tab

---

## 🔐 Authentication & Security

```
JWT_SECRET=e4ba3a8334ebc46fa8c284c295ea0e673ccd03fd88af883ba9b7d83b65cf028a
SESSION_SECRET=meet-cute-secret-change-in-production
```

---

## 🌐 URLs & Domain

```
FRONTEND_URL=https://www.meetcuteai.com
BASE_URL=https://www.meetcuteai.com
BACKEND_URL=https://www.meetcuteai.com
```

---

## 🔵 Google OAuth (Calendar Integration)

```
GOOGLE_CLIENT_ID=317117970533-c5ccu7sj627neq9g5jmlm5110umr7tel.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://www.meetcuteai.com/api/auth/google/callback
```

---

## 🤖 AI Services

```
OPENAI_API_KEY=sk-...your-openai-api-key...
GOOGLE_GEMINI_API_KEY=...your-gemini-api-key...
```

---

## 📧 Email (SendGrid)

```
SENDGRID_API_KEY=SG....your-sendgrid-api-key...
SENDGRID_FROM_EMAIL=noreply@meetcuteai.com
SENDGRID_FROM_NAME=Meet Cute
```

---

## 📱 SMS (Twilio)

```
TWILIO_ACCOUNT_SID=AC92d60c5af50a64a99f0eb10639ec0cd0
TWILIO_AUTH_TOKEN=...your-twilio-auth-token...
TWILIO_PHONE_NUMBER=+18335542437
```

---

## 🗄️ Database (PostgreSQL)

```
DATABASE_URL=postgresql://...your-railway-postgres-connection-string...
```

⚠️ **Note:** This is automatically set by Railway when you add a PostgreSQL database. If you need to manually set it, copy it from Railway → PostgreSQL Service → Variables → `DATABASE_URL`

---

## 🔷 Microsoft OAuth (Optional - if using Outlook)

```
MICROSOFT_CLIENT_ID=...your-microsoft-client-id...
MICROSOFT_CLIENT_SECRET=...your-microsoft-client-secret...
MICROSOFT_REDIRECT_URI=https://www.meetcuteai.com/api/auth/microsoft/callback
```

---

## ⚙️ Environment Settings

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

⚠️ **Note:** `PORT` is usually auto-set by Railway, but you can specify it if needed.

---

## 📋 Quick Copy Checklist

Copy these variables one by one into Railway:

- [ ] `JWT_SECRET`
- [ ] `SESSION_SECRET`
- [ ] `FRONTEND_URL`
- [ ] `BASE_URL`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `OPENAI_API_KEY`
- [ ] `GOOGLE_GEMINI_API_KEY`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `SENDGRID_FROM_NAME`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `DATABASE_URL` (auto-set by Railway PostgreSQL)
- [ ] `NODE_ENV=production`

---

## 🔗 Important URLs Reference

**Google Cloud Console:**
- Authorized Redirect URIs:
  - `https://www.meetcuteai.com/api/auth/google/callback`
  - `https://meetcuteai.com/api/auth/google/callback` (if using non-www)

**GitHub Repository:**
- `https://github.com/clodel-MeetCute/meet-cute`

**Website:**
- Production: `https://www.meetcuteai.com`
- Non-www: `https://meetcuteai.com`

---

## ⚠️ Important Notes

1. **Sensitive Keys:** Replace `...your-...` placeholders with your actual API keys/tokens
2. **Database URL:** Railway sets this automatically when PostgreSQL is added
3. **JWT_SECRET:** Use the generated one above or create a new secure random string
4. **Google Redirect URIs:** Make sure both www and non-www are added in Google Cloud Console
5. **All URLs:** Use `https://www.meetcuteai.com` for production

