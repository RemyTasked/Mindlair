# Meet Cute - Deployment Guide

This guide covers deploying Meet Cute to production.

## Production Checklist

Before deploying, ensure you have:

- [ ] Production database setup
- [ ] All API keys and credentials configured
- [ ] OAuth redirect URIs updated for production domain
- [ ] Environment variables secured
- [ ] SSL/TLS certificates configured
- [ ] Domain name configured
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented

## Deployment Options

### Option 1: Railway (Recommended)

Railway provides easy deployment for both backend and PostgreSQL.

#### Backend Deployment

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create and link the database

4. **Configure Environment Variables**
   - Go to your backend service
   - Click "Variables"
   - Add all variables from `.env`:
   ```
   NODE_ENV=production
   PORT=3000
   BASE_URL=https://your-app.railway.app
   FRONTEND_URL=https://your-frontend-domain.com
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SESSION_SECRET=your-production-secret
   JWT_SECRET=your-production-jwt-secret
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://your-app.railway.app/auth/google/callback
   ... (add all other variables)
   ```

5. **Deploy**
   - Railway automatically deploys on push
   - Check logs for any errors

#### Frontend Deployment (Vercel)

1. **Connect Repository**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Set root directory to `src/frontend`

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

4. **Deploy**
   - Vercel automatically deploys on push

### Option 2: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean
   - Click "Create" → "Apps"
   - Connect GitHub repository

2. **Configure Services**
   
   **Backend:**
   - Name: meetcute-api
   - Build Command: `npm install && npm run build`
   - Run Command: `npm start`
   - HTTP Port: 3000
   - Environment Variables: Add all from `.env`

   **Frontend:**
   - Name: meetcute-web
   - Build Command: `cd src/frontend && npm install && npm run build`
   - Output Directory: `src/frontend/dist`
   - Static site

3. **Add Database**
   - Create Managed PostgreSQL database
   - Link to backend service

4. **Deploy**
   - Click "Create Resources"

### Option 3: Heroku

#### Backend

```bash
# Create Heroku app
heroku create meetcute-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set BASE_URL=https://meetcute-api.herokuapp.com
heroku config:set FRONTEND_URL=https://meetcute-web.herokuapp.com
heroku config:set SESSION_SECRET=your-secret
# ... add all other variables

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

#### Frontend

```bash
# Create frontend app
heroku create meetcute-web

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Add build configuration in package.json
{
  "scripts": {
    "heroku-postbuild": "cd src/frontend && npm install && npm run build"
  }
}

# Deploy
git push heroku main
```

## Environment Variables Setup

### Production Secrets

Generate strong secrets for production:

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use these for:
- `SESSION_SECRET`
- `JWT_SECRET`

### OAuth Configuration

#### Google Cloud Console

1. Add production redirect URI:
   - `https://your-domain.com/auth/google/callback`

2. Update authorized domains:
   - Add your production domain

3. Submit for OAuth verification (if using sensitive scopes)

#### Microsoft Azure

1. Add production redirect URI:
   - `https://your-domain.com/auth/microsoft/callback`

2. Update CORS settings if needed

### Update Environment Variables

```env
NODE_ENV=production
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Use production values for all OAuth redirect URIs
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
MICROSOFT_REDIRECT_URI=https://api.yourdomain.com/auth/microsoft/callback
```

## Database Migration

```bash
# On your deployment platform, run:
npx prisma migrate deploy

# Or in your Railway/Heroku console
```

## SSL/TLS Configuration

Most platforms (Railway, Vercel, Heroku) provide SSL automatically.

For custom domains:
1. Add domain in platform settings
2. Update DNS records as instructed
3. SSL certificate is provisioned automatically

## Custom Domain Setup

### Railway
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS:
   - Add CNAME record pointing to Railway domain

### Vercel
1. Go to Project Settings → Domains
2. Add domain
3. Update DNS as instructed

## Monitoring and Logging

### Application Monitoring

**Option 1: Sentry**

```bash
npm install @sentry/node @sentry/tracing
```

Add to `server.ts`:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

**Option 2: LogRocket**

For frontend monitoring:
```bash
npm install logrocket
```

### Uptime Monitoring

- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **Better Uptime**: Status pages

### Log Management

**Option 1: LogDNA / Mezmo**
- Centralized log management
- Search and filter logs
- Alerts on errors

**Option 2: Platform Native**
- Railway: Built-in logs
- Heroku: Papertrail addon
- DigitalOcean: Native logging

