/**
 * Mindlair content script — tracks scroll depth on every page.
 * Sends engagement data back to the background service worker.
 */

(function () {
  let maxScrollDepth = 0;
  let lastReportedDepth = 0;
  let reportTimer = null;

  function getScrollDepth() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight,
    );
    const viewportHeight = window.innerHeight;

    if (docHeight <= viewportHeight) return 1.0;
    return Math.min(1.0, (scrollTop + viewportHeight) / docHeight);
  }

  function reportEngagement() {
    if (maxScrollDepth <= lastReportedDepth) return;
    lastReportedDepth = maxScrollDepth;

    try {
      chrome.runtime.sendMessage({
        type: "engagement_update",
        scrollDepth: maxScrollDepth,
      });
    } catch {
      // Extension context invalidated — page outlived the extension
    }
  }

  function onScroll() {
    const depth = getScrollDepth();
    if (depth > maxScrollDepth) {
      maxScrollDepth = depth;
    }

    clearTimeout(reportTimer);
    reportTimer = setTimeout(reportEngagement, 500);
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // Initial measurement (for pages that don't scroll)
  setTimeout(() => {
    maxScrollDepth = getScrollDepth();
    reportEngagement();
  }, 2000);
})();
