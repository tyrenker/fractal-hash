/**
 * Background service worker for Fractal-Hash browser extension.
 *
 * Stores per-tab hostname so the popup can display a stable fractal
 * for the current page's origin without needing activeTab on every open.
 */

const tabHostnames = new Map();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        tabHostnames.set(tabId, url.hostname);
      } else {
        tabHostnames.delete(tabId);
      }
    } catch {
      tabHostnames.delete(tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabHostnames.delete(tabId);
});

// Respond to messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_HOSTNAME') {
    const tabId = message.tabId;
    sendResponse({ hostname: tabHostnames.get(tabId) ?? null });
  }
  return true; // Keep the message channel open for async response
});
