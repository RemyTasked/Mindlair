// Mind Garden Backend Server - v2.0.0
// Calendar-integrated mental fitness with contextual micro-interventions
// Features: Flows, Garden, Focus Rooms, Games Hub
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
import webhookRoutes from './routes/webhook';
import pushNotificationRoutes from './routes/pushNotifications';
import slackRoutes from './routes/slack';
import focusRoomsRoutes from './routes/focusRooms';
import gamesRoutes from './routes/games';
import emotionGardenRoutes from './routes/emotionGarden';
import flowsRoutes from './routes/flows';
import gardenRoutes from './routes/garden';
import analysisRoutes from './routes/analysis';
import extensionAuthRoutes from './routes/extensionAuth';
import thoughtsRoutes from './routes/thoughts';

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
        "'unsafe-inline'",
        "'unsafe-eval'",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://www.googleapis.com", "https://graph.microsoft.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
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
    secret: process.env.SESSION_SECRET || 'mind-garden-secret',
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

// API Routes - Core
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/push', pushNotificationRoutes);
app.use('/api/slack', slackRoutes);

// API Routes - Focus Rooms & Audio
app.use('/api/focus-rooms', focusRoomsRoutes);

// API Routes - Mind Garden Features
app.use('/api/flows', flowsRoutes);
app.use('/api/garden', gardenRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/thoughts', thoughtsRoutes);
app.use('/api/emotion-garden', emotionGardenRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/extension', extensionAuthRoutes);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.resolve('/app/src/frontend/dist');
  
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.match(/\.(js|css)$/) && filePath.match(/-[a-zA-Z0-9]{8,}\.(js|css)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, must-revalidate');
      } else if (filePath.match(/\.(html|json|js)$/) && 
                 (filePath.includes('index.html') || 
                  filePath.includes('manifest.json') || 
                  filePath.includes('service-worker'))) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
    }
  }));
  
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🌱 Mind Garden server running on port ${PORT}`);
  logger.info(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start background scheduler
  startScheduler();
  logger.info('⏰ Scheduler started');
});

export default app;
