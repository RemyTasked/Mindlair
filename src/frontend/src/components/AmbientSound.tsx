// HTML5 Audio implementation for iOS silent mode compatibility
// Uses <audio> element instead of Web Audio API to bypass silent switch
// Last updated: 2025-11-08 16:18 EST
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enabled: boolean;
  dimVolume?: boolean;
  stopOnNavigation?: boolean;
}

export default function AmbientSound({ soundType, enabled, dimVolume = false, stopOnNavigation = true }: AmbientSoundProps) {
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  // Sound URLs - using reliable royalty-free sources
  const soundUrls: Record<string, string> = {
    'calm-ocean': 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3',
    'rain': 'https://assets.mixkit.co/active_storage/sfx/2413/2413-preview.mp3',
    'forest': 'https://assets.mixkit.co/active_storage/sfx/2459/2459-preview.mp3',
    'white-noise': 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3',
    'meditation-bell': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  };

  const initializeAudio = async () => {
    if (!enabled || soundType === 'none') {
      console.log('🔇 Audio disabled or sound type is none');
      stopAudio();
      return;
    }

    try {
      console.log('🎵 Initializing HTML5 Audio...', { soundType });

      // Stop any existing audio
      stopAudio();

      // Create new audio element
      const audio = new Audio();
      const audioUrl = soundUrls[soundType] || soundUrls['white-noise'];
      console.log('🎵 Loading audio from:', audioUrl);
      
      audio.src = audioUrl;
      audio.loop = true;
      audio.volume = dimVolume ? 0.15 : 0.3;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous'; // Enable CORS
      
      // CRITICAL iOS SILENT MODE BYPASS:
      // These attributes tell iOS to treat this as media playback (like YouTube/Spotify)
      // This allows audio to play even when the silent switch is on
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Set media session metadata - this makes iOS treat it as "media" not "sound effect"
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Ambient Sound',
          artist: 'Meet Cute',
          album: 'Focus Session',
        });
      }
      
      // Add event listeners for debugging
      audio.addEventListener('canplay', () => {
        console.log('✅ Audio can play');
      });
      
      audio.addEventListener('error', (e) => {
        console.error('❌ Audio error:', e);
        console.error('Audio error details:', {
          error: audio.error,
          src: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
      });
      
      audioRef.current = audio;

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Audio load timeout')), 5000);
      });

      // Play the audio
      console.log('🎵 Attempting to play audio...');
      await audio.play();
      setIsPlaying(true);
      setNeedsInteraction(false);
      console.log('✅ Audio playing - works even on iOS silent mode!');
    } catch (error: any) {
      console.error('❌ Error playing audio:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Always show play button if there's any error
      setNeedsInteraction(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      console.log('🛑 Stopping audio...');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  const handlePlayClick = async () => {
    await initializeAudio();
  };

  useEffect(() => {
    const playHandler = () => {
      console.log('🎵 ambient-sound-play event received');
      handlePlayClick();
    };

    const stopHandler = () => {
      console.log('🛑 ambient-sound-stop event received');
      localStorage.removeItem('meetcute_autoplay_sound');
      stopAudio();
      setNeedsInteraction(true);
    };

    window.addEventListener('ambient-sound-play', playHandler);
    window.addEventListener('ambient-sound-stop', stopHandler);

    return () => {
      window.removeEventListener('ambient-sound-play', playHandler);
      window.removeEventListener('ambient-sound-stop', stopHandler);
    };
  }, [soundType, enabled]);

  useEffect(() => {
    const shouldAutoplay = localStorage.getItem('meetcute_autoplay_sound');
    if (shouldAutoplay === 'true') {
      console.log('🎵 Autoplay flag detected - starting ambient sound');
      localStorage.removeItem('meetcute_autoplay_sound');
      handlePlayClick();
    }
  }, []);

  // Update volume when dimVolume changes
  useEffect(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = dimVolume ? 0.15 : 0.3;
    }
  }, [dimVolume, isMuted]);

  // Stop audio when navigating away (if enabled)
  useEffect(() => {
    if (stopOnNavigation) {
      return () => {
        stopAudio();
      };
    }
  }, [location.pathname, stopOnNavigation]);

  if (!enabled || soundType === 'none') {
    return null;
  }

  // Show play button if audio needs user interaction
  if (needsInteraction && !isPlaying) {
    return (
      <button
        onClick={handlePlayClick}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white animate-pulse"
        title="Play ambient sound"
      >
        <Volume2 className="w-6 h-6 text-white" />
      </button>
    );
  }

  // Show mute/unmute button when playing
  if (isPlaying) {
    return (
      <button
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
        title={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-600" />
        ) : (
          <Volume2 className="w-5 h-5 text-indigo-600" />
        )}
      </button>
    );
  }

  return null;
}
