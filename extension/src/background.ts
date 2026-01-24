// Background service worker for Arigatoo Chrome Extension

// Listen for extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Arigatoo extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_PAGE_DETECTED') {
    // Could show badge or notification
    chrome.action.setBadgeText({ text: 'JD', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
  }
});

// Listen for tab updates to detect job pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isJobPage = checkIfJobPage(tab.url);

    if (isJobPage) {
      chrome.action.setBadgeText({ text: 'JD', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// Check if URL is a job listing page
function checkIfJobPage(url: string): boolean {
  const jobPatterns = [
    /linkedin\.com\/jobs\/view/i,
    /indeed\.com\/viewjob/i,
    /glassdoor\.com\/job-listing/i,
    /monster\.com\/job-openings/i,
    /ziprecruiter\.com\/jobs/i,
    /dice\.com\/jobs/i,
    /careers\./i,
    /\/jobs?\//i,
    /\/careers?\//i,
    /\/position/i,
    /\/vacancy/i,
  ];

  return jobPatterns.some(pattern => pattern.test(url));
}

// Handle connection from web app for login
chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'LOGIN_SUCCESS') {
    // Store auth state
    await chrome.storage.local.set({
      isLoggedIn: true,
      userId: message.userId,
      userEmail: message.email,
      idToken: message.idToken,
      resume: message.resume,
    });

    // Notify popup if open
    chrome.runtime.sendMessage(message);

    sendResponse({ success: true });
  }
});
