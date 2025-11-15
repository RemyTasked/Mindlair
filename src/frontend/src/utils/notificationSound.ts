/**
 * Notification Sound Utility
 * 
 * Plays a subtle chime sound when cues or notifications appear.
 * Uses Web Audio API to generate a pleasant notification tone.
 */

let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (lazy initialization)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a notification chime sound
 * Creates a pleasant two-tone bell sound
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create oscillator for the chime
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Two-tone chime: E6 (1318.51 Hz) -> C6 (1046.50 Hz)
    oscillator.frequency.setValueAtTime(1318.51, now);
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1);
    
    // Envelope: quick attack, gentle decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // Decay
    
    // Play the sound
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    
    console.log('🔔 Notification sound played');
  } catch (error) {
    console.warn('⚠️ Could not play notification sound:', error);
  }
}

/**
 * Play a subtle notification sound (lower volume, single tone)
 * For less intrusive notifications
 */
export function playSubtleNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create oscillator for subtle chime
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Single tone: A5 (880 Hz)
    oscillator.frequency.setValueAtTime(880, now);
    
    // Quieter envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Quieter attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // Shorter decay
    
    // Play the sound
    oscillator.start(now);
    oscillator.stop(now + 0.3);
    
    console.log('🔔 Subtle notification sound played');
  } catch (error) {
    console.warn('⚠️ Could not play subtle notification sound:', error);
  }
}

