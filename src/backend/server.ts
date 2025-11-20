// Meet Cute Backend Server - v1.11.3
// Includes: PWA Support, Director's Insights, Post-Meeting Reflections, Privacy Controls, AI Emotional Analysis, Winding Down Session, Onboarding Flow, Weekend Flow
// Latest: NEW LOGO FILENAME to bypass iOS aggressive caching + Audio + Migrations
// Cache-Busting: New filename strategy, Service Worker v12, Content hashes
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './services/scheduler';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import meetingRoutes from './routes/meeting';
import calendarRoutes from './routes/calendar';
import focusSceneRoutes from './routes/focusScene';
import webhookRoutes from './routes/webhook';
import ratingRoutes from './routes/rating';
import presleyFlowRoutes from './routes/presleyFlow';
import pushNotificationRoutes from './routes/pushNotifications';
import slackRoutes from './routes/slack';
import reflectionRoutes from './routes/reflections';
import windingDownRoutes from './routes/windingDown';
import cuesRoutes from './routes/cues';
import spotifyRoutes from './routes/spotify';
import focusRoomsRoutes from './routes/focusRooms';
import testRoutes from './routes/test';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure PostgreSQL session store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
// Configure helmet with PWA-friendly CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline scripts for PWA/service worker registration
        "'unsafe-eval'", // Allow eval for development/debugging
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "blob:", "https:"], // Allow images from various sources
      connectSrc: ["'self'", "https://www.googleapis.com", "https://graph.microsoft.com"], // Allow API calls
      fontSrc: ["'self'", "data:"], // Allow fonts
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"], // Allow audio/video
      frameSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"], // Allow service workers
      manifestSrc: ["'self'"], // Allow PWA manifest
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable ETag for cache validation
app.set('etag', 'strong');
app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'meet-cute-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/focus-scene', focusSceneRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/presley-flow', presleyFlowRoutes);
app.use('/api/push', pushNotificationRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/winding-down', windingDownRoutes);
app.use('/api/cues', cuesRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/focus-rooms', focusRoomsRoutes);
app.use('/api/test', testRoutes);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === 'production') {
  // In Docker, frontend is built to /app/src/frontend/dist
  const frontendDistPath = path.resolve('/app/src/frontend/dist');
  
  // Serve static assets with proper cache-control headers
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, filePath) => {
      // Cache hashed assets (JS/CSS with content hashes) for 1 year
      if (filePath.match(/\.(js|css)$/) && filePath.match(/-[a-zA-Z0-9]{8,}\.(js|css)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Cache images/fonts for 1 week but allow revalidation
      else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
      }
      // Don't cache HTML, manifest, service worker
      else if (filePath.match(/\.(html|json|js)$/) && 
               (filePath.includes('index.html') || 
                filePath.includes('manifest.json') || 
                filePath.includes('service-worker'))) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Default: cache for 1 hour with revalidation
      else {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
    }
  }));
  
  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Meet Cute server running on port ${PORT}`);
  logger.info(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start background scheduler
  startScheduler();
  logger.info('⏰ Meeting scheduler started');
});

export default app;

