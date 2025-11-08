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

  // Sound URLs - using royalty-free ambient sounds
  const soundUrls: Record<string, string> = {
    'calm-ocean': 'https://cdn.pixabay.com/audio/2022/05/13/audio_2f888e9d83.mp3', // Ocean waves
    'rain': 'https://cdn.pixabay.com/audio/2022/03/10/audio_c610232c26.mp3', // Rain sounds
    'forest': 'https://cdn.pixabay.com/audio/2022/03/10/audio_24345a11d0.mp3', // Forest ambience
    'white-noise': 'https://cdn.pixabay.com/audio/2023/10/30/audio_24b0e13f4c.mp3', // White noise
    'meditation-bell': 'https://cdn.pixabay.com/audio/2022/03/24/audio_c610232c26.mp3', // Meditation bell
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
      audio.src = soundUrls[soundType] || soundUrls['white-noise'];
      audio.loop = true;
      audio.volume = dimVolume ? 0.15 : 0.3;
      audio.preload = 'auto';
      
      // CRITICAL: Set playsinline for iOS
      audio.setAttribute('playsinline', 'true');
      
      audioRef.current = audio;

      // Play the audio
      await audio.play();
      console.log('✅ Audio playing - works even on iOS silent mode!');
    } catch (error: any) {
      console.error('❌ Error playing audio:', error);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      console.log('🛑 Stopping audio...');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = dimVolume ? 0.15 : 0.3;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Initialize audio when component mounts or settings change
  useEffect(() => {
    initializeAudio();

    return () => {
      stopAudio();
    };
  }, [soundType, enabled]);

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
