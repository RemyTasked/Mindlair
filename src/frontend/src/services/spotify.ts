/**
 * Mind Garden - Spotify Integration Service
 * 
 * Wraps Spotify Web Playback SDK and backend API for:
 * - Authentication flow
 * - Playback control
 * - Flow-specific playlist recommendations
 * - Volume ducking for guided sessions
 */

import api from '../lib/axios';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (data: any) => void) => void;
  removeListener: (event: string, callback?: (data: any) => void) => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  setName: (name: string) => void;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
}

interface SpotifyPlaybackState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string; uri: string }[];
  album: {
    name: string;
    uri: string;
    images: { url: string; height: number; width: number }[];
  };
}

// Service state
let player: SpotifyPlayer | null = null;
let deviceId: string | null = null;
let isReady = false;
let isConnected = false;
let currentVolume = 1;
let duckedVolume = 0.3;
let isDucked = false;

// Event listeners
type SpotifyEventListener = (data: any) => void;
const eventListeners: Map<string, Set<SpotifyEventListener>> = new Map();

/**
 * Load Spotify Web Playback SDK
 */
export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Spotify) {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    
    // Set up callback
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Spotify Web Playback SDK'));
    };
    
    document.body.appendChild(script);
  });
}

/**
 * Initialize Spotify player
 */
export async function initializePlayer(): Promise<boolean> {
  try {
    // Load SDK if not loaded
    await loadSpotifySDK();
    
    // Get access token from backend
    const tokenResponse = await api.get('/api/spotify/token');
    if (!tokenResponse.data.accessToken) {
      console.warn('No Spotify access token available');
      return false;
    }
    
    // Create player instance
    player = new window.Spotify.Player({
      name: 'Mind Garden',
      getOAuthToken: async (callback) => {
        try {
          const response = await api.get('/api/spotify/token');
          callback(response.data.accessToken);
        } catch (error) {
          console.error('Failed to refresh Spotify token', error);
        }
      },
      volume: currentVolume,
    });
    
    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify initialization error:', message);
      emitEvent('error', { type: 'initialization', message });
    });
    
    player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify authentication error:', message);
      emitEvent('error', { type: 'authentication', message });
    });
    
    player.addListener('account_error', ({ message }) => {
      console.error('Spotify account error:', message);
      emitEvent('error', { type: 'account', message });
    });
    
    player.addListener('playback_error', ({ message }) => {
      console.error('Spotify playback error:', message);
      emitEvent('error', { type: 'playback', message });
    });
    
    // Ready handler
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready, device ID:', device_id);
      deviceId = device_id;
      isReady = true;
      emitEvent('ready', { deviceId: device_id });
    });
    
    // Not ready handler
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify player not ready:', device_id);
      isReady = false;
      emitEvent('not_ready', { deviceId: device_id });
    });
    
    // Player state changed
    player.addListener('player_state_changed', (state) => {
      if (!state) return;
      emitEvent('state_changed', {
        paused: state.paused,
        position: state.position,
        duration: state.track_window?.current_track?.duration_ms || 0,
        track: state.track_window?.current_track ? {
          id: state.track_window.current_track.id,
          name: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists.map((a: { name: string }) => a.name).join(', '),
          album: state.track_window.current_track.album.name,
          albumArt: state.track_window.current_track.album.images[0]?.url,
        } : null,
        shuffle: state.shuffle,
        repeatMode: state.repeat_mode,
      });
    });
    
    // Connect player
    const success = await player.connect();
    isConnected = success;
    
    return success;
  } catch (error) {
    console.error('Failed to initialize Spotify player:', error);
    return false;
  }
}

/**
 * Disconnect player
 */
export function disconnectPlayer(): void {
  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
    isReady = false;
    isConnected = false;
  }
}

/**
 * Get connection status
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  spotifyId: string | null;
  displayName: string | null;
}> {
  try {
    const response = await api.get('/api/spotify/status');
    return response.data;
  } catch (error) {
    return { connected: false, spotifyId: null, displayName: null };
  }
}

/**
 * Start OAuth flow
 */
