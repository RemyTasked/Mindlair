// HTML5 Audio implementation for iOS silent mode compatibility
// Uses <audio> element instead of Web Audio API to bypass silent switch
// Last updated: 2025-11-08 16:18 EST
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

type SoundType = 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';

const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 4;
const audioCache = new Map<SoundType, string>();

function generateSamples(type: SoundType): Float32Array {
  const length = SAMPLE_RATE * DURATION_SECONDS;
  const data = new Float32Array(length);

  switch (type) {
    case 'calm-ocean': {
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        prev += 0.02 * (noise - prev);
        const wave = Math.sin((2 * Math.PI * i) / (SAMPLE_RATE * 5));
        data[i] = prev * 0.5 + wave * 0.3;
      }
      break;
    }
    case 'rain': {
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        data[i] = noise * 0.3;
      }
      break;
    }
    case 'forest': {
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const rustle = Math.sin(2 * Math.PI * 0.2 * t) * 0.2;
        const chirp = Math.sin(2 * Math.PI * (4 + Math.sin(t * 0.5) * 2) * t) * 0.1;
        const wind = (Math.random() * 2 - 1) * 0.2;
        data[i] = rustle + chirp + wind;
      }
      break;
    }
    case 'meditation-bell': {
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const envelope = Math.exp(-2 * t);
        const bell = Math.sin(2 * Math.PI * 660 * t) * envelope;
        data[i] = bell * 0.6;
      }
      break;
    }
    case 'white-noise': {
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      break;
    }
    default: {
      data.fill(0);
      break;
    }
  }

  return data;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function createDataUrl(type: SoundType): string {
  if (audioCache.has(type)) {
    return audioCache.get(type)!;
  }

  const samples = generateSamples(type);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  const dataUrl = `data:audio/wav;base64,${base64}`;
  audioCache.set(type, dataUrl);
  return dataUrl;
}

interface AmbientSoundProps {
  soundType: SoundType;
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
      const audioUrl = createDataUrl(soundType);
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
