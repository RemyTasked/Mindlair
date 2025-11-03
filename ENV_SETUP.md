# Environment Variables Setup Guide

This guide explains how to securely configure environment variables for Meet Cute.

## Required Environment Variables

### Database
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```
- **Source**: Railway PostgreSQL or your database provider
- **Security**: Never expose this URL publicly
- **Format**: Standard PostgreSQL connection string

### Application Settings
```bash
NODE_ENV="production"
PORT=3000
BASE_URL="https://meetcuteai.com"
FRONTEND_URL="https://meetcuteai.com"
```
- **NODE_ENV**: Set to `production` for live deployment
- **PORT**: Server port (Railway sets this automatically)
- **BASE_URL**: Your backend API URL
- **FRONTEND_URL**: Your frontend URL

### JWT Secret
```bash
JWT_SECRET="your-super-secret-jwt-key-change-this"
```
- **Purpose**: Signs and verifies authentication tokens
- **Security**: Use a strong random string (32+ characters)
- **Generate**: `openssl rand -base64 32`
- **Rotate**: Every 90 days recommended

### Google OAuth
```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://meetcuteai.com/auth/callback"
```
- **Setup**: https://console.cloud.google.com/
- **Scopes Required**: 
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/calendar.readonly`
- **Security**: Enable only necessary scopes (read-only calendar)

### Microsoft OAuth
```bash
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_REDIRECT_URI="https://meetcuteai.com/auth/callback"
```
- **Setup**: https://portal.azure.com/
- **Permissions Required**:
  - `User.Read`
  - `Calendars.Read`
- **Security**: Request only read permissions

### OpenAI API
```bash
OPENAI_API_KEY="sk-your-openai-api-key"
```
- **Setup**: https://platform.openai.com/
- **Model Used**: GPT-4 (configurable in code)
- **Security**: 
  - Monitor usage to prevent abuse
  - Set spending limits in OpenAI dashboard
  - Rotate keys every 90 days

### Google Gemini API
```bash
GEMINI_API_KEY="your-gemini-api-key"
```
- **Setup**: https://makersuite.google.com/app/apikey
- **Purpose**: Fallback AI provider if OpenAI fails
- **Security**: Enable API restrictions by IP if possible

### SendGrid (Email)
```bash
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@meetcuteai.com"
```
- **Setup**: https://app.sendgrid.com/
- **Purpose**: Sending pre-meeting cue emails
- **Security**: 
  - Use API key with minimal permissions (Mail Send only)
  - Verify sender domain (SPF, DKIM, DMARC)

### Twilio (SMS)
```bash
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```
- **Setup**: https://www.twilio.com/console
- **Purpose**: Sending pre-meeting cue SMS
- **Security**: 
  - Use subaccount for isolation
  - Enable geographic permissions (restrict to needed countries)

## Security Best Practices

### 1. Secret Management
- ✅ Store secrets in Railway environment variables
- ✅ Never commit secrets to Git
- ✅ Use different secrets for dev/staging/production
- ❌ Don't hardcode secrets in code
- ❌ Don't share secrets via email/Slack

### 2. Key Rotation
Rotate these keys regularly:
- **JWT_SECRET**: Every 90 days
- **API Keys**: Every 90 days
- **OAuth Secrets**: Annually or if compromised

### 3. Access Control
- Enable 2FA on all service accounts
- Use least-privilege API keys
- Limit API key permissions to only what's needed
- Monitor API usage for anomalies

### 4. Monitoring
Set up alerts for:
- Unusual API usage spikes
- Failed authentication attempts
- Rate limit hits
- Unexpected geographic access

### 5. Incident Response
If a secret is compromised:
1. **Immediately** rotate the compromised secret
2. Review access logs for unauthorized usage
3. Update the secret in Railway
4. Redeploy the application
5. Notify affected users if necessary

## Setting Up on Railway

1. **Navigate to your Railway project**
2. **Click on your service**
3. **Go to "Variables" tab**
4. **Add each environment variable**
5. **Click "Deploy" to apply changes**

### Railway-Specific Notes
- Railway automatically sets `PORT` - don't override it
- Use Railway's PostgreSQL plugin for `DATABASE_URL`
- Variables are encrypted at rest
- Changes trigger automatic redeployment

## Verification

After setting up environment variables, verify they're working:

```bash
# Check if variables are loaded (backend)
curl https://your-app.railway.app/api/test/health

# Expected response:
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

## Troubleshooting

### "Missing required environment variable"
- Check spelling and capitalization
- Ensure variable is set in Railway
- Redeploy after adding variables

### "Invalid OAuth credentials"
- Verify Client ID and Secret are correct
- Check redirect URI matches exactly
- Ensure OAuth app is enabled

### "Database connection failed"
- Verify DATABASE_URL format
- Check database is running
- Ensure IP whitelist includes Railway IPs

## Additional Resources

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth Setup](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Support

For environment variable issues:
- **Email**: support@meetcuteai.com
- **Security Issues**: security@meetcuteai.com

