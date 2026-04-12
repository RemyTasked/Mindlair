// Mindlayer Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Get pending count
  chrome.runtime.sendMessage({ type: 'GET_PENDING_COUNT' }, (response) => {
    if (response?.count !== undefined) {
      document.getElementById('pending-count').textContent = response.count;
    }
  });
  
  // Get week count from storage (placeholder)
  const storage = await chrome.storage.local.get('mindlayer_week_reactions');
  const weekCount = storage.mindlayer_week_reactions || 0;
  document.getElementById('week-count').textContent = weekCount;
});
