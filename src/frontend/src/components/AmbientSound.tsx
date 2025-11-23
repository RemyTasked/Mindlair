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

type SoundType = 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'lofi-chill' | 'lofi-focus' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'lofi-deep-focus' | 'lofi-soft-composure' | 'lofi-warm-connection' | 'lofi-pitch-pulse' | 'lofi-recovery-lounge' | 'none';
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 120; // 2 minutes for longer, more natural loops
const FADE_DURATION_SECONDS = 3; // 3-second crossfade for smooth transitions
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

  switch (type) {
    case 'calm-ocean': {
      // Calm ocean: Wave-like motion with deep bass and gentle swells
      let prevNoise = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        
        // Deep ocean rumble (very low frequency)
        const deepRumble = Math.sin(2 * Math.PI * 40 * t) * 0.15;
        
        // Wave motion (medium frequency)
        const wave = Math.sin(2 * Math.PI * 0.2 * t) * 0.25;
        
        // Filtered noise for water texture
        const noise = Math.random() * 2 - 1;
        prevNoise += 0.015 * (noise - prevNoise);
        
        // Gentle swells
        const swell = Math.sin(2 * Math.PI * 0.05 * t) * 0.1;
        
        data[i] = deepRumble + wave * 0.4 + prevNoise * 0.2 + swell;
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
      // Forest: Birds chirping, leaves rustling, gentle wind - more distinct
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        
        // Gentle wind (filtered noise)
        let windNoise = 0;
        for (let j = 0; j < 3; j++) {
          const noise = Math.random() * 2 - 1;
          windNoise += 0.03 * (noise - windNoise);
        }
        const wind = windNoise * 0.2;
        
        // Leaves rustling (low frequency modulation)
        const rustle = Math.sin(2 * Math.PI * 0.2 * t) * Math.sin(2 * Math.PI * 0.5 * t) * 0.15;
        
        // Bird calls (sparse, occasional)
        const bird1 = (t % 8 < 0.3) ? Math.sin(2 * Math.PI * (1200 + Math.sin(t * 2) * 200) * t) * 
                     Math.exp(-5 * (t % 8)) * 0.2 : 0;
        const bird2 = ((t + 2) % 10 < 0.25) ? Math.sin(2 * Math.PI * (800 + Math.sin(t * 1.5) * 150) * t) * 
                     Math.exp(-6 * ((t + 2) % 10)) * 0.15 : 0;
        const bird3 = ((t + 5) % 12 < 0.2) ? Math.sin(2 * Math.PI * (1500 + Math.sin(t * 1.8) * 180) * t) * 
                     Math.exp(-7 * ((t + 5) % 12)) * 0.12 : 0;
        
        // Deep forest rumble
        const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.05;
        
        data[i] = wind + rustle + bird1 + bird2 + bird3 + rumble;
      }
      break;
    }
    case 'meditation-bell': {
      // Meditation bell: Continuous, resonant bell tones with gentle harmonics
      // Multiple overlapping bell tones for continuous ambient sound
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        
        // Multiple bell tones at different frequencies, each with its own phase
        const bell1 = Math.sin(2 * Math.PI * 220 * t) * 0.15; // A3
        const bell2 = Math.sin(2 * Math.PI * 329.63 * t) * 0.12; // E4
        const bell3 = Math.sin(2 * Math.PI * 440 * t) * 0.1; // A4
        
        // Gentle harmonics for richness
        const harmonic1 = Math.sin(2 * Math.PI * 440 * 2 * t) * 0.05;
        const harmonic2 = Math.sin(2 * Math.PI * 440 * 3 * t) * 0.03;
        
        // Slow amplitude modulation for organic feel
        const modulation = 1 + Math.sin(2 * Math.PI * 0.1 * t) * 0.1;
        
        // Very gentle low-frequency rumble for depth
        const rumble = Math.sin(2 * Math.PI * 55 * t) * 0.02;
        
        data[i] = (bell1 + bell2 + bell3 + harmonic1 + harmonic2 + rumble) * modulation * 0.4;
      }
      break;
    }
    case 'white-noise': {
      // White noise: Smooth, consistent static for focus (pink noise - more natural)
      let prev1 = 0;
      let prev2 = 0;
      let prev3 = 0;
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        // Triple low-pass filter for pink noise (more natural than white noise)
        prev1 += 0.08 * (noise - prev1);
        prev2 += 0.06 * (prev1 - prev2);
        prev3 += 0.04 * (prev2 - prev3);
        data[i] = prev3 * 0.4;
      }
      break;
    }
    case 'lofi-chill': {
      // Lofi Chill: Mellow chords, soft drums, vinyl crackle
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Warm chord progression (Cmaj7 -> Am7 -> Fmaj7 -> G7)
        const chordPhase = Math.floor((t / 8) % 4);
        const chordFreqs = [
          [261.63, 329.63, 392.00, 493.88], // Cmaj7
          [220.00, 261.63, 329.63, 415.30], // Am7
          [174.61, 220.00, 261.63, 329.63], // Fmaj7
          [196.00, 246.94, 293.66, 369.99], // G7
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.08, 0);
        // Soft kick and snare
        const beat = (t % 2 < 0.1) ? Math.exp(-20 * (t % 2)) * 0.3 : 0;
        const snare = ((t % 2 > 0.9 && t % 2 < 1.1)) ? (Math.random() * 0.15) : 0;
        // Very subtle vinyl texture (reduced to prevent clicking)
        const crackle = (Math.random() * 2 - 1) * 0.008;
        data[i] = chord + beat + snare + crackle;
      }
      break;
    }
    case 'lofi-focus': {
      // Lofi Focus: Minimal beats, subtle melody, perfect for concentration - DISTINCT
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Distinct pentatonic melody (C major pentatonic - different from deep-focus)
        const melodyNote = [261.63, 293.66, 329.63, 392.00, 440.00][Math.floor((t / 2.5) % 5)];
        const melody = Math.sin(2 * Math.PI * melodyNote * t) * 0.14 * Math.exp(-1.8 * (t % 2.5));
        // Minimal kick (unique timing - every 1.5 seconds)
        const kick = (t % 1.5 < 0.08) ? Math.exp(-25 * (t % 1.5)) * 0.28 : 0;
        // Warm bass (A2 - different frequency from deep-focus)
        const bass = Math.sin(2 * Math.PI * 110 * t) * 0.18;
        // Very subtle vinyl texture (reduced to prevent clicking)
        const vinyl = (Math.random() * 2 - 1) * 0.006;
        // Add subtle chord pad for distinction
        const pad = Math.sin(2 * Math.PI * 330 * t) * 0.05;
        data[i] = melody + kick + bass + vinyl + pad;
      }
      break;
    }
    case 'lofi-morning': {
      // Lofi Morning: Bright, uplifting, gentle energy
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Bright major chords (G -> D -> Em -> C)
        const chordPhase = Math.floor((t / 6) % 4);
        const chordFreqs = [
          [196.00, 246.94, 293.66], // G major
          [146.83, 185.00, 220.00], // D major
          [164.81, 196.00, 246.94], // E minor
          [130.81, 164.81, 196.00], // C major
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.1, 0);
        // Light percussion
        const hihat = ((t * 4) % 1 < 0.05) ? (Math.random() * 0.08) : 0;
        const kick = (t % 2 < 0.08) ? Math.exp(-22 * (t % 2)) * 0.2 : 0;
        // Very subtle vinyl texture (reduced to prevent clicking)
        const crackle = (Math.random() * 2 - 1) * 0.007;
        data[i] = chord + hihat + kick + crackle;
      }
      break;
    }
    case 'lofi-evening': {
      // Lofi Evening: Mellow, introspective, winding down
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Soft minor chords (Am -> Dm -> G -> C)
        const chordPhase = Math.floor((t / 10) % 4);
        const chordFreqs = [
          [220.00, 261.63, 329.63], // A minor
          [146.83, 174.61, 220.00], // D minor
          [196.00, 246.94, 293.66], // G major
          [130.81, 164.81, 196.00], // C major
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.09, 0);
        // Very soft beat
        const kick = (t % 2.5 < 0.1) ? Math.exp(-18 * (t % 2.5)) * 0.18 : 0;
        // Deep bass
        const bass = Math.sin(2 * Math.PI * 82.41 * t) * 0.12;
        // Very subtle vinyl texture (reduced to prevent clicking)
        const vinyl = (Math.random() * 2 - 1) * 0.008;
        data[i] = chord + kick + bass + vinyl;
      }
      break;
    }
    case 'lofi-calm': {
      // Lofi Calm: Ultra-minimal, ambient, deeply relaxing
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Sustained pad-like chords
        const pad1 = Math.sin(2 * Math.PI * 220 * t) * 0.08;
        const pad2 = Math.sin(2 * Math.PI * 277 * t) * 0.07;
        const pad3 = Math.sin(2 * Math.PI * 330 * t) * 0.06;
        // Subtle pulse (no drums)
        const pulse = Math.sin(2 * Math.PI * 0.5 * t) * 0.03;
        // Very subtle vinyl atmosphere (reduced to prevent clicking)
        const atmosphere = (Math.random() * 2 - 1) * 0.01;
        data[i] = pad1 + pad2 + pad3 + (pulse * atmosphere) + atmosphere;
      }
      break;
    }
    case 'lofi-deep-focus': {
      // Deep Focus Room: Intense concentration, minimal distractions - VERY DISTINCT
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Deep, sustained bass note (C2) - more prominent
        const bass = Math.sin(2 * Math.PI * 65.41 * t) * 0.18;
        // Distinct high-frequency pad (E5) - different from other lo-fi
        const pad = Math.sin(2 * Math.PI * 659.25 * t) * 0.08;
        // Very minimal kick (every 2.5 seconds) - unique timing
        const kick = (t % 2.5 < 0.06) ? Math.exp(-30 * (t % 2.5)) * 0.25 : 0;
        // Very subtle vinyl texture (reduced to prevent clicking)
        const vinyl = (Math.random() * 2 - 1) * 0.005;
        // Distinct melody (different scale - D minor pentatonic)
        const melodyFreq = [293.66, 329.63, 392.00, 440.00, 493.88][Math.floor((t / 5) % 5)];
        const melody = Math.sin(2 * Math.PI * melodyFreq * t) * 0.1 * Math.exp(-0.4 * (t % 5));
        // Add subtle high-frequency shimmer for distinction
        const shimmer = Math.sin(2 * Math.PI * 880 * t) * 0.03 * Math.exp(-0.3 * (t % 3));
        data[i] = bass + pad + kick + vinyl + melody + shimmer;
      }
      break;
    }
    case 'lofi-soft-composure': {
      // Soft Composure Room: Calm nervous system, gentle and soothing
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Soft major 7th chords (Cmaj7 -> Am7) - very slow progression
        const chordPhase = Math.floor((t / 12) % 2);
        const chordFreqs = [
          [261.63, 329.63, 392.00, 493.88], // Cmaj7
          [220.00, 261.63, 329.63, 415.30], // Am7
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.07, 0);
        // Very gentle pulse (no drums, just breathing rhythm)
        const pulse = Math.sin(2 * Math.PI * 0.25 * t) * 0.02;
        // Very subtle vinyl atmosphere (reduced to prevent clicking)
        const atmosphere = (Math.random() * 2 - 1) * 0.006;
        // Soft high-frequency shimmer
        const shimmer = Math.sin(2 * Math.PI * 880 * t) * 0.03 * Math.exp(-0.3 * (t % 2));
        data[i] = chord + pulse + atmosphere + shimmer;
      }
      break;
    }
    case 'lofi-warm-connection': {
      // Warm Connection Room: Empathy for 1:1s, warm and inviting
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Warm jazz chords (Dm7 -> G7 -> Cmaj7 -> Am7)
        const chordPhase = Math.floor((t / 8) % 4);
        const chordFreqs = [
          [146.83, 174.61, 220.00, 261.63], // Dm7
          [196.00, 246.94, 293.66, 369.99], // G7
          [261.63, 329.63, 392.00, 493.88], // Cmaj7
          [220.00, 261.63, 329.63, 415.30], // Am7
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.09, 0);
        // Gentle swing beat
        const kick = (t % 2 < 0.08) ? Math.exp(-20 * (t % 2)) * 0.22 : 0;
        const snare = ((t % 2 > 0.95 && t % 2 < 1.05)) ? (Math.random() * 0.12) : 0;
        // Warm bass line
        const bass = Math.sin(2 * Math.PI * 98 * t) * 0.13;
        // Very subtle vinyl warmth (reduced to prevent clicking)
        const vinyl = (Math.random() * 2 - 1) * 0.007;
        data[i] = chord + kick + snare + bass + vinyl;
      }
      break;
    }
    case 'lofi-pitch-pulse': {
      // Pitch Pulse Room: Confidence boost, energizing but not overwhelming
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Uplifting major chord progression (C -> G -> Am -> F)
        const chordPhase = Math.floor((t / 6) % 4);
        const chordFreqs = [
          [130.81, 164.81, 196.00], // C major
          [196.00, 246.94, 293.66], // G major
          [220.00, 261.63, 329.63], // A minor
          [174.61, 220.00, 261.63], // F major
        ][chordPhase];
        const chord = chordFreqs.reduce((sum, freq) => 
          sum + Math.sin(2 * Math.PI * freq * t) * 0.11, 0);
        // Energetic but controlled beat
        const kick = (t % 1.5 < 0.07) ? Math.exp(-25 * (t % 1.5)) * 0.28 : 0;
        const hihat = ((t * 2) % 1 < 0.03) ? (Math.random() * 0.1) : 0;
        // Driving bass
        const bass = Math.sin(2 * Math.PI * 110 * t) * 0.16;
        // Bright melody
        const melodyFreq = [330, 370, 415, 440, 494][Math.floor((t / 1.5) % 5)];
        const melody = Math.sin(2 * Math.PI * melodyFreq * t) * 0.1 * Math.exp(-1.5 * (t % 1.5));
        // Very subtle vinyl texture (reduced to prevent clicking)
        const vinyl = (Math.random() * 2 - 1) * 0.006;
        data[i] = chord + kick + hihat + bass + melody + vinyl;
      }
      break;
    }
    case 'lofi-recovery-lounge': {
      // Recovery Lounge: Decompress after tough scenes, ambient and restorative
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Very slow, ambient pad progression
        const pad1 = Math.sin(2 * Math.PI * 164.81 * t) * 0.06;
        const pad2 = Math.sin(2 * Math.PI * 196.00 * t) * 0.055;
        const pad3 = Math.sin(2 * Math.PI * 246.94 * t) * 0.05;
        // Deep, slow bass (breathing-like)
        const bass = Math.sin(2 * Math.PI * 55 * t) * 0.1;
        // Very gentle, sparse percussion (every 4 seconds)
        const kick = (t % 4 < 0.1) ? Math.exp(-15 * (t % 4)) * 0.15 : 0;
        // Ambient texture (like distant rain)
        const texture = (Math.random() * 2 - 1) * 0.02;
        // Soft high-frequency sparkle
        const sparkle = Math.sin(2 * Math.PI * 1100 * t) * 0.025 * Math.exp(-0.2 * (t % 3));
        data[i] = pad1 + pad2 + pad3 + bass + kick + texture + sparkle;
      }
      break;
    }
    default: {
      data.fill(0);
      break;
    }
  }

  // Apply smooth crossfade at loop boundaries for seamless transitions
  // Use longer fade to prevent clicking
  const fadeSamples = SAMPLE_RATE * FADE_DURATION_SECONDS;
  
  // Fade in at the beginning (smooth curve)
  for (let i = 0; i < fadeSamples; i++) {
    const fadeIn = i / fadeSamples; // 0 to 1
    // Use smooth curve (ease-in-out) to prevent clicks
    const smoothFade = fadeIn * fadeIn * (3 - 2 * fadeIn); // Smoothstep function
    data[i] *= smoothFade;
  }
  
  // Fade out at the end (smooth curve)
  for (let i = 0; i < fadeSamples; i++) {
    const fadeOut = 1 - (i / fadeSamples); // 1 to 0
    // Use smooth curve (ease-in-out) to prevent clicks
    const smoothFade = fadeOut * fadeOut * (3 - 2 * fadeOut); // Smoothstep function
    data[length - fadeSamples + i] *= smoothFade;
  }
  
  // Ensure the very first and last samples are exactly zero to prevent clicks
  data[0] = 0;
  data[length - 1] = 0;
  
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
  const [eventSoundType, setEventSoundType] = useState<SoundType | null>(null);

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
    (muted: boolean) => (muted ? 0 : dimVolume ? 0.6 : 0.85),
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
    // Don't close the audio context - just stop the source
    // Closing the context prevents new sounds from playing
  }, []);

  const cleanupFallback = useCallback(() => {
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.currentTime = 0;
      fallbackAudioRef.current.src = '';
      fallbackAudioRef.current.load(); // Reset the audio element
      fallbackAudioRef.current = null;
    }
  }, []);

  const stopAudio = useCallback((fadeOut: boolean = false): Promise<void> => {
    return new Promise((resolve) => {
      console.log('🛑 stopAudio called', { fadeOut, isPlaying, hasSource: !!sourceRef.current, hasFallback: !!fallbackAudioRef.current });
      
      if (fadeOut && isPlaying) {
        // Graceful fade out over 500ms
        const fadeDuration = 0.5; // seconds
        const context = audioContextRef.current;
        
        if (context && gainRef.current) {
          const gainNode = gainRef.current;
          const startVolume = gainNode.gain.value;
          const startTime = context.currentTime;
          
          // Fade out
          gainNode.gain.setValueAtTime(startVolume, startTime);
          gainNode.gain.linearRampToValueAtTime(0, startTime + fadeDuration);
          
          // Also fade out fallback audio if playing
          if (fallbackAudioRef.current) {
            const audio = fallbackAudioRef.current;
            const currentVolume = audio.volume;
            const fadeStep = currentVolume / (fadeDuration * 60); // 60 steps per second
            const fadeInterval = setInterval(() => {
              if (audio.volume > 0) {
                audio.volume = Math.max(0, audio.volume - fadeStep);
              } else {
                clearInterval(fadeInterval);
              }
            }, 1000 / 60); // 60fps
            
            setTimeout(() => {
              clearInterval(fadeInterval);
              cleanupFallback();
            }, fadeDuration * 1000);
          }
          
          // Wait for fade to complete, then stop
          setTimeout(() => {
            cleanupSource();
            cleanupFallback();
            setIsPlaying(false);
            setEventSoundType(null); // Clear event sound type
            localStorage.removeItem('meetcute_autoplay_sound');
            console.log('✅ Audio fully stopped after fade');
            resolve();
          }, fadeDuration * 1000);
          
          return;
        }
      }
      
      // Immediate stop (no fade) - FORCE stop everything
      console.log('🛑 Immediate stop - cleaning up all audio sources');
      
      // Force stop WebAudio immediately
      if (sourceRef.current) {
        try {
          sourceRef.current.stop(0); // Immediate stop
        } catch (e) {
          // Source might already be stopped
        }
      }
      if (gainRef.current && audioContextRef.current) {
        try {
          gainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        } catch (e) {
          // Gain might not be connected
        }
      }
      
      // Force stop HTML5 Audio immediately
      if (fallbackAudioRef.current) {
        try {
          fallbackAudioRef.current.pause();
          fallbackAudioRef.current.currentTime = 0;
          fallbackAudioRef.current.volume = 0;
        } catch (e) {
          // Audio might already be stopped
        }
      }
      
      cleanupSource();
      cleanupFallback();
      setIsPlaying(false);
      setEventSoundType(null); // Clear event sound type
      // Clear any pending autoplay flags
      localStorage.removeItem('meetcute_autoplay_sound');
      console.log('✅ Audio immediately stopped and cleared');
      resolve();
    });
  }, [cleanupFallback, cleanupSource, isPlaying]);

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (!supportsWebAudio) {
      return null;
    }

    let context = audioContextRef.current;
    
    // If context doesn't exist or is closed, create a new one
    if (!context || context.state === 'closed') {
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
    
    // Resume context if it's suspended
    if (context.state === 'suspended') {
      context.resume().catch((err) => {
        console.warn('⚠️ Error resuming audio context', err);
      });
    }

    return context;
  }, [supportsWebAudio]);

  const startFallbackAudio = useCallback(async (overrideSoundType?: SoundType) => {
    const currentSoundType = overrideSoundType || eventSoundType || soundType;
    console.log('🎵 startFallbackAudio called with:', { currentSoundType, overrideSoundType, eventSoundType, soundType, enabled });
    if (!enabled || !currentSoundType || currentSoundType === 'none') {
      console.warn('⚠️ Not starting fallback audio:', { enabled, currentSoundType });
      stopAudio();
      return;
    }

    const audioUrl = createDataUrl(currentSoundType);
    console.log('🎵 Created audio URL for:', currentSoundType);
    if (!audioUrl) {
      throw new Error('No audio URL available for fallback playback');
    }

    cleanupSource();
    cleanupFallback();

    console.log('🎵 Using HTML Audio (iOS silent mode compatible)', { isIOS, soundType: currentSoundType });

    const audio = new Audio(audioUrl);
    audio.loop = true;
    const targetVolume = getVolume(isMuted);
    audio.volume = 0; // Start at 0 for fade in
    audio.preload = 'auto';
    
    // Store target volume for fade in
    (audio as any)._targetVolume = targetVolume;
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
      
      // Fade in over 500ms
      const fadeDuration = 0.5; // seconds
      const fadeStep = targetVolume / (fadeDuration * 60); // 60 steps per second
      let currentVol = 0;
      const fadeInterval = setInterval(() => {
        currentVol = Math.min(targetVolume, currentVol + fadeStep);
        audio.volume = currentVol;
        if (currentVol >= targetVolume) {
          clearInterval(fadeInterval);
          audio.volume = targetVolume; // Ensure exact target
        }
      }, 1000 / 60); // 60fps
      
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
    async (sourceLabel: string, overrideSoundType?: SoundType) => {
      const currentSoundType = overrideSoundType || eventSoundType || soundType;
      console.log('🎵 startWebAudio called with:', { sourceLabel, currentSoundType, overrideSoundType, eventSoundType, soundType });
      
      if (!currentSoundType || currentSoundType === 'none') {
        console.warn('⚠️ No valid soundType for startWebAudio');
        throw new Error('No valid soundType provided');
      }
      
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

      const buffer = getAudioBuffer(context, currentSoundType);
      const gainNode = gainRef.current || context.createGain();
      
      // Fade in the new sound over 500ms
      const fadeDuration = 0.5; // seconds
      const targetVolume = getVolume(isMuted);
      const startTime = context.currentTime;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + fadeDuration);
      
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
        soundType: currentSoundType,
      });

      setIsPlaying(true);
      setNeedsInteraction(false);
      localStorage.removeItem('meetcute_autoplay_sound');
    },
    [cleanupFallback, cleanupSource, ensureAudioContext, getVolume, isMuted, eventSoundType, soundType]
  );

  const startAudio = useCallback(
    async (sourceLabel: string, overrideSoundType?: SoundType) => {
      // Prioritize overrideSoundType (from event), then eventSoundType (from state), then soundType prop
      // But if soundType prop is 'none', only use overrideSoundType or eventSoundType
      const currentSoundType = overrideSoundType || eventSoundType || (soundType !== 'none' ? soundType : null);
      console.log('🎵 startAudio called with:', { sourceLabel, currentSoundType, overrideSoundType, eventSoundType, soundType, enabled, needsInteraction });
      if (!enabled || !currentSoundType || currentSoundType === 'none') {
        console.warn('⚠️ Cannot start audio:', { enabled, currentSoundType, overrideSoundType, eventSoundType, soundType });
        stopAudio();
        return;
      }

      // Try to unlock audio context if needed
      if (needsInteraction) {
        try {
          const context = ensureAudioContext();
          if (context && context.state === 'suspended') {
            await context.resume();
            console.log('✅ Audio context resumed');
          }
        } catch (unlockError) {
          console.warn('⚠️ Could not unlock audio context:', unlockError);
        }
      }

      try {
        await startWebAudio(sourceLabel, currentSoundType);
      } catch (webAudioError: any) {
        console.warn('⚠️ WebAudio failed, falling back to HTMLAudio', webAudioError);
        try {
          await startFallbackAudio(currentSoundType);
        } catch (fallbackError: any) {
          console.error('❌ Unable to start ambient sound', fallbackError);
          // Only set needsInteraction if it's actually a user interaction error
          if (fallbackError.message?.includes('play()') || fallbackError.message?.includes('interaction') || fallbackError.name === 'NotAllowedError') {
            setNeedsInteraction(true);
            console.log('ℹ️ Audio requires user interaction');
          }
        }
      }
    },
    [enabled, eventSoundType, soundType, startWebAudio, startFallbackAudio, stopAudio, needsInteraction, ensureAudioContext]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const volume = getVolume(next);

      // Update volume on existing refs immediately
      if (gainRef.current) {
        gainRef.current.gain.value = volume;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.volume = volume;
      }

      // If refs don't exist yet (sound is starting), the useEffect will sync when they're created
      // This ensures mute state is always respected, even during sound transitions

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

    const playHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ source?: string; roomId?: string; soundType?: SoundType }>;
      const eventSoundTypeValue = customEvent.detail?.soundType;
      console.log('🎵 ambient-sound-play event received', { 
        eventSoundType: eventSoundTypeValue, 
        currentSoundType: soundType,
        currentEventSoundType: eventSoundType,
        detail: customEvent.detail 
      });
      
      if (!enabled) {
        console.warn('⚠️ AmbientSound is disabled, not starting audio');
        return;
      }
      
      // CRITICAL: Use event's soundType if provided, otherwise fall back to prop
      // But if prop is 'none', only use event's soundType
      const soundToPlay = eventSoundTypeValue || (soundType !== 'none' ? soundType : null);
      
      if (!soundToPlay || soundToPlay === 'none') {
        console.warn('⚠️ No valid soundType provided:', { eventSoundTypeValue, soundType, enabled });
        return;
      }
      
      // Update event soundType state immediately
      if (eventSoundTypeValue) {
        setEventSoundType(eventSoundTypeValue);
      }
      
      // Gracefully fade out any currently playing audio first, then start new sound
      stopAudio(true).then(() => {
        // Longer delay to ensure fade out and cleanup fully completes
        setTimeout(async () => {
          console.log('🎵 Starting audio with soundType:', soundToPlay);
          
          // If audio needs user interaction, try to unlock it first
          if (needsInteraction) {
            console.log('🎵 Audio needs interaction, attempting to unlock...');
            try {
              const context = ensureAudioContext();
              if (context) {
                await unlockAudioContext(context);
                setNeedsInteraction(false);
              }
            } catch (unlockError) {
              console.warn('⚠️ Could not unlock audio context:', unlockError);
            }
          }
          
          // Pass the soundType directly to startAudio to ensure it's used
          try {
            await startAudio('event-dispatch', soundToPlay);
          } catch (startError: any) {
            console.error('❌ Failed to start audio:', startError);
            // If it fails due to user interaction, set the flag so user can click to play
            if (startError.message?.includes('interaction') || startError.message?.includes('play()')) {
              setNeedsInteraction(true);
              console.log('ℹ️ Audio requires user interaction - user can click play button to start');
            }
          }
        }, 400); // Increased delay for smoother transition
      });
    };

    const stopHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ source?: string; fadeOut?: boolean }>;
      const shouldFadeOut = customEvent.detail?.fadeOut === true;
      console.log('🛑 ambient-sound-stop event received', { shouldFadeOut, source: customEvent.detail?.source });
      // Stop audio with fade if requested
      stopAudio(shouldFadeOut);
      setNeedsInteraction(true);
    };

    const volumeHandler = (e: Event) => {
      const customEvent = e as CustomEvent<{ volume: number }>;
      const newVolume = customEvent.detail?.volume ?? 0.85;
      console.log('🔊 ambient-sound-volume event received', { volume: newVolume });
      
      // Update volume on existing refs immediately
      if (gainRef.current) {
        gainRef.current.gain.value = newVolume;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.volume = newVolume;
      }
      
      // Update mute state based on volume
      setIsMuted(newVolume === 0);
    };

    window.addEventListener('ambient-sound-play', playHandler);
    window.addEventListener('ambient-sound-stop', stopHandler);
    window.addEventListener('ambient-sound-volume', volumeHandler);

    return () => {
      window.removeEventListener('ambient-sound-play', playHandler);
      window.removeEventListener('ambient-sound-stop', stopHandler);
      window.removeEventListener('ambient-sound-volume', volumeHandler);
    };
  }, [enabled, startAudio, stopAudio, soundType, eventSoundType]);

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

  // Handle soundType prop changes (for direct prop usage, not event-based)
  // Note: Event-based sounds take priority, so only use prop if no event soundType is set
  useEffect(() => {
    if (!enabled || soundType === 'none') {
      // Only stop if we're not using event-based sound
      if (!eventSoundType) {
        stopAudio();
      }
      return;
    }

    // If we have an eventSoundType, don't override it with prop changes
    // Events take priority over props
    if (eventSoundType) {
      return;
    }

    // Always stop ALL previous audio completely before starting new sound
    // Use fade out to prevent clicking
    stopAudio(true).then(() => {
      // Longer delay to ensure fade out fully completes before starting new sound
      const timer = setTimeout(() => {
        if (!needsInteraction && enabled) {
          // Double-check we're still supposed to play
          startAudio('sound-change');
        }
      }, 300); // Increased delay for smoother transition

      return () => clearTimeout(timer);
    });
  }, [enabled, soundType, eventSoundType, needsInteraction, startAudio, stopAudio]);

  useEffect(() => {
    const volume = getVolume(isMuted);

    // Update volume on existing refs immediately
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.volume = volume;
    }
  }, [dimVolume, getVolume, isMuted]);

  // Ensure mute state is applied when new audio sources are created
  // This fixes the issue where mute button stops working after Scene Library plays a sound
  useEffect(() => {
    if (!isPlaying) return;
    
    const volume = getVolume(isMuted);
    
    // Sync volume whenever refs are available (handles case where sound was restarted)
    const syncVolume = () => {
      if (gainRef.current) {
        gainRef.current.gain.value = volume;
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.volume = volume;
      }
    };
    
    // Try to sync immediately
    syncVolume();
    
    // Also sync after a short delay to catch cases where refs are created asynchronously
    const timeout = setTimeout(syncVolume, 100);
    
    return () => clearTimeout(timeout);
  }, [isMuted, isPlaying, getVolume]);

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

