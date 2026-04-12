# Android Passive Capture Architecture Plan

This document outlines the architecture for implementing advanced Android features to enable passive content capture for Mindlair.

## Overview

The Android app will be distributed as a **sideloaded APK** (not through Google Play Store initially) to enable features that require special permissions:

1. **Accessibility Service** - Monitor app usage and capture content metadata
2. **MediaProjection API** - Capture system audio for podcast/video detection
3. **Floating Bubble UI** - Quick reaction interface that floats over other apps

---

## Phase 1: Sideloaded APK Foundation

### Tech Stack
- **Framework**: React Native with Expo (or Kotlin/Java native for better performance)
- **Build**: GitHub Actions for automated APK generation
- **Distribution**: GitHub Releases + direct download from mindlair.app

### Project Structure
```
mindlair/apps/android/
├── app/
│   ├── src/main/
│   │   ├── java/app/mindlair/
│   │   │   ├── MainActivity.kt
│   │   │   ├── services/
│   │   │   │   ├── AccessibilityCapture.kt
│   │   │   │   ├── AudioCapture.kt
│   │   │   │   └── FloatingBubble.kt
│   │   │   ├── api/
│   │   │   │   └── MindlairApi.kt
│   │   │   └── models/
│   │   │       └── CapturedContent.kt
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── gradle/
└── build.gradle.kts
```

### Permissions Required
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## Phase 2: Accessibility Service

### Purpose
Capture what the user is consuming across apps:
- YouTube: video titles, channels, watch duration
- Podcast apps: episode titles, show names
- News apps: article titles, sources
- Browsers: URLs, page titles

### Implementation

```kotlin
// AccessibilityCapture.kt
class AccessibilityCapture : AccessibilityService() {
    
    private val capturedUrls = mutableSetOf<String>()
    private val api = MindlairApi()
    
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                handleWindowChange(event)
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                handleTextChange(event)
            }
        }
    }
    
    private fun handleWindowChange(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        
        when {
            isYouTube(packageName) -> captureYouTubeContent(event)
            isPodcastApp(packageName) -> capturePodcastContent(event)
            isNewsApp(packageName) -> captureNewsContent(event)
            isBrowser(packageName) -> captureBrowserContent(event)
        }
    }
    
    private fun captureYouTubeContent(event: AccessibilityEvent) {
        val rootNode = rootInActiveWindow ?: return
        
        // Find video title node
        val titleNode = findNodeByViewId(rootNode, "com.google.android.youtube:id/title")
        val channelNode = findNodeByViewId(rootNode, "com.google.android.youtube:id/channel_name")
        
        titleNode?.text?.let { title ->
            val content = CapturedContent(
                title = title.toString(),
                source = "YouTube",
                author = channelNode?.text?.toString(),
                contentType = "video",
                capturedAt = System.currentTimeMillis()
            )
            api.submitContent(content)
        }
    }
    
    // Similar implementations for podcasts, news, browsers...
}
```

### Supported Apps (Initial)
| Category | Apps |
|----------|------|
| Video | YouTube, Netflix, Twitch |
| Podcasts | Spotify, Apple Podcasts, Pocket Casts, Overcast |
| News | Apple News, Google News, Flipboard, Feedly |
| Browsers | Chrome, Firefox, Samsung Internet, Edge |
| Reading | Kindle, Pocket, Instapaper, Medium |

### Privacy Considerations
- All data is stored locally first, then synced
- User can review captured items before sync
- Allowlist/blocklist for apps
- Clear data button in settings

---

## Phase 3: MediaProjection Audio Capture

### Purpose
Detect audio content (podcasts, videos) playing through the system to:
1. Identify what's playing via audio fingerprinting or metadata
2. Track listening duration
3. Extract spoken content for claim extraction

### Implementation

