import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enabled: boolean;
}

export default function AmbientSound({ soundType, enabled }: AmbientSoundProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  const initializeAudio = () => {
    if (!enabled || soundType === 'none') {
      console.log('🔇 Audio disabled or sound type is none');
      return;
    }

    console.log('🎵 Initializing Web Audio API...', { soundType });

    try {
      // Stop any existing audio
      stopAudio();

      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3; // Start at 30% volume
      gainNode.connect(audioContext.destination);
      gainNodeRef.current = gainNode;

      // Generate ambient sound based on type
      generateAmbientSound(audioContext, gainNode, soundType);

      setIsPlaying(true);
      setNeedsInteraction(false);
      console.log('✅ Ambient sound started successfully!');
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

      // Filter for different sounds
      const filter = audioContext.createBiquadFilter();
      
      if (type === 'calm-ocean') {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;
      } else if (type === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
      }

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      whiteNoise.start();

      oscillatorsRef.current = [whiteNoise as any];
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
        gainNodeRef.current.gain.value = 0.3;
        setIsMuted(false);
      } else {
        console.log('🔇 Muting audio');
        gainNodeRef.current.gain.value = 0;
        setIsMuted(true);
      }
    }
  };

  if (!enabled || soundType === 'none') {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-8 right-8 z-50 p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all shadow-lg border border-white/20"
      aria-label={needsInteraction || !isPlaying ? "Enable ambient sound" : isMuted ? "Unmute sound" : "Mute sound"}
    >
      {needsInteraction || !isPlaying ? (
        <div className="flex items-center gap-2">
          <Volume2 className="w-6 h-6" />
          <span className="text-sm font-medium">Enable Sound</span>
        </div>
      ) : isMuted ? (
        <VolumeX className="w-6 h-6" />
      ) : (
        <Volume2 className="w-6 h-6" />
      )}
    </button>
  );
}