## Performance Optimization

### Database

1. **Connection Pooling**
   ```typescript
   // Add to DATABASE_URL
   ?connection_limit=10&pool_timeout=10
   ```

2. **Indexes**
   - Already included in Prisma schema
   - Monitor slow queries

3. **Query Optimization**
   - Use `select` to limit fields
   - Use pagination for large datasets

### Caching

Add Redis for caching:

```bash
# Railway: Add Redis
# In your project: New → Database → Redis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache calendar events
await redis.setex(`calendar:${userId}`, 300, JSON.stringify(events));
```

### CDN

Use CDN for frontend assets:
- Vercel: Built-in CDN
- Cloudflare: Add in front of any host

## Security Hardening

### Rate Limiting

Add express-rate-limit:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### CORS Configuration

Update for production:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));
```

### Security Headers

Helmet is already configured, ensure it's working:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## Backup Strategy

### Database Backups

**Railway:**
- Automatic daily backups included
- Manual backups available

**Heroku:**
```bash
heroku pg:backups:schedule --at '02:00 America/Los_Angeles' DATABASE_URL
```

**DigitalOcean:**
- Automated backups in Managed Database settings

### Backup Schedule
- Daily automated backups
- Weekly full backups
- Monthly archives
- Test restore procedures regularly

## Rollback Strategy

### Quick Rollback

**Railway/Vercel:**
- Use deployment history to rollback
- One-click rollback to previous version

**Heroku:**
```bash
heroku releases:rollback
```

**Git-based:**
```bash
git revert HEAD
git push
```

## Health Checks

Add health check endpoint (already included):

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

Monitor this endpoint with your uptime service.

## Post-Deployment Testing

1. **OAuth Flows**
   - Test Google Calendar connection
   - Test Microsoft Outlook connection
   - Verify redirect URLs work

2. **Core Features**
   - Create test meeting
   - Verify cue is scheduled
   - Test email delivery
   - Test Focus Scene loads

3. **Performance**
   - Check API response times
   - Monitor database queries
   - Test under load

4. **Security**
   - Verify SSL is working
   - Test CORS configuration
   - Check security headers

## Scaling Considerations

### Horizontal Scaling

Railway/Heroku automatically scale horizontally.

For manual scaling:
- Use load balancer
- Multiple backend instances
- Session storage in Redis
- Database connection pooling

### Database Scaling

When you outgrow hobby tier:
1. Upgrade to production database plan
2. Consider read replicas for heavy read loads
3. Implement caching strategy

### Worker Processes

For high volume, separate scheduler into worker:

```typescript
// worker.ts
import { startScheduler } from './services/scheduler';
startScheduler();
```

Deploy as separate service.

## Troubleshooting

### Common Issues

**OAuth Redirect Mismatch:**
- Verify redirect URIs match exactly
- Check for http vs https
- No trailing slashes

**Database Connection:**
- Check connection string format
- Verify SSL mode for cloud databases
- Test connection from deployment environment

**Environment Variables:**
- List all variables: `heroku config` or check dashboard
- Verify no typos in variable names
- Restart after changing variables

### Debug Logs

Enable detailed logging in production:

```typescript
logger.level = process.env.LOG_LEVEL || 'info';
```

Set `LOG_LEVEL=debug` temporarily to troubleshoot.

## Cost Optimization

### Free Tier Limits

**Railway:** $5/month free
**Vercel:** Free for personal projects
**Heroku:** $7/month basic dyno
**SendGrid:** 100 emails/day free
**Twilio:** Pay as you go

### Estimated Monthly Costs

**Small Scale (< 100 users):**
- Hosting: $10-20/month
- Database: Included or $5/month
- SendGrid: Free tier
- OpenAI: ~$10-50/month
- **Total: $20-75/month**

**Medium Scale (100-1000 users):**
- Hosting: $25-50/month
- Database: $15-25/month
- Email: $15/month
- OpenAI: $50-200/month
- **Total: $105-300/month**

## Support and Maintenance

### Regular Maintenance Tasks

- [ ] Review logs weekly
- [ ] Check database performance
- [ ] Update dependencies monthly
- [ ] Review error tracking
- [ ] Test backup restore procedures
- [ ] Review security advisories

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update carefully
npm update

# Test thoroughly before deploying
```

---

You're now ready to deploy Meet Cute to production! 🚀

For issues, check logs first, then GitHub issues, or contact support.

