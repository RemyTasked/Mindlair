# Meet Cute 🎬

**Meet Cute** is a lightweight, AI-enhanced pre-meeting ritual that helps professionals mentally prepare five minutes before every meeting. It transforms routine calendar alerts into cinematic-professional focus moments — short, personalized cues that bring calm, confidence, and clarity.

## ✨ Features

### Core Capabilities

- **📅 Calendar Sync**: Automatically connects to Google Calendar or Outlook via OAuth
- **🤖 AI-Powered Cues**: Personalized pre-meeting messages generated based on meeting context
- **⏰ Smart Timing**: Sends cues 5 minutes before meetings (customizable)
- **🎯 Focus Scene**: Optional 5-minute web experience with:
  - Countdown timer
  - Breathing animation exercises
  - Guided reflection prompts
  - Beautiful, distraction-free UI

### Delivery Methods

- **📧 Email**: Beautiful HTML emails with your personalized cue
- **💬 Slack**: Native Slack messages via webhook
- **📱 SMS**: Text message alerts via Twilio

### Customization

- **Tone Selection**: Choose from Executive, Cinematic, Balanced, or Calm tones
- **Timing Control**: Set custom alert timing (1-30 minutes before)
- **Daily Wrap-Up**: Optional end-of-day reflection emails
- **Adaptive Learning**: System learns your preferences over time

## 🏗️ Architecture

### Backend (Node.js + TypeScript)

- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 for prompt generation
- **Calendar APIs**: Google Calendar API, Microsoft Graph API
- **Delivery Services**: SendGrid (Email), Slack Web API, Twilio (SMS)
- **Job Scheduler**: node-cron for automated meeting checks

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Routing**: React Router v6

### Key Technologies

- **Authentication**: JWT tokens, OAuth 2.0
- **Database ORM**: Prisma
- **API Client**: Axios
- **Logging**: Winston
- **Type Safety**: TypeScript throughout

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud Console project (for Google Calendar)
- Microsoft Azure app (for Outlook Calendar)
- OpenAI API key
- SendGrid API key (for email)
- Twilio account (for SMS, optional)
- Slack workspace (for Slack, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Meet Cute"
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd src/frontend && npm install && cd ../..
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following:

   ```env
   # Server
   NODE_ENV=development
   PORT=3000
   BASE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:5173

   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/meetcute?schema=public"

   # Secrets
   SESSION_SECRET=your-session-secret
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=7d

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

   # Microsoft OAuth
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-api-key

   # SendGrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@meetcute.app

   # Twilio (Optional)
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend (port 3000) and frontend (port 5173).

### OAuth Setup

#### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API and Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

#### Microsoft Outlook

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/auth/microsoft/callback`
4. Create a client secret
5. Add API permissions: `User.Read`, `Calendars.Read`, `offline_access`
6. Copy Application (client) ID and secret to `.env`

## 📖 Usage

### For Users

1. **Sign Up**: Visit the landing page and connect your calendar
2. **Configure**: Set your preferred tone and delivery methods
3. **Prepare**: Receive cues 5 minutes before meetings
4. **Focus**: Click the Focus Scene link for guided preparation
5. **Reflect**: Review your daily wrap-up each evening

### API Endpoints

#### Authentication
- `GET /api/auth/google/url` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/microsoft/url` - Get Microsoft OAuth URL
- `GET /api/auth/microsoft/callback` - Microsoft OAuth callback
- `GET /api/auth/verify` - Verify JWT token

#### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/preferences` - Update preferences
- `PUT /api/user/delivery` - Update delivery settings
- `GET /api/user/stats` - Get usage statistics
- `DELETE /api/user/calendar/:provider` - Disconnect calendar

#### Meetings
- `GET /api/meetings` - Get upcoming meetings
- `GET /api/meetings/:id` - Get meeting details

#### Focus Scene
- `GET /api/focus-scene/:userId/:meetingId` - Get focus scene data
- `POST /api/focus-scene/:userId/:meetingId/complete` - Complete session

## 🛠️ Development

### Project Structure

```
Meet Cute/
├── src/
│   ├── backend/
│   │   ├── middleware/          # Auth, error handling
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   │   ├── ai/              # Prompt generation
│   │   │   ├── calendar/        # Calendar integrations
│   │   │   ├── delivery/        # Email, Slack, SMS
│   │   │   └── scheduler.ts     # Cron jobs
│   │   ├── utils/               # Utilities, logger
│   │   └── server.ts            # Express app
│   └── frontend/
│       ├── src/
│       │   ├── components/      # Reusable components
│       │   ├── pages/           # Page components
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       └── vite.config.ts
├── prisma/
│   └── schema.prisma            # Database schema
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm run dev` - Start both backend and frontend in dev mode
- `npm run dev:backend` - Start only backend
- `npm run dev:frontend` - Start only frontend
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

### Database Schema

The application uses the following main models:

- **User**: User accounts and profile information
- **CalendarAccount**: Connected calendar credentials
- **UserPreferences**: Tone, timing, and feature preferences
- **DeliverySettings**: Channel preferences and contact info
- **Meeting**: Scheduled meetings with cue data
- **FocusSession**: Completed focus scene sessions
- **DailyReflection**: Daily statistics and insights

## 🎨 UI/UX Highlights

### Landing Page
- Clean, modern design with gradient backgrounds
- Clear value proposition and feature showcase
- One-click OAuth integration

### Focus Scene
- Cinematic full-screen experience
- Smooth animations with Framer Motion
- Breathing exercise with visual guidance
- Reflection prompt for intentional preparation
- Countdown timer to meeting start

### Dashboard
- Quick stats overview
- Upcoming meetings list
- Meeting preparation status indicators

### Settings
- Intuitive tone selection
- Easy delivery method configuration
- Real-time save feedback

## 🔒 Security

- JWT-based authentication
- OAuth 2.0 for calendar access
- Secure token storage and refresh
- Environment variable configuration
- SQL injection prevention via Prisma
- Input validation with Zod

## 📊 AI Personalization

Meet Cute uses GPT-4 to generate contextual messages:

- **Meeting Context**: Analyzes title, description, attendees
- **Tone Adaptation**: Matches user's selected tone preference
- **Back-to-Back Detection**: Adjusts messaging for consecutive meetings
- **Meeting Type Inference**: Recognizes 1:1s, standups, client calls, etc.

### Example AI-Generated Cues

**Executive Tone**:
> "Strategic session: Q4 Planning. Lead with clarity and decisive action."

**Cinematic Tone**:
> "Scene opens in 5 minutes. The boardroom awaits. Command the narrative."

**Calm Tone**:
> "Five minutes to center yourself. Breathe deeply. You're prepared."

## 🚢 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong secrets for `JWT_SECRET` and `SESSION_SECRET`
3. Configure production database URL
4. Set up SSL/TLS certificates
5. Configure production OAuth redirect URIs
6. Set up logging and monitoring
7. Enable CORS for production domains
8. Set up backup and disaster recovery

### Recommended Hosting

- **Backend**: Railway, Render, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Railway PostgreSQL, Supabase, AWS RDS
- **Files/Logs**: AWS S3, Google Cloud Storage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google Calendar API team
- Microsoft Graph API team
- All open-source contributors

## 📞 Support

For issues or questions, please open an issue on GitHub or contact support.

---

**Meet Cute** - Transform routine calendar alerts into cinematic-professional focus moments. 🎬

