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

  const startAudio = (source: string) => {
    if (!enabled || soundType === 'none') {
      console.log('🔇 Audio disabled or sound type is none');
      stopAudio();
      return;
    }

    try {
      console.log(`🎵 Starting ambient sound [${source}]...`, { soundType });
      stopAudio();

      const audio = new Audio();
      const audioUrl = soundUrls[soundType] || soundUrls['white-noise'];
      audio.src = audioUrl;
      audio.loop = true;
      audio.volume = dimVolume ? 0.15 : 0.3;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Ambient Sound',
          artist: 'Meet Cute',
          album: 'Focus Session',
        });
      }

      audio.addEventListener('error', (e) => {
        console.error('❌ Audio error:', e);
        setNeedsInteraction(true);
      });

      audioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            console.log('✅ Ambient sound playing');
            setIsPlaying(true);
            setNeedsInteraction(false);
            localStorage.removeItem('meetcute_autoplay_sound');
          })
          .catch((err) => {
            console.warn('⚠️ Audio play blocked:', err);
            setNeedsInteraction(true);
          });
      } else {
        setIsPlaying(true);
        setNeedsInteraction(false);
        localStorage.removeItem('meetcute_autoplay_sound');
      }
    } catch (error) {
      console.error('❌ Error starting ambient sound:', error);
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

  const toggleMute = () => {
    if (!audioRef.current) {
      return;
    }

    if (isMuted) {
      audioRef.current.volume = dimVolume ? 0.15 : 0.3;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handlePlayClick = () => {
    startAudio('manual-click');
  };

  useEffect(() => {
    const playHandler = () => {
      console.log('🎵 ambient-sound-play event received');
      startAudio('event-dispatch');
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
      console.log('🎵 Autoplay flag detected - attempting to start ambient sound');
      startAudio('autoplay-flag');
    }
  }, [enabled, soundType]);

  useEffect(() => {
    if (!enabled || !needsInteraction) {
      return;
    }

    const gestureHandler = () => {
      console.log('🎵 User gesture detected - attempting to start ambient sound');
      startAudio('user-gesture');
    };

    window.addEventListener('pointerdown', gestureHandler, { once: true });
    window.addEventListener('touchstart', gestureHandler, { once: true });
    window.addEventListener('keydown', gestureHandler, { once: true });

    return () => {
      window.removeEventListener('pointerdown', gestureHandler);
      window.removeEventListener('touchstart', gestureHandler);
      window.removeEventListener('keydown', gestureHandler);
    };
  }, [enabled, needsInteraction, soundType]);

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