```kotlin
// AudioCapture.kt
class AudioCapture : Service() {
    
    private var mediaProjection: MediaProjection? = null
    private var audioRecord: AudioRecord? = null
    
    fun startCapture(resultCode: Int, data: Intent) {
        val projectionManager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)
        
        val config = AudioPlaybackCaptureConfiguration.Builder(mediaProjection!!)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .build()
        
        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(16000)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
            .build()
        
        audioRecord = AudioRecord.Builder()
            .setAudioPlaybackCaptureConfig(config)
            .setAudioFormat(format)
            .build()
        
        audioRecord?.startRecording()
        processAudioStream()
    }
    
    private fun processAudioStream() {
        // Options:
        // 1. Send to Shazam-like API for music/podcast identification
        // 2. Send to Whisper for transcription
        // 3. Use local fingerprinting library
    }
}
```

### Audio Identification Options

| Option | Pros | Cons |
|--------|------|------|
| **ACRCloud** | Fast, accurate, large database | Cost per query |
| **Shazam API** | Excellent for music | Limited podcast support |
| **Whisper (local)** | Free, full transcription | High battery/CPU |
| **Whisper (API)** | Better transcription | Cost, privacy concerns |
| **AudioDB fingerprint** | Free, offline | Limited database |

### Recommended Approach
1. Use **ACRCloud** for initial audio identification (podcast/song detection)
2. Fall back to **local silence detection** + **app metadata** from Accessibility Service
3. Optional: Enable **Whisper transcription** for claim extraction on demand

---

## Phase 4: Floating Bubble UI

### Purpose
Allow users to quickly react to content without opening the full app:
- Shows current detected content
- Quick reaction buttons (Agree, Disagree, Complicated, Skip)
- Expandable for notes
- Draggable position

### Implementation

```kotlin
// FloatingBubble.kt
class FloatingBubble : Service() {
    
    private lateinit var windowManager: WindowManager
    private lateinit var bubbleView: View
    private lateinit var expandedView: View
    
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        setupBubble()
    }
    
    private fun setupBubble() {
        bubbleView = LayoutInflater.from(this).inflate(R.layout.bubble_collapsed, null)
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.END
        params.x = 0
        params.y = 200
        
        windowManager.addView(bubbleView, params)
        setupTouchListener()
    }
    
    private fun showExpanded(content: CapturedContent) {
        expandedView = LayoutInflater.from(this).inflate(R.layout.bubble_expanded, null)
        
        expandedView.findViewById<TextView>(R.id.title).text = content.title
        expandedView.findViewById<TextView>(R.id.source).text = content.source
        
        // Reaction buttons
        expandedView.findViewById<Button>(R.id.btn_agree).setOnClickListener {
            submitReaction("agree", content)
        }
        expandedView.findViewById<Button>(R.id.btn_disagree).setOnClickListener {
            submitReaction("disagree", content)
        }
        // ...
    }
}
```

### UI Design

```
┌─────────────────────────────────┐
│ ◉  Mindlair                     │  <- Collapsed bubble (draggable)
└─────────────────────────────────┘

        ↓ Tap to expand ↓

┌─────────────────────────────────────┐
│ Currently capturing:                │
│ ┌─────────────────────────────────┐ │
│ │ 📺 Why AI Will Change Everything│ │
│ │    YouTube • Veritasium          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ How do you feel about this?         │
│                                     │
│ ┌───────┐ ┌───────┐ ┌───────────┐  │
│ │ 👍    │ │ 👎    │ │ 🤷 It's   │  │
│ │ Agree │ │Disagree│ │complicated│  │
│ └───────┘ └───────┘ └───────────┘  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Add a note (optional)...        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ ] Don't track this content        │
│                                     │
│           ┌──────────┐              │
│           │ Dismiss  │              │
│           └──────────┘              │
└─────────────────────────────────────┘
```

---

## API Endpoints (New)

### POST /api/sources/capture
Receives captured content from Android app.

```typescript
// Request
{
  "url": string | null,
  "title": string,
  "source": string,
  "author": string | null,
  "contentType": "video" | "podcast" | "article",
  "surface": "android_accessibility" | "android_audio",
  "capturedAt": string, // ISO timestamp
  "durationMs": number | null,
  "metadata": {
    "packageName": string,
    "audioFingerprint": string | null
  }
}

// Response
{
  "success": true,
  "sourceId": string,
  "alreadyExists": boolean
}
```

### POST /api/positions/quick-react
Receives quick reactions from floating bubble.

