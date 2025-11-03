import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enabled: boolean;
}

// Sound URLs - using free ambient sounds from various sources
const SOUND_URLS: Record<string, string> = {
  'calm-ocean': 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_5cbbe1cc9e.mp3',
  'rain': 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  'forest': 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c610217018.mp3',
  'meditation-bell': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_2c8e1f4e8a.mp3',
  'white-noise': 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_bb630cc098.mp3',
  'none': '',
};

export default function AmbientSound({ soundType, enabled }: AmbientSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const initializeAudio = async () => {
    if (!enabled || soundType === 'none') return;

    const soundUrl = SOUND_URLS[soundType];
    if (!soundUrl) return;

    try {
      // Create and configure audio element
      const audio = new Audio(soundUrl);
      audio.loop = true;
      audio.volume = 0.4;
      audio.preload = 'auto';
      audioRef.current = audio;

      setIsLoading(true);
      setNeedsInteraction(false);

      // Try to play
      await audio.play();
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error: any) {
      console.error('Error playing ambient sound:', error);
      setIsLoading(false);
      
      // If autoplay was blocked, show button to enable sound
      if (error.name === 'NotAllowedError') {
        setNeedsInteraction(true);
      }
    }
  };

  useEffect(() => {
    if (!enabled || soundType === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    // Initialize audio
    initializeAudio();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [soundType, enabled]);

  const handleClick = async () => {
    if (needsInteraction) {
      // User clicked to enable sound
      await initializeAudio();
    } else if (audioRef.current) {
      // Toggle mute
      if (isMuted) {
        audioRef.current.volume = 0.4;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
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
      className="fixed bottom-4 left-4 sm:bottom-8 sm:left-8 p-3 sm:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all text-white shadow-lg z-50"
      aria-label={needsInteraction ? 'Enable sound' : (isMuted ? 'Unmute sound' : 'Mute sound')}
      title={needsInteraction ? 'Tap to enable ambient sound' : (isMuted ? 'Unmute ambient sound' : 'Mute ambient sound')}
    >
      {isLoading ? (
        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : needsInteraction ? (
        <div className="relative">
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
        </div>
      ) : isMuted ? (
        <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
      ) : (
        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
      )}
    </button>
  );
}

