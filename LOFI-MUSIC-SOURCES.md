# Royalty-Free Lofi Music Sources

## Current Implementation
Meet-Cute currently uses **procedurally generated** lofi-style soundscapes that are:
- ✅ Completely royalty-free (generated in-app)
- ✅ No file downloads needed
- ✅ Seamless looping
- ✅ Characteristic lofi elements (chords, beats, vinyl crackle)

## If You Want Actual Recorded Lofi Tracks

Here are the best sources for **royalty-free lofi music** you can use in Meet-Cute:

### 1. **YouTube Audio Library** (100% Free)
- **URL**: https://studio.youtube.com/channel/UC/music
- **License**: Free to use, no attribution required
- **Quality**: High-quality, curated tracks
- **How to use**: 
  1. Search for "lofi" in the Audio Library
  2. Filter by "No attribution required"
  3. Download MP3 files
  4. Convert to optimized format for web

### 2. **Pixabay Music** (100% Free)
- **URL**: https://pixabay.com/music/
- **License**: Pixabay Content License (free for commercial use)
- **Search terms**: "lofi", "chill beats", "study music"
- **Format**: MP3 downloads
- **Quality**: Excellent selection of lofi tracks

### 3. **Free Music Archive (FMA)** (100% Free)
- **URL**: https://freemusicarchive.org/
- **License**: Various Creative Commons licenses
- **Search**: Filter by "lofi hip hop" or "chillhop"
- **Note**: Check individual track licenses (look for CC0 or CC-BY)

### 4. **Incompetech** by Kevin MacLeod (100% Free)
- **URL**: https://incompetech.com/music/
- **License**: CC-BY 4.0 (attribution required)
- **Search**: "Ambient" or "Electronica" categories
- **Quality**: Professional, widely used

### 5. **Bensound** (Free with Attribution)
- **URL**: https://www.bensound.com/
- **License**: Free with attribution OR paid license ($5/track)
- **Search**: "Lofi" or "Chill" categories
- **Quality**: Very high quality, professional production

### 6. **Chosic** (Curated Free Music)
- **URL**: https://www.chosic.com/free-music/lofi/
- **License**: Aggregates CC-licensed music
- **Quality**: Curated selection specifically for lofi
- **Note**: Check individual track licenses

### 7. **Uppbeat** (Free for Content Creators)
- **URL**: https://uppbeat.io/
- **License**: Free with Uppbeat attribution
- **Quality**: High-quality, modern lofi beats
- **Note**: Requires account signup

## Recommended Tracks to Look For

Based on your 5 categories, search for:

1. **Lofi Chill**: "lofi hip hop", "chill beats", "study music"
2. **Lofi Focus**: "minimal beats", "concentration music", "work music"
3. **Lofi Morning**: "uplifting lofi", "morning beats", "positive vibes"
4. **Lofi Evening**: "evening lofi", "sunset beats", "mellow hip hop"
5. **Lofi Calm**: "ambient lofi", "meditation beats", "peaceful music"

## How to Integrate Real Audio Files

If you want to replace the procedural generation with actual audio files:

1. **Download tracks** from the sources above
2. **Optimize for web**:
   ```bash
   # Convert to optimized format
   ffmpeg -i input.mp3 -c:a libopus -b:a 96k output.opus
   # Or use AAC for better compatibility
   ffmpeg -i input.mp3 -c:a aac -b:a 128k output.m4a
   ```
3. **Place in**: `src/frontend/public/sounds/lofi/`
4. **Update AmbientSound.tsx** to load from files instead of generating
5. **Ensure seamless looping**: Use tools like Audacity to create perfect loop points

## Legal Considerations

✅ **Safe to use**:
- Tracks marked "Public Domain" or "CC0"
- Tracks with "No attribution required"
- Tracks you've purchased a license for

⚠️ **Requires attribution**:
- CC-BY licensed tracks (must credit artist)
- Some free platforms require in-app credit

❌ **Avoid**:
- Tracks from Spotify, Apple Music, or streaming services
- "Royalty-free" tracks that still require licensing fees
- Tracks without clear licensing information

## Current Status

✅ **Implemented**: 5 procedurally generated lofi soundscapes
- No licensing issues
- No file downloads
- Instant playback
- Perfect looping

🎵 **Optional Enhancement**: Replace with real recorded tracks using sources above

## Notes

The procedurally generated tracks provide a good foundation, but if you want more authentic lofi sound with:
- Real instrument samples
- More complex arrangements
- Varied textures and production techniques

Then using recorded tracks from the sources above would be ideal. The trade-off is:
- **Procedural**: Smaller app size, instant generation, no licensing
- **Recorded**: More authentic sound, larger files, need licensing/attribution

