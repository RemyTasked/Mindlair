# Mind Garden Chrome Extension

Calendar-integrated mental fitness tool that provides contextual micro-interventions for stressed professionals.

## Features

- **Google Calendar Integration**: Sidebar panel injected into Google Calendar
- **Outlook Calendar Integration**: Support for Outlook web calendar
- **Smart Meeting Analysis**: Parses calendar events and calculates daily stress forecast
- **Micro-Flows**: Quick 30s-3min breathing/mindfulness exercises
- **Garden Visualization**: Mini garden showing wellness progress
- **Spotify Integration**: Quick-play focus music

## Development

### Prerequisites

- Node.js 18+
- Chrome browser

### Setup

1. Navigate to the extension directory:
   ```bash
   cd src/extension
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `src/extension` directory

### Structure

```
src/extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background/
│   └── service-worker.js  # Background service worker
├── content-scripts/
│   ├── google-calendar.js # Google Calendar injection
│   ├── outlook-calendar.js# Outlook Calendar injection
│   └── sidebar.css        # Shared sidebar styles
├── popup/
│   ├── popup.html         # Extension popup
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── icons/                 # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### Building for Production

For production, you'll want to:
1. Minify JavaScript files
2. Generate optimized icons
3. Create a ZIP file for Chrome Web Store submission

```bash
# Future: Add build script
npm run build:extension
```

## API Integration

The extension communicates with the Mind Garden backend at:
- Production: `https://mindgarden.app/api`
- Development: `http://localhost:3000/api`

### Endpoints Used

- `POST /api/analysis/forecast` - Send calendar events for stress analysis
- `GET /api/flows` - Get available micro-flows
- `POST /api/flows/complete` - Record completed flow
- `GET /api/garden/state` - Get garden visualization state

## Permissions

The extension requires:
- `storage` - Store user preferences and flow history
- `alarms` - Schedule pre-meeting notifications
- `identity` - OAuth authentication
- `notifications` - Show flow reminders
- Host permissions for Google Calendar and Outlook

## Privacy

- No meeting content is recorded or stored
- All analysis happens locally or on your private Mind Garden account
- Calendar data is only used to calculate stress indicators
- See [Privacy Policy](https://mindgarden.app/privacy) for details

