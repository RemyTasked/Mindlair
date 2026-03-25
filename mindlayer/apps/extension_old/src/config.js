// Mindlayer Extension Configuration

export const CONFIG = {
  // API endpoint (change for production)
  API_BASE_URL: 'http://localhost:3000/api',
  
  // Engagement thresholds
  MIN_DWELL_TIME_MS: 30000, // 30 seconds minimum
  MIN_SCROLL_DEPTH: 0.6,    // 60% scroll depth
  MIN_COMPLETION: 0.7,      // 70% completion
  
  // Prompt timing
  PROMPT_AUTO_DISMISS_MS: 30000, // 30 seconds
  PROMPT_DELAY_AFTER_COMPLETION_MS: 1000, // 1 second delay
  
  // Tracking intervals
  SCROLL_TRACK_INTERVAL_MS: 1000, // Track scroll every second
  DWELL_TIME_SAVE_INTERVAL_MS: 5000, // Save dwell time every 5 seconds
  
  // Content detection
  MIN_WORD_COUNT: 300, // Minimum words to consider as article
  ARTICLE_SELECTORS: [
    'article',
    '[role="article"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.post-body',
    'main',
  ],
  
  // Sites to skip
  SKIP_DOMAINS: [
    'google.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'youtube.com/watch', // We handle YouTube separately
    'mail.google.com',
    'docs.google.com',
    'drive.google.com',
  ],
  
  // Storage keys
  STORAGE_KEYS: {
    USER_ID: 'mindlayer_user_id',
    PENDING_ITEMS: 'mindlayer_pending_items',
    SETTINGS: 'mindlayer_settings',
    ENGAGEMENT_DATA: 'mindlayer_engagement',
  },
};

export const STANCE_OPTIONS = ['agree', 'disagree', 'complicated', 'skip'];
