/**
 * Mind Garden - Spotify Player Component
 * 
 * Mini player UI with:
 * - Play/pause/skip controls
 * - Volume slider
 * - Track info display
 * - Connection status
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Music2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import spotify from '../services/spotify';

interface SpotifyPlayerProps {
  flowType?: string;
  autoPlay?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  compact?: boolean;
  className?: string;
}

interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  progress: number;
}

export default function SpotifyPlayer({
  flowType,
  autoPlay = false,
  onPlayStateChange,
  compact = false,
  className = '',
}: SpotifyPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize player and check connection
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const status = await spotify.getConnectionStatus();
        setIsConnected(status.connected);
        
        if (status.connected) {
          await spotify.initializePlayer();
          
          // Get initial playback state
          const state = await spotify.getPlaybackState();
          if (state) {
            setIsPlaying(state.isPlaying);
            setTrack(state.track);
          }
          
          // Auto-play flow music if requested
          if (autoPlay && flowType) {
            await spotify.playFlowMusic(flowType);
          }
        }
      } catch (err) {
        console.error('Failed to initialize Spotify:', err);
        setError('Failed to connect to Spotify');
      } finally {
        setIsLoading(false);
      }
    };

    init();
    
    // Subscribe to state changes
    const handleStateChange = (state: any) => {
      setIsPlaying(!state.paused);
      setTrack(state.track);
      onPlayStateChange?.(!state.paused);
    };
    
    const handleError = (err: any) => {
      setError(err.message);
    };
    
    spotify.addEventListener('state_changed', handleStateChange);
    spotify.addEventListener('error', handleError);
    
    return () => {
      spotify.removeEventListener('state_changed', handleStateChange);
      spotify.removeEventListener('error', handleError);
    };
  }, [autoPlay, flowType, onPlayStateChange]);

  // Handle play/pause
  const handleTogglePlay = useCallback(async () => {
    try {
      await spotify.togglePlay();
    } catch (err) {
      console.error('Toggle play failed:', err);
    }
  }, []);

  // Handle next track
  const handleNext = useCallback(async () => {
    try {
      await spotify.nextTrack();
    } catch (err) {
      console.error('Next track failed:', err);
    }
  }, []);

  // Handle previous track
  const handlePrevious = useCallback(async () => {
    try {
      await spotify.previousTrack();
    } catch (err) {
      console.error('Previous track failed:', err);
    }
  }, []);

  // Handle volume change
  const handleVolumeChange = useCallback(async (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    await spotify.setVolume(newVolume / 100);
  }, []);

  // Handle mute toggle
  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      await spotify.setVolume(volume / 100);
    } else {
      await spotify.setVolume(0);
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  // Connect to Spotify
  const handleConnect = useCallback(async () => {
    try {
      const authUrl = await spotify.connectSpotify();
      window.open(authUrl, '_blank', 'width=500,height=700');
    } catch (err) {
      console.error('Failed to start Spotify auth:', err);
    }
  }, []);

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not connected state
  if (!isConnected && !isLoading) {
    return (
      <div className={`bg-zinc-900/50 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Music2 className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Spotify</p>
            <p className="text-xs text-zinc-400">Connect for flow music</p>
          </div>
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            Connect
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-zinc-900/50 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact && !isExpanded) {
    return (
      <motion.div
        className={`bg-zinc-900/50 rounded-xl overflow-hidden ${className}`}
        layout
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="p-1.5 rounded-lg bg-green-500/20">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {track?.name || 'Spotify'}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {track?.artist || 'Not playing'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlay();
              }}
              className="p-1.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-white" />
              ) : (
                <Play className="w-3.5 h-3.5 text-white" />
              )}
            </button>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
        </button>
      </motion.div>
    );
  }

  // Full player view
  return (
    <motion.div
      className={`bg-zinc-900/50 rounded-xl overflow-hidden ${className}`}
      layout
    >
      {/* Collapse button for compact mode */}
      {compact && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full p-2 flex items-center justify-center hover:bg-zinc-800/50 transition-colors border-b border-zinc-800"
        >
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        </button>
      )}
      
      <div className="p-4">
        {/* Track Info */}
        <div className="flex items-center gap-4 mb-4">
          {/* Album Art */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
            {track?.albumArt ? (
              <img
                src={track.albumArt}
                alt={track.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>
          
          {/* Track Details */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-200 truncate">
              {track?.name || 'No track playing'}
            </p>
            <p className="text-sm text-zinc-400 truncate">
              {track?.artist || 'Start playing to see track info'}
            </p>
            {track && (
              <p className="text-xs text-zinc-500 mt-1">
                {formatTime(track.progress)} / {formatTime(track.duration)}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {track && (
          <div className="mb-4">
            <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(track.progress / track.duration) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleTogglePlay}
              className="p-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            
            <button
              onClick={handleNext}
              className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="relative">
            <button
              onClick={handleMuteToggle}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            
            <AnimatePresence>
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 p-3 bg-zinc-800 rounded-xl shadow-xl"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="w-24 h-2 accent-green-500"
                  />
                  <div className="text-xs text-zinc-400 text-center mt-1">
                    {isMuted ? '0' : volume}%
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2 bg-red-500/20 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