export async function connectSpotify(): Promise<string> {
  const response = await api.get('/api/spotify/auth');
  return response.data.authUrl;
}

/**
 * Disconnect Spotify account
 */
export async function disconnectSpotify(): Promise<void> {
  disconnectPlayer();
  await api.post('/api/spotify/disconnect');
}

/**
 * Play a track, playlist, or album
 */
export async function play(options?: {
  uri?: string;
  contextUri?: string;
  positionMs?: number;
}): Promise<void> {
  if (!isReady || !deviceId) {
    // Fall back to API if local player not ready
    await api.put('/api/spotify/player/play', {
      ...options,
      deviceId,
    });
    return;
  }
  
  if (options?.uri || options?.contextUri) {
    // Play specific content via API
    await api.put('/api/spotify/player/play', {
      ...options,
      deviceId,
    });
  } else {
    // Resume current playback
    await player?.resume();
  }
}

/**
 * Pause playback
 */
export async function pause(): Promise<void> {
  if (player && isReady) {
    await player.pause();
  } else {
    await api.put('/api/spotify/player/pause');
  }
}

/**
 * Toggle play/pause
 */
export async function togglePlay(): Promise<void> {
  if (player && isReady) {
    await player.togglePlay();
  } else {
    const state = await getPlaybackState();
    if (state?.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }
}

/**
 * Skip to next track
 */
export async function nextTrack(): Promise<void> {
  if (player && isReady) {
    await player.nextTrack();
  } else {
    await api.post('/api/spotify/player/next');
  }
}

/**
 * Skip to previous track
 */
export async function previousTrack(): Promise<void> {
  if (player && isReady) {
    await player.previousTrack();
  } else {
    await api.post('/api/spotify/player/previous');
  }
}

/**
 * Seek to position
 */
export async function seek(positionMs: number): Promise<void> {
  if (player && isReady) {
    await player.seek(positionMs);
  }
}

/**
 * Set volume (0-1)
 */
export async function setVolume(volume: number): Promise<void> {
  currentVolume = Math.max(0, Math.min(1, volume));
  
  if (player && isReady) {
    await player.setVolume(currentVolume);
  } else {
    await api.put('/api/spotify/player/volume', {
      volume: Math.round(currentVolume * 100),
    });
  }
}

/**
 * Duck volume for voice guidance
 */
export async function duckVolume(): Promise<void> {
  if (isDucked) return;
  
  isDucked = true;
  await setVolume(duckedVolume);
}

/**
 * Restore volume after voice guidance
 */
export async function restoreVolume(): Promise<void> {
  if (!isDucked) return;
  
  isDucked = false;
  await setVolume(currentVolume);
}

/**
 * Set ducked volume level
 */
export function setDuckedVolumeLevel(level: number): void {
  duckedVolume = Math.max(0, Math.min(1, level));
}

/**
 * Get current playback state
 */
export async function getPlaybackState(): Promise<{
  isPlaying: boolean;
  track: {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string;
    duration: number;
    progress: number;
  } | null;
  device: {
    id: string;
    name: string;
    type: string;
    volume: number;
  } | null;
} | null> {
  try {
    if (player && isReady) {
      const state = await player.getCurrentState();
      if (!state) return null;
      
      return {
        isPlaying: !state.paused,
        track: state.track_window?.current_track ? {
          id: state.track_window.current_track.id,
          name: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists.map(a => a.name).join(', '),
          album: state.track_window.current_track.album.name,
          albumArt: state.track_window.current_track.album.images[0]?.url,
          duration: state.track_window.current_track.duration_ms,
          progress: state.position,
        } : null,
        device: deviceId ? {
          id: deviceId,
          name: 'Mind Garden',
          type: 'Computer',
          volume: Math.round(currentVolume * 100),
        } : null,
      };
    }
    
    // Fall back to API
    const response = await api.get('/api/spotify/player');
    return response.data;
  } catch (error) {
    console.error('Failed to get playback state:', error);
    return null;
  }
}

/**
 * Get available devices
 */
export async function getDevices(): Promise<{
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volume: number;
}[]> {
  try {
    const response = await api.get('/api/spotify/devices');
    return response.data.devices || [];
  } catch (error) {
    console.error('Failed to get devices:', error);
    return [];
  }
}

/**
 * Transfer playback to a device
 */
export async function transferPlayback(targetDeviceId: string, startPlaying = false): Promise<void> {
  await api.put('/api/spotify/player/transfer', {
    deviceId: targetDeviceId,
    play: startPlaying,
  });
}

/**
 * Get playlists for a flow type
 */
export async function getFlowPlaylists(flowType: string): Promise<{
  id: string;
  name: string;
  description: string;
  image: string;
  uri: string;
  trackCount: number;
}[]> {
  try {
    const response = await api.get(`/api/spotify/playlists/flow/${flowType}`);
    return response.data.playlists || [];
  } catch (error) {
    console.error('Failed to get flow playlists:', error);
    return [];
  }
}

/**
 * Search for content
 */
export async function search(query: string, type: 'track' | 'playlist' | 'album' = 'playlist'): Promise<any> {
  try {
    const response = await api.get('/api/spotify/search', {
      params: { q: query, type },
    });
    return response.data;
  } catch (error) {
    console.error('Search failed:', error);
    return {};
  }
}

/**
 * Get personalized recommendations
 */
export async function getRecommendations(mood: string = 'calm'): Promise<{
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  uri: string;
  preview: string | null;
}[]> {
  try {
    const response = await api.get('/api/spotify/recommendations', {
      params: { mood },
    });
    return response.data.tracks || [];
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return [];
  }
}

/**
 * Play a flow-specific playlist
 */
export async function playFlowMusic(flowType: string): Promise<boolean> {
  try {
    const playlists = await getFlowPlaylists(flowType);
    
    if (playlists.length > 0) {
      // Play the first recommended playlist
      await play({ contextUri: playlists[0].uri });
      return true;
    }
    
    // Fall back to recommendations
    const recommendations = await getRecommendations(getFlowMood(flowType));
    if (recommendations.length > 0) {
      await play({ uri: recommendations[0].uri });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to play flow music:', error);
    return false;
  }
}

/**
 * Map flow type to mood for recommendations
 */
function getFlowMood(flowType: string): string {
  const moodMap: Record<string, string> = {
    'pre-meeting-focus': 'focus',
    'pre-presentation-power': 'energize',
    'difficult-conversation-prep': 'calm',
    'quick-reset': 'calm',
    'post-meeting-decompress': 'calm',
    'end-of-day-transition': 'calm',
    'morning-intention': 'energize',
    'evening-wind-down': 'sleep',
    'weekend-wellness': 'meditation',
    'deep-meditation': 'meditation',
    'breathing': 'calm',
  };
  
  return moodMap[flowType] || 'calm';
}

// Event system
function emitEvent(event: string, data: any): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(listener => listener(data));
  }
}

export function addEventListener(event: string, listener: SpotifyEventListener): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(listener);
}

export function removeEventListener(event: string, listener: SpotifyEventListener): void {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.delete(listener);
  }
}

// Check if player is ready
export function isPlayerReady(): boolean {
  return isReady && isConnected;
}

// Get device ID
export function getDeviceId(): string | null {
  return deviceId;
}

// Export as default object for convenience
export default {
  loadSpotifySDK,
  initializePlayer,
  disconnectPlayer,
  getConnectionStatus,
  connectSpotify,
  disconnectSpotify,
  play,
  pause,
  togglePlay,
  nextTrack,
  previousTrack,
  seek,
  setVolume,
  duckVolume,
  restoreVolume,
  setDuckedVolumeLevel,
  getPlaybackState,
  getDevices,
  transferPlayback,
  getFlowPlaylists,
  search,
  getRecommendations,
  playFlowMusic,
  addEventListener,
  removeEventListener,
  isPlayerReady,
  getDeviceId,
};

