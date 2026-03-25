# Mindlayer

**Map how you think.**

Mindlayer captures what you read and watch, maps your beliefs over time, and gently surfaces perspectives you haven't encountered yet.

## Project Structure

```
mindlayer/
├── apps/
│   ├── desktop/          # Tauri desktop app (Mac/Windows/Linux)
│   │   ├── src/          # React frontend
│   │   └── src-tauri/    # Rust backend with capture modules
│   ├── web/              # Next.js web dashboard
│   └── mobile/           # React Native mobile app (future)
├── packages/
│   └── shared/           # Shared TypeScript types
└── package.json          # Monorepo root
```

## Desktop App

The desktop app runs in the background and captures content consumption:

- **URL Monitoring**: Detects browser URLs and dwell time (Safari, Chrome, Arc, Edge, Brave)
- **Audio Capture**: Transcribes podcasts, audiobooks, and video audio (via ScreenCaptureKit/WASAPI)
- **Screen OCR**: Extracts text from active windows
- **Clipboard**: Monitors copied URLs and text

### Development

```bash
# Install dependencies
npm install

# Run desktop app in dev mode
npm run dev:desktop

# Build desktop app
npm run build:desktop
```

### Permissions Required

**macOS:**
- Accessibility (for browser URL monitoring)
- Screen Recording (for screen OCR and audio capture)

**Windows:**
- No special permissions required

**Linux:**
- Varies by desktop environment

## Web Dashboard

The web dashboard displays:

- **Belief Map**: Visual landscape of concepts and positions
- **Timeline**: How beliefs evolved over time
- **Inbox/Digest**: Claim cards to react to (agree/disagree/nuanced/curious)
- **Nudges**: Gentle suggestions for diverse perspectives

### Development

```bash
# Run web app in dev mode
npm run dev:web

# Build web app
npm run build:web
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Desktop App    │     │  Mobile App     │
│  (Tauri/Rust)   │     │  (React Native) │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
    ┌────────────────────────────────────┐
    │           Backend API              │
    │  - Content Ingestion               │
    │  - AI Claim Extraction             │
    │  - Belief Graph Updates            │
    └────────────────┬───────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────┐
    │      PostgreSQL + pgvector         │
    │  - Sources, Claims, Positions      │
    │  - Beliefs, Tensions, Nudges       │
    └────────────────────────────────────┘
```

## Key Features

- **Passive Engagement Tracking**: Works in background, no manual input required
- **AI Claim Extraction**: Distills content into discrete claims
- **One-Tap Reaction**: Swipe/tap to record stance on claims
- **Echo Chamber Detection**: Identifies over-represented perspectives
- **Belief Evolution Tracking**: See how your views change over time
- **Gentle Nudge System**: Surfaces diverse content without being pushy

## Tech Stack

- **Desktop**: Tauri 2.0, Rust, React, TypeScript
- **Web**: Next.js 15, React, TypeScript, Tailwind CSS
- **Mobile**: React Native (planned)
- **Database**: PostgreSQL with pgvector
- **AI**: OpenAI for claim extraction, Whisper for audio transcription

## License

MIT
