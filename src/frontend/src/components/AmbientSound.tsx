// HTML5 Audio implementation for iOS silent mode compatibility
// Uses <audio> element instead of Web Audio API to bypass silent switch
// Last updated: 2025-11-08 16:18 EST
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type SoundType = 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 30; // 30 seconds for seamless looping
const dataUrlCache = new Map<SoundType, string>();
const bufferCache = new Map<SoundType, AudioBuffer>();

function getAudioBuffer(context: AudioContext, type: SoundType): AudioBuffer {
  if (bufferCache.has(type)) {
    return bufferCache.get(type)!;
  }

  const samples = generateSamples(type);
  const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  bufferCache.set(type, buffer);
  return buffer;
}

function generateSamples(type: SoundType): Float32Array {
  const length = SAMPLE_RATE * DURATION_SECONDS;
  const data = new Float32Array(length);
  const fadeLength = SAMPLE_RATE * 0.1; // 100ms crossfade

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
      // Rain: Pure, continuous meditative soundscape - NO ticks or droplets
      // Just smooth, warm filtered noise for deep reflection
      let prevNoise = 0;
      let prevLowPass = 0;
      let prevVeryLowPass = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        
        // Triple-filtered brown noise for ultra-smooth warmth
        const noise = Math.random() * 2 - 1;
        prevNoise += 0.008 * (noise - prevNoise); // Very slow filter
        prevLowPass += 0.04 * (prevNoise - prevLowPass); // Second stage
        prevVeryLowPass += 0.06 * (prevLowPass - prevVeryLowPass); // Third stage
        const gentleRain = prevVeryLowPass * 0.18; // Slightly louder but still gentle
        
        // Deep, barely-there rumble for grounding (no sharp attacks)
        const rumble = Math.sin(2 * Math.PI * 55 * t) * 0.025 + 
                      Math.sin(2 * Math.PI * 38 * t) * 0.018;
        
        // Subtle slow modulation for organic feel (no ticks)
        const modulation = Math.sin(2 * Math.PI * 0.1 * t) * 0.02;
        
        data[i] = gentleRain + rumble + (gentleRain * modulation);
      }
      break;
    }
    case 'forest': {
      // Forest: Birds chirping, leaves rustling, gentle wind
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const rustle = Math.sin(2 * Math.PI * 0.3 * t) * (Math.random() * 0.3);
        const bird1 = Math.sin(2 * Math.PI * (1200 + Math.sin(t * 2) * 200) * t) * 
                     Math.exp(-3 * (t % 1)) * 0.15;
        const bird2 = Math.sin(2 * Math.PI * (800 + Math.sin(t * 1.5) * 150) * t) * 
                     Math.exp(-4 * (t % 1.3)) * 0.1;
        const wind = (Math.random() * 2 - 1) * 0.15;
        data[i] = rustle + bird1 + bird2 + wind;
      }
      break;
    }
    case 'meditation-bell': {
      // Meditation bell: Soft, resonant bell with harmonics
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const envelope = Math.exp(-1.5 * t);
        const fundamental = Math.sin(2 * Math.PI * 440 * t);
        const harmonic2 = Math.sin(2 * Math.PI * 880 * t) * 0.5;
        const harmonic3 = Math.sin(2 * Math.PI * 1320 * t) * 0.25;
        data[i] = (fundamental + harmonic2 + harmonic3) * envelope * 0.5;
      }
      break;
    }
    case 'white-noise': {
      // White noise: Smooth, consistent static for focus
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        // Low-pass filter for smoother white noise
        prev += 0.05 * (noise - prev);
        data[i] = prev * 0.35;
      }
      break;
    }
    default: {
      data.fill(0);
      break;
    }
  }

  // Apply crossfade at loop boundaries to eliminate clicks
  // Fade in at start, fade out at end
  for (let i = 0; i < fadeLength; i++) {
    const fadeIn = i / fadeLength; // 0 to 1
    const fadeOut = (fadeLength - i) / fadeLength; // 1 to 0
    
    // Fade in at start
    data[i] *= fadeIn;
    
    // Fade out at end
    const endIndex = length - fadeLength + i;
    if (endIndex < length) {
      data[endIndex] *= fadeOut;
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
  if (type === 'none') {
    return '';
  }

  if (dataUrlCache.has(type)) {
    return dataUrlCache.get(type)!;
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
  dataUrlCache.set(type, dataUrl);
  return dataUrl;
}

interface AmbientSoundProps {
  soundType: SoundType;
  enabled: boolean;
  dimVolume?: boolean;
  stopOnNavigation?: boolean;
}

async function unlockAudioContext(context: AudioContext) {
  const initialState = context.state as string;
  if (initialState === 'running') {
    return;
  }

  try {
    await context.resume();
  } catch (error) {
    console.warn('⚠️ AudioContext resume error', error);
  }

  const resumedState = context.state as string;
  if (resumedState === 'running') {
    return;
  }

  try {
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
    source.stop(context.currentTime + 0.001);
    source.disconnect();
  } catch (error) {
    console.warn('⚠️ AudioContext unlock buffer failed', error);
  }
}

export default function AmbientSound({ soundType, enabled, dimVolume = false, stopOnNavigation = true }: AmbientSoundProps) {
  const location = useLocation();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Detect iOS - MUST use HTML Audio to bypass silent mode
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  const supportsWebAudio =
    typeof window !== 'undefined' &&
    ('AudioContext' in window || 'webkitAudioContext' in window) &&
    !isIOS; // Force HTML Audio on iOS for silent mode compatibility

  const getVolume = useCallback(
    (muted: boolean) => (muted ? 0 : dimVolume ? 0.4 : 0.7),
    [dimVolume]
  );

  const cleanupSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop(0);
      } catch (error) {
        console.warn('⚠️ Error stopping WebAudio source', error);
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
  }, []);

  const cleanupFallback = useCallback(() => {
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.currentTime = 0;
      fallbackAudioRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    cleanupSource();
    cleanupFallback();
    setIsPlaying(false);
  }, [cleanupFallback, cleanupSource]);

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (!supportsWebAudio) {
      return null;
    }

    let context = audioContextRef.current;
    if (!context) {
      const AudioContextCtor =
        typeof window !== 'undefined'
          ? (window.AudioContext || (window as any).webkitAudioContext)
          : null;

      if (!AudioContextCtor) {
        return null;
      }

      context = new AudioContextCtor({
        sampleRate: SAMPLE_RATE,
        latencyHint: 'interactive',
      }) as AudioContext;

      audioContextRef.current = context;
    }

    return context;
  }, [supportsWebAudio]);

  const startFallbackAudio = useCallback(async () => {
    if (!enabled || soundType === 'none') {
      stopAudio();
      return;
    }

    const audioUrl = createDataUrl(soundType);
    if (!audioUrl) {
      throw new Error('No audio URL available for fallback playback');
    }

    cleanupSource();
    cleanupFallback();

    console.log('🎵 Using HTML Audio (iOS silent mode compatible)', { isIOS, soundType });

    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = getVolume(isMuted);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    
    // iOS-specific: Set audio category to playback (bypasses silent mode)
    if (isIOS) {
      try {
        // @ts-ignore - iOS-specific API
        if (audio.setSinkId) {
          // @ts-ignore
          await audio.setSinkId('');
        }
      } catch (e) {
        console.log('ℹ️ setSinkId not available (expected on iOS)');
      }
    }

    if (
      typeof window !== 'undefined' &&
      'MediaMetadata' in window &&
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator
    ) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Ambient Sound',
        artist: 'Meet Cute',
        album: 'Focus Session',
      });
    }

    fallbackAudioRef.current = audio;

    try {
      await audio.play();
      setIsPlaying(true);
      setNeedsInteraction(false);
      localStorage.removeItem('meetcute_autoplay_sound');
    } catch (error) {
      console.warn('⚠️ Fallback audio play blocked', error);
      setNeedsInteraction(true);
      throw error;
    }
  }, [cleanupFallback, cleanupSource, enabled, getVolume, isMuted, soundType, stopAudio, isIOS]);

  const startWebAudio = useCallback(
    async (sourceLabel: string) => {
      const context = ensureAudioContext();
      if (!context) {
        throw new Error('Web Audio API not available');
      }

      cleanupFallback();
      cleanupSource();

      const contextState = context.state as string;
      if (contextState !== 'running') {
        await unlockAudioContext(context);
      }

      const buffer = getAudioBuffer(context, soundType);
      const gainNode = gainRef.current || context.createGain();
      gainNode.gain.value = getVolume(isMuted);
      const sourceNode = context.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.loop = true;
      sourceNode.connect(gainNode);
      gainNode.connect(context.destination);

      if (
        typeof window !== 'undefined' &&
        'MediaMetadata' in window &&
        typeof navigator !== 'undefined' &&
        'mediaSession' in navigator
      ) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Ambient Sound',
          artist: 'Meet Cute',
          album: 'Focus Session',
        });
      }

      sourceNode.onended = () => {
        if (sourceRef.current === sourceNode) {
          sourceRef.current = null;
          setIsPlaying(false);
        }
      };

      sourceNode.start(0);
      sourceRef.current = sourceNode;
      gainRef.current = gainNode;

      console.log(`🎵 WebAudio ambient sound started [${sourceLabel}]`, {
        soundType,
      });

      setIsPlaying(true);
      setNeedsInteraction(false);
      localStorage.removeItem('meetcute_autoplay_sound');
    },
    [cleanupFallback, cleanupSource, ensureAudioContext, getVolume, isMuted, soundType]
  );

  const startAudio = useCallback(
    async (sourceLabel: string) => {
      if (!enabled || soundType === 'none') {
        stopAudio();
        return;
      }

      try {
        await startWebAudio(sourceLabel);
      } catch (webAudioError) {
        console.warn('⚠️ WebAudio failed, falling back to HTMLAudio', webAudioError);
        try {
          await startFallbackAudio();
        } catch (fallbackError) {
          console.error('❌ Unable to start ambient sound', fallbackError);
          setNeedsInteraction(true);
        }
      }
    },
    [enabled, soundType, startWebAudio, startFallbackAudio, stopAudio]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const volume = getVolume(next);

      if (gainRef.current) {
        gainRef.current.gain.value = volume;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.volume = volume;
      }

      return next;
    });
  }, [getVolume]);

  const handlePlayClick = useCallback(() => {
    startAudio('manual-click');
  }, [startAudio]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
  }, [enabled, startAudio, stopAudio]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const shouldAutoplay = localStorage.getItem('meetcute_autoplay_sound');
    if (shouldAutoplay === 'true') {
      startAudio('autoplay-flag');
    }
  }, [enabled, soundType, startAudio]);

  useEffect(() => {
    if (!enabled || !needsInteraction) {
      return;
    }

    const gestureHandler = async () => {
      console.log('🎵 User gesture detected - attempting to start ambient sound');
      const context = ensureAudioContext();
      if (context) {
        await unlockAudioContext(context);
      }
      startAudio('user-gesture');
    };

    const options: AddEventListenerOptions = { once: true };
    window.addEventListener('pointerdown', gestureHandler, options);
    window.addEventListener('touchstart', gestureHandler, options);
    window.addEventListener('keydown', gestureHandler, options);

    return () => {
      window.removeEventListener('pointerdown', gestureHandler);
      window.removeEventListener('touchstart', gestureHandler);
      window.removeEventListener('keydown', gestureHandler);
    };
  }, [enabled, needsInteraction, startAudio, ensureAudioContext]);

  useEffect(() => {
    if (!enabled) {
      stopAudio();
      setNeedsInteraction(true);
    }
  }, [enabled, stopAudio]);

  useEffect(() => {
    if (!enabled || soundType === 'none') {
      stopAudio();
      return;
    }

    if (isPlaying && !needsInteraction) {
      startAudio('sound-change');
    }
  }, [enabled, soundType, isPlaying, needsInteraction, startAudio, stopAudio]);

  useEffect(() => {
    const volume = getVolume(isMuted);

    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.volume = volume;
    }
  }, [dimVolume, getVolume, isMuted]);

  useEffect(() => {
    if (!stopOnNavigation) {
      return;
    }

    return () => {
      stopAudio();
      setNeedsInteraction(true);
    };
  }, [location.key, stopOnNavigation, stopAudio]);

  if (!enabled || soundType === 'none') {
    return null;
  }

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