```typescript
// Request
{
  "sourceId": string,
  "stance": "agree" | "disagree" | "complicated" | "skip",
  "note": string | null
}

// Response
{
  "success": true,
  "positionId": string
}
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Android project with Kotlin
- [ ] Create basic APK build pipeline with GitHub Actions
- [ ] Implement authentication flow with existing backend
- [ ] Create download page on mindlair.app

### Phase 2: Accessibility Service (Week 3-4)
- [ ] Implement AccessibilityService base
- [ ] Add YouTube capture
- [ ] Add podcast app capture (Spotify, Pocket Casts)
- [ ] Add browser capture
- [ ] Create `/api/sources/capture` endpoint
- [ ] Add local queue for offline captures

### Phase 3: Floating Bubble (Week 5-6)
- [ ] Implement overlay permission flow
- [ ] Create collapsed bubble UI
- [ ] Create expanded reaction UI
- [ ] Integrate with captured content
- [ ] Create `/api/positions/quick-react` endpoint

### Phase 4: Audio Capture (Week 7-8)
- [ ] Implement MediaProjection capture
- [ ] Integrate ACRCloud or alternative
- [ ] Add audio-to-content matching
- [ ] Combine with Accessibility data for accuracy

### Phase 5: Polish & Testing (Week 9-10)
- [ ] Battery optimization
- [ ] Background service stability
- [ ] Edge case handling
- [ ] User testing
- [ ] Documentation

---

## Privacy & Security

### Data Handling
1. All captures are stored locally in encrypted SQLite database
2. Sync happens over HTTPS with JWT authentication
3. User can review pending captures before sync
4. "Incognito mode" pauses all capture temporarily

### User Controls
- Per-app enable/disable
- Allowlist/blocklist for domains
- Time-based capture (e.g., only 9am-10pm)
- Clear all local data
- Export/delete account data

### Transparency
- Notification when capture is active
- Activity log viewable in app
- Clear explanation during onboarding

---

## Fallback Without Special Permissions

If user doesn't grant Accessibility/Overlay permissions:

1. **Share Intent**: User can share content to Mindlair from any app
2. **Manual Entry**: Quick add form in app
3. **Browser Extension**: Use desktop extension for web content
4. **Google Takeout**: Periodic import of YouTube/Chrome history

---

## Files to Create

```
mindlair/apps/android/
├── app/src/main/
│   ├── java/app/mindlair/
│   │   ├── MainActivity.kt
│   │   ├── MindlairApplication.kt
│   │   ├── services/
│   │   │   ├── AccessibilityCapture.kt
│   │   │   ├── AudioCapture.kt
│   │   │   └── FloatingBubble.kt
│   │   ├── api/
│   │   │   ├── MindlairApi.kt
│   │   │   └── AuthManager.kt
│   │   ├── models/
│   │   │   ├── CapturedContent.kt
│   │   │   └── Reaction.kt
│   │   ├── ui/
│   │   │   ├── MainActivity.kt
│   │   │   ├── SettingsActivity.kt
│   │   │   └── OnboardingActivity.kt
│   │   └── db/
│   │       └── CaptureDatabase.kt
│   ├── res/
│   │   ├── layout/
│   │   │   ├── activity_main.xml
│   │   │   ├── bubble_collapsed.xml
│   │   │   └── bubble_expanded.xml
│   │   ├── values/
│   │   │   ├── colors.xml
│   │   │   └── strings.xml
│   │   └── xml/
│   │       └── accessibility_service_config.xml
│   └── AndroidManifest.xml
├── build.gradle.kts
└── settings.gradle.kts
```

---

## Open Questions

1. **React Native vs Native Kotlin?**
   - RN: Faster dev, code sharing with web
   - Kotlin: Better for background services, battery

2. **Audio identification service?**
   - ACRCloud has best podcast coverage but costs money
   - Could start with metadata-only approach

3. **Google Play eventually?**
   - Accessibility apps face stricter review
   - May need to remove some features for Play Store version

---

## Next Steps

1. ✅ Implement Google Takeout import (current)
2. Set up Android project structure
3. Implement basic APK with auth flow
4. Add Accessibility Service for YouTube
5. Create floating bubble prototype
