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

  useEffect(() => {
    if (!enabled || soundType === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const soundUrl = SOUND_URLS[soundType];
    if (!soundUrl) return;

    // Create and configure audio element
    const audio = new Audio(soundUrl);
    audio.loop = true;
    audio.volume = 0.4; // Set to 40% volume for background ambience
    audioRef.current = audio;

    setIsLoading(true);

    // Play the audio
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error playing ambient sound:', error);
          setIsLoading(false);
        });
    }

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundType, enabled]);

  const toggleMute = () => {
    if (audioRef.current) {
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
      onClick={toggleMute}
      className="fixed bottom-8 left-8 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all text-white"
      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
      title={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
    >
      {isLoading ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : isMuted ? (
        <VolumeX className="w-6 h-6" />
      ) : (
        <Volume2 className="w-6 h-6" />
      )}
    </button>
  );
}

