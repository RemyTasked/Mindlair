import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  soundType: 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'none';
  enabled: boolean;
}

// Sound URLs - using reliable free ambient sounds
// Using freesound.org and other reliable sources with proper CORS headers
const SOUND_URLS: Record<string, string> = {
  'calm-ocean': 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3',
  'rain': 'https://assets.mixkit.co/active_storage/sfx/2390/2390-preview.mp3',
  'forest': 'https://assets.mixkit.co/active_storage/sfx/2462/2462-preview.mp3',
  'meditation-bell': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'white-noise': 'https://assets.mixkit.co/active_storage/sfx/2390/2390-preview.mp3',
  'none': '',
};

export default function AmbientSound({ soundType, enabled }: AmbientSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true); // Start as true - require interaction

  const initializeAudio = async () => {
    if (!enabled || soundType === 'none') {
      console.log('🔇 Audio disabled or sound type is none');
      return;
    }

    const soundUrl = SOUND_URLS[soundType];
    if (!soundUrl) {
      console.error('❌ No sound URL found for type:', soundType);
      return;
    }

    console.log('🎵 Initializing audio...', { soundType, soundUrl });

    try {
      // Stop and cleanup any existing audio
      if (audioRef.current) {
        console.log('🛑 Stopping existing audio');
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      // Create and configure audio element
      const audio = new Audio(soundUrl);
      audio.loop = true;
      audio.volume = 0.4;
      audio.preload = 'auto';
      
      // Add event listeners for debugging
      audio.addEventListener('loadstart', () => console.log('📥 Audio loading started'));
      audio.addEventListener('loadeddata', () => console.log('✅ Audio data loaded'));
      audio.addEventListener('canplay', () => console.log('▶️ Audio can play'));
      audio.addEventListener('playing', () => console.log('🔊 Audio is playing'));
      audio.addEventListener('error', (e) => console.error('❌ Audio error:', e));
      
      audioRef.current = audio;

      setIsLoading(true);
      setNeedsInteraction(false);

      console.log('▶️ Attempting to play audio...');
      // Try to play
      await audio.play();
      setIsLoading(false);
      console.log('✅ Ambient sound started successfully!', {
        volume: audio.volume,
        loop: audio.loop,
        paused: audio.paused,
        currentTime: audio.currentTime,
      });
    } catch (error: any) {
      console.error('❌ Error playing ambient sound:', {
        name: error.name,
        message: error.message,
        error,
      });
      setIsLoading(false);
      
      // If autoplay was blocked, show button to enable sound
      if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
        setNeedsInteraction(true);
        console.log('⚠️ Autoplay blocked - user interaction needed');
      } else {
        // Other errors
        setNeedsInteraction(true);
        console.error('⚠️ Unknown audio error - showing enable button');
      }
    }
  };

  useEffect(() => {
    if (!enabled || soundType === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    // Try to auto-play (will work if user just interacted with page)
    console.log('🎵 Attempting to start ambient sound...');
    const attemptAutoPlay = async () => {
      try {
        await initializeAudio();
      } catch (error) {
        console.log('⚠️ Auto-play blocked, showing enable button');
      }
    };
    
    attemptAutoPlay();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundType, enabled]);

  const handleClick = async () => {
    console.log('🖱️ Audio button clicked', { needsInteraction, hasAudio: !!audioRef.current, isMuted });
    
    if (needsInteraction) {
      // User clicked to enable sound
      console.log('👆 User interaction detected - initializing audio');
      await initializeAudio();
    } else if (audioRef.current) {
      // Toggle mute
      if (isMuted) {
        console.log('🔊 Unmuting audio');
        audioRef.current.volume = 0.4;
        setIsMuted(false);
      } else {
        console.log('🔇 Muting audio');
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    } else {
      console.error('❌ No audio reference found, trying to reinitialize');
      await initializeAudio();
    }
  };

  if (!enabled || soundType === 'none') {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-4 left-4 sm:bottom-8 sm:left-8 p-3 sm:p-4 backdrop-blur-sm rounded-full transition-all text-white shadow-lg z-50 ${
        needsInteraction 
          ? 'bg-yellow-500/80 hover:bg-yellow-600/80 animate-pulse' 
          : 'bg-white/10 hover:bg-white/20'
      }`}
      aria-label={needsInteraction ? 'Enable sound' : (isMuted ? 'Unmute sound' : 'Mute sound')}
      title={needsInteraction ? '🔊 Tap to enable ambient sound' : (isMuted ? 'Unmute ambient sound' : 'Mute ambient sound')}
    >
      {isLoading ? (
        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : needsInteraction ? (
        <div className="relative flex items-center gap-2">
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-sm font-semibold">Enable Sound</span>
        </div>
      ) : isMuted ? (
        <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
      ) : (
        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
      )}
    </button>
  );
}

