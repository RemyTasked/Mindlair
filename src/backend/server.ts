import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { startScheduler } from './services/scheduler';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import meetingRoutes from './routes/meeting';
import focusSceneRoutes from './routes/focusScene';
import webhookRoutes from './routes/webhook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
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
app.use('/api/focus-scene', focusSceneRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === 'production') {
  // In Docker, frontend is built to /app/src/frontend/dist
  const frontendDistPath = path.resolve('/app/src/frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (_req, res) => {
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

