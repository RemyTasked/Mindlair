import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enabled: boolean;
  dimVolume?: boolean; // Dim volume when voice is speaking
  stopOnNavigation?: boolean; // Stop sound when navigating away from current page
}

export default function AmbientSound({ soundType, enabled, dimVolume = false, stopOnNavigation = true }: AmbientSoundProps) {
  const location = useLocation();
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  const initializeAudio = async () => {
    if (!enabled || soundType === 'none') {
      console.log('🔇 Audio disabled or sound type is none');
      return;
    }

    console.log('🎵 Initializing Web Audio API...', { soundType });

    try {
      // Stop any existing audio
      stopAudio();

      // Create audio context with options to bypass silent mode on iOS
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext({
        latencyHint: 'interactive',
        sampleRate: 44100,
      });
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        console.log('🔓 Resuming suspended audio context...');
        await audioContext.resume();
      }

      // Force audio to play even if device is on silent/vibrate mode (iOS)
      // This is important for meditation/focus apps where audio is intentional
      if (audioContext.state === 'running') {
        console.log('✅ Audio context running - will play even on silent mode');
      }

      console.log('🎵 Audio context state:', audioContext.state);

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3; // Start at 30% volume
      gainNode.connect(audioContext.destination);
      gainNodeRef.current = gainNode;

      // Generate ambient sound based on type
      generateAmbientSound(audioContext, gainNode, soundType);

      setIsPlaying(true);
      setNeedsInteraction(false);
      console.log('✅ Ambient sound started successfully!', { 
        state: audioContext.state,
        soundType 
      });
    } catch (error: any) {
      console.error('❌ Error initializing audio:', error);
      setNeedsInteraction(true);
    }
  };

  const generateAmbientSound = (
    audioContext: AudioContext,
    gainNode: GainNode,
    type: string
  ) => {
    const oscillators: OscillatorNode[] = [];

    if (type === 'calm-ocean' || type === 'white-noise' || type === 'rain') {
      // Create white noise using buffer
      const bufferSize = 2 * audioContext.sampleRate;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter for different sounds - each type gets distinct characteristics
      const filter = audioContext.createBiquadFilter();
      
      if (type === 'calm-ocean') {
        // Ocean: Deep, rolling waves (low frequency rumble)
        filter.type = 'lowpass';
        filter.frequency.value = 400;  // Lower for deeper ocean sound
        filter.Q.value = 0.3;           // Smooth rolloff
        
        // Add gentle modulation for wave-like effect
        const lfo = audioContext.createOscillator();
        lfo.frequency.value = 0.2; // Slow modulation (5 seconds per wave)
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = 100; // Modulation depth
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        
        whiteNoise.connect(filter);
        filter.connect(gainNode);
        whiteNoise.start();
        
        oscillatorsRef.current = [whiteNoise as any, lfo as any];
      } else if (type === 'rain') {
        // Rain: Mid-high frequency, crisp droplets
        filter.type = 'bandpass';
        filter.frequency.value = 2000;  // Higher for rain patter sound
        filter.Q.value = 2;              // Sharper, more defined
        
        whiteNoise.connect(filter);
        filter.connect(gainNode);
        whiteNoise.start();
        
        oscillatorsRef.current = [whiteNoise as any];
      } else if (type === 'white-noise') {
        // White noise: Broad spectrum for focus/masking
        filter.type = 'highpass';
        filter.frequency.value = 200;    // Remove very low rumble
        filter.Q.value = 0.5;
        
        // Add second filter for shaping
        const filter2 = audioContext.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.value = 8000;  // Remove harsh highs
        filter2.Q.value = 0.5;
        
        whiteNoise.connect(filter);
        filter.connect(filter2);
        filter2.connect(gainNode);
        whiteNoise.start();
        
        oscillatorsRef.current = [whiteNoise as any];
      }

      // Note: This block only runs for noise-based sounds
    } else if (type === 'forest') {
      // Forest sounds - layered low frequencies
      const frequencies = [100, 150, 200, 250];
      
      frequencies.forEach((freq) => {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const oscGain = audioContext.createGain();
        oscGain.gain.value = 0.05;
        
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start();
        
        oscillators.push(osc);
      });

      oscillatorsRef.current = oscillators;
    } else if (type === 'meditation-bell') {
      // Meditation - soft sine waves
      const frequencies = [432, 528, 639]; // Healing frequencies
      
      frequencies.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const oscGain = audioContext.createGain();
        oscGain.gain.value = 0.08 / (index + 1);
        
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start();
        
        oscillators.push(osc);
      });

      oscillatorsRef.current = oscillators;
    }
  };

  const stopAudio = () => {
    console.log('🛑 Stopping audio...');
    
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    oscillatorsRef.current = [];

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsPlaying(false);
  };

  // Stop audio when navigating away (if stopOnNavigation is true)
  useEffect(() => {
    if (stopOnNavigation) {
      return () => {
        console.log('🚪 Navigation detected - stopping dashboard ambient sound');
        stopAudio();
      };
    }
  }, [location.pathname, stopOnNavigation]);

  useEffect(() => {
    if (!enabled || soundType === 'none') {
      stopAudio();
      return;
    }

    // Try to auto-play (will work if user just interacted with page)
    console.log('🎵 Attempting to start ambient sound...');
    initializeAudio();
    
    // Cleanup
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundType, enabled]);

  // Separate effect for handling user interaction
  useEffect(() => {
    // Add global click listener to auto-start sound after ANY user interaction
    const handleGlobalClick = () => {
      if (needsInteraction && !isPlaying && enabled && soundType !== 'none') {
        console.log('👆 User clicked page - attempting to start audio');
        initializeAudio();
      }
    };
    
    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInteraction, isPlaying, enabled, soundType]);

  // Dim volume when voice is speaking
  useEffect(() => {
    if (gainNodeRef.current && !isMuted) {
      if (dimVolume) {
        // Smoothly dim to 10% when voice speaks
        gainNodeRef.current.gain.setTargetAtTime(0.1, audioContextRef.current!.currentTime, 0.3);
        console.log('🔉 Dimming ambient sound for voice narration');
      } else {
        // Smoothly restore to 30% when voice stops
        gainNodeRef.current.gain.setTargetAtTime(0.3, audioContextRef.current!.currentTime, 0.3);
        console.log('🔊 Restoring ambient sound volume');
      }
    }
  }, [dimVolume, isMuted]);

  const handleClick = () => {
    console.log('🖱️ Audio button clicked', { needsInteraction, isPlaying, isMuted });
    
    if (needsInteraction || !isPlaying) {
      // User clicked to enable sound
      console.log('👆 User interaction detected - initializing audio');
      initializeAudio();
    } else if (gainNodeRef.current) {
      // Toggle mute
      if (isMuted) {
        console.log('🔊 Unmuting audio');
        gainNodeRef.current.gain.value = dimVolume ? 0.1 : 0.3;
        setIsMuted(false);
      } else {
        console.log('🔇 Muting audio');
        gainNodeRef.current.gain.value = 0;
        setIsMuted(true);
      }
    }
  };

  if (!enabled || soundType === 'none') {
    console.log('🔇 AmbientSound not rendering:', { enabled, soundType });
    return null;
  }

  console.log('🎵 AmbientSound rendering button:', { 
    enabled, 
    soundType, 
    needsInteraction, 
    isPlaying,
    isMuted 
  });

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[9999] p-3 sm:p-4 backdrop-blur-md rounded-full transition-all shadow-2xl border-2 ${
        needsInteraction || !isPlaying
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/60 animate-pulse hover:from-indigo-500 hover:to-purple-500 hover:scale-110'
          : isMuted
          ? 'bg-gray-600 text-white border-gray-400 hover:bg-gray-500 hover:scale-110'
          : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50 hover:scale-110'
      }`}
      aria-label={needsInteraction || !isPlaying ? "Enable ambient sound" : isMuted ? "Unmute sound" : "Mute sound"}
      title={needsInteraction || !isPlaying ? "Click to enable calming sounds" : isMuted ? "Click to unmute" : "Click to mute"}
    >
      {needsInteraction || !isPlaying ? (
        <div className="flex items-center gap-2 text-white">
          <Volume2 className="w-6 h-6" />
          <span className="text-sm font-bold whitespace-nowrap">🎵 Enable Sound</span>
        </div>
      ) : isMuted ? (
        <VolumeX className="w-6 h-6" />
      ) : (
        <div className="flex items-center gap-2">
          <Volume2 className="w-6 h-6" />
          <span className="text-xs font-medium">Playing</span>
        </div>
      )}
    </button>
  );
}
