// Mindlayer Content Script
// Tracks engagement and displays reaction prompts

const CONFIG = {
  MIN_DWELL_TIME_MS: 30000,
  MIN_SCROLL_DEPTH: 0.6,
  MIN_COMPLETION: 0.7,
  SCROLL_TRACK_INTERVAL_MS: 1000,
  MIN_WORD_COUNT: 300,
  PROMPT_AUTO_DISMISS_MS: 30000,
};

class EngagementTracker {
  constructor() {
    this.startTime = Date.now();
    this.maxScrollDepth = 0;
    this.isActive = true;
    this.wordCount = this.estimateWordCount();
    this.readingProgress = 0;
    
    this.setupTracking();
  }
  
  estimateWordCount() {
    const article = this.findArticleContent();
    if (!article) return 0;
    
    const text = article.innerText || article.textContent || '';
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  findArticleContent() {
    const selectors = [
      'article',
      '[role="article"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.post-body',
      'main',
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return document.body;
  }
  
  setupTracking() {
    // Track scroll depth
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => this.updateScrollDepth(), 100);
    }, { passive: true });
    
    // Track visibility
    document.addEventListener('visibilitychange', () => {
      this.isActive = !document.hidden;
    });
    
    // Periodic updates to background
    setInterval(() => this.sendUpdate(), CONFIG.SCROLL_TRACK_INTERVAL_MS);
  }
  
  updateScrollDepth() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight > 0) {
      const currentDepth = window.scrollY / scrollHeight;
      this.maxScrollDepth = Math.max(this.maxScrollDepth, Math.min(1, currentDepth));
    }
    
    // Estimate reading progress based on visible content
    this.updateReadingProgress();
  }
  
  updateReadingProgress() {
    const article = this.findArticleContent();
    if (!article) return;
    
    const rect = article.getBoundingClientRect();
    const articleTop = window.scrollY + rect.top;
    const articleBottom = articleTop + rect.height;
    const viewportBottom = window.scrollY + window.innerHeight;
    
    if (viewportBottom >= articleBottom) {
      this.readingProgress = 1;
    } else if (viewportBottom > articleTop) {
      this.readingProgress = (viewportBottom - articleTop) / rect.height;
    }
  }
  
  getDwellTime() {
    return this.isActive ? Date.now() - this.startTime : 0;
  }
  
  sendUpdate() {
    if (!this.isActive) return;
    if (this.wordCount < CONFIG.MIN_WORD_COUNT) return;
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_ENGAGEMENT',
      scrollDepth: this.maxScrollDepth,
      completionPercent: this.readingProgress,
      dwellTimeMs: this.getDwellTime(),
    });
  }
}

class ReactionPrompt {
  constructor() {
    this.container = null;
    this.autoDismissTimer = null;
  }
  
  show(data) {
    if (this.container) this.hide();
    
    this.container = document.createElement('div');
    this.container.id = 'mindlayer-reaction-prompt';
    this.container.innerHTML = this.getHTML(data);
    document.body.appendChild(this.container);
    
    this.setupEventListeners(data);
    this.startAutoDismiss();
    
    // Animate in
    requestAnimationFrame(() => {
      this.container.classList.add('mindlayer-visible');
    });
  }
  
  getHTML(data) {
    return `
      <div class="mindlayer-card">
        <div class="mindlayer-header">
          <span class="mindlayer-outlet">${data.outlet.toUpperCase()} · JUST FINISHED</span>
          <button class="mindlayer-close" aria-label="Dismiss">×</button>
        </div>
        <p class="mindlayer-claim">"${data.claimText}"</p>
        <div class="mindlayer-actions">
          <button class="mindlayer-btn mindlayer-btn-primary" data-stance="agree">Agree</button>
          <button class="mindlayer-btn mindlayer-btn-primary" data-stance="disagree">Disagree</button>
          <button class="mindlayer-btn mindlayer-btn-primary" data-stance="complicated">Complicated</button>
          <button class="mindlayer-btn mindlayer-btn-secondary" data-stance="skip">Skip</button>
        </div>
        <p class="mindlayer-footer">Auto-dismisses in 30s · <button class="mindlayer-dismiss-link">Dismiss</button></p>
      </div>
    `;
  }
  
  setupEventListeners(data) {
    // Stance buttons
    this.container.querySelectorAll('[data-stance]').forEach(btn => {
      btn.addEventListener('click', () => {
        const stance = btn.dataset.stance;
        this.submitReaction(data.claimId, stance);
      });
    });
    
    // Close button
    this.container.querySelector('.mindlayer-close').addEventListener('click', () => {
      this.skip();
    });
    
    // Dismiss link
    this.container.querySelector('.mindlayer-dismiss-link').addEventListener('click', () => {
      this.skip();
    });
  }
  
  startAutoDismiss() {
    this.autoDismissTimer = setTimeout(() => {
      this.skip();
    }, CONFIG.PROMPT_AUTO_DISMISS_MS);
  }
  
  submitReaction(claimId, stance) {
    clearTimeout(this.autoDismissTimer);
    
    // Show loading state
    this.container.querySelector('.mindlayer-actions').innerHTML = 
      '<div class="mindlayer-loading">Saving...</div>';
    
    chrome.runtime.sendMessage({
      type: 'SUBMIT_REACTION',
      data: { claimId, stance },
    }, (response) => {
      if (response?.success) {
        this.showSuccess(stance);
      } else {
        this.showError();
      }
    });
  }
  
  skip() {
    clearTimeout(this.autoDismissTimer);
    chrome.runtime.sendMessage({ type: 'SKIP_REACTION' });
    this.hide();
  }
  
  showSuccess(stance) {
    const stanceLabels = {
      agree: 'Agreed',
      disagree: 'Disagreed',
      complicated: 'Marked as complicated',
      skip: 'Skipped',
    };
    
    this.container.querySelector('.mindlayer-card').innerHTML = `
      <div class="mindlayer-success">
        <span class="mindlayer-checkmark">✓</span>
        <span>${stanceLabels[stance]} · Added to your map</span>
      </div>
    `;
    
    setTimeout(() => this.hide(), 1500);
  }
  
  showError() {
    this.container.querySelector('.mindlayer-actions').innerHTML = 
      '<div class="mindlayer-error">Failed to save. Try again later.</div>';
    
    setTimeout(() => this.hide(), 2000);
  }
  
  hide() {
    if (!this.container) return;
    
    this.container.classList.remove('mindlayer-visible');
    setTimeout(() => {
      this.container?.remove();
      this.container = null;
    }, 300);
  }
}

// Initialize
const tracker = new EngagementTracker();
const prompt = new ReactionPrompt();

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_REACTION_PROMPT') {
    prompt.show(message.data);
  }
});
