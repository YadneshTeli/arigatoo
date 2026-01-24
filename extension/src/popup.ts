// Popup script for Arigatoo Chrome Extension
const API_URL = 'http://localhost:3001/api';
const WEB_URL = 'http://localhost:3000';

interface ExtensionState {
  isLoggedIn: boolean;
  userId?: string;
  userEmail?: string;
  idToken?: string;
  geminiApiKey?: string;
  resume?: any;
}

// State
let state: ExtensionState = {
  isLoggedIn: false,
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  setupEventListeners();
  updateUI();
});

// Load state from storage
async function loadState() {
  const stored = await chrome.storage.local.get(['isLoggedIn', 'userId', 'userEmail', 'idToken', 'geminiApiKey', 'resume']);
  state = {
    isLoggedIn: stored.isLoggedIn || false,
    userId: stored.userId,
    userEmail: stored.userEmail,
    idToken: stored.idToken,
    geminiApiKey: stored.geminiApiKey,
    resume: stored.resume,
  };
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set(state);
}

// Get element safely
function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// Show specific view
function showView(viewName: string) {
  ['loading', 'login-view', 'main-view', 'results-view'].forEach(id => {
    const el = $(id);
    if (el) el.classList.add('hidden');
  });
  const view = $(viewName);
  if (view) view.classList.remove('hidden');
}

// Setup event listeners
function setupEventListeners() {
  // Login
  $('login-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${WEB_URL}/extension/auth?extId=${chrome.runtime.id}` });
  });

  // Logout
  $('logout-btn')?.addEventListener('click', async () => {
    state = { isLoggedIn: false };
    await saveState();
    updateUI();
  });

  // Save API Key
  $('save-key-btn')?.addEventListener('click', async () => {
    const input = $('api-key-input') as HTMLInputElement;
    const key = input?.value?.trim();
    if (key) {
      state.geminiApiKey = key;
      await saveState();
      input.value = '';
      showView('main-view');
      updateUI();
    }
  });

  // Upload Resume
  $('upload-resume-btn')?.addEventListener('click', () => {
    ($('resume-input') as HTMLInputElement)?.click();
  });

  $('resume-input')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await uploadResume(file);
  });

  // Extract JD from page
  $('extract-jd-btn')?.addEventListener('click', extractJobDescription);

  // Analyze
  $('analyze-btn')?.addEventListener('click', analyze);

  // Back button
  $('back-btn')?.addEventListener('click', () => {
    showView('main-view');
  });

  // Enable analyze button when JD has content
  $('jd-input')?.addEventListener('input', () => {
    const btn = $('analyze-btn') as HTMLButtonElement;
    const input = $('jd-input') as HTMLTextAreaElement;
    if (btn) btn.disabled = !input?.value?.trim();
  });
}

// Update UI based on state
function updateUI() {
  if (state.isLoggedIn || state.geminiApiKey) {
    showView('main-view');

    const emailEl = $('user-email');
    if (emailEl) {
      emailEl.textContent = state.userEmail || (state.geminiApiKey ? 'Guest Mode' : '');
    }

    // Resume status
    const statusEl = $('resume-status');
    const infoEl = $('resume-info');
    const nameEl = $('resume-name');
    const skillsEl = $('resume-skills');

    if (state.resume) {
      if (statusEl) {
        statusEl.textContent = 'Uploaded';
        statusEl.classList.add('success');
      }
      if (infoEl) infoEl.classList.remove('hidden');
      if (nameEl) nameEl.textContent = state.resume.fileName || 'Resume';
      if (skillsEl) skillsEl.textContent = `${state.resume.parsedContent?.skills?.length || 0} skills detected`;
    } else {
      if (statusEl) {
        statusEl.textContent = 'Not uploaded';
        statusEl.classList.remove('success');
      }
      if (infoEl) infoEl.classList.add('hidden');
    }

    // Enable analyze if we have JD
    const analyzeBtn = $('analyze-btn') as HTMLButtonElement;
    const jdInput = $('jd-input') as HTMLTextAreaElement;
    if (analyzeBtn) analyzeBtn.disabled = !jdInput?.value?.trim();
  } else {
    showView('login-view');
  }
}

// Upload resume
async function uploadResume(file: File) {
  if (!state.idToken && !state.geminiApiKey) return;

  const btn = $('upload-resume-btn');
  if (btn) btn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('file', file);

  try {
    if (state.idToken) {
      const response = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.idToken}` },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        state.resume = result.data.resume;
        await saveState();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } else {
      const response = await fetch(`${API_URL}/parse/resume`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Parse failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        state.resume = { fileName: file.name, parsedContent: result.data.parsedResume };
        await saveState();
      } else {
        throw new Error(result.error || 'Parse failed');
      }
    }
  } catch (error) {
    console.error('Upload failed:', error);
    // Show error to user
    const statusEl = $('resume-status');
    if (statusEl) {
      statusEl.textContent = error instanceof Error ? error.message : 'Upload failed';
      statusEl.classList.remove('success');
      statusEl.classList.add('error');
    }
  } finally {
    if (btn) btn.textContent = 'Upload Resume';
    updateUI();
  }
}

// Extract JD from current page
async function extractJobDescription() {
  const btn = $('extract-jd-btn');
  if (btn) btn.textContent = 'Extracting...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selectors = [
          '[data-testid="job-description"]', '.job-description', '.description__text',
          '#job-description', '.jobsearch-jobDescriptionText', '[class*="JobDescription"]',
          '[class*="job-description"]', 'article', 'main',
        ];
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent && el.textContent.trim().length > 200) {
            return el.textContent.trim();
          }
        }
        const main = document.querySelector('main') || document.body;
        return main.textContent?.trim().substring(0, 5000) || '';
      },
    });

    if (result[0]?.result) {
      const jdInput = $('jd-input') as HTMLTextAreaElement;
      if (jdInput) jdInput.value = result[0].result;
      const analyzeBtn = $('analyze-btn') as HTMLButtonElement;
      if (analyzeBtn) analyzeBtn.disabled = false;
    } else {
      throw new Error('Could not extract job description from page');
    }
  } catch (error) {
    console.error('Failed to extract JD:', error);
    // Show error message to user
    alert(error instanceof Error ? error.message : 'Failed to extract job description');
  } finally {
    if (btn) btn.textContent = 'Extract from page';
  }
}

// Analyze
async function analyze() {
  const jdInput = $('jd-input') as HTMLTextAreaElement;
  if (!state.resume?.parsedContent || !jdInput?.value?.trim()) return;

  const analyzeBtn = $('analyze-btn') as HTMLButtonElement;
  if (analyzeBtn) {
    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;
  }

  try {
    const response = await fetch(`${API_URL}/analyze/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.idToken && { 'Authorization': `Bearer ${state.idToken}` }),
      },
      body: JSON.stringify({
        resumeText: state.resume.parsedContent.rawText,
        jobText: jdInput.value,
        geminiApiKey: state.geminiApiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data?.analysis) {
      displayResults(result.data.analysis);
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    alert(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
  } finally {
    if (analyzeBtn) {
      analyzeBtn.textContent = 'Analyze Match';
      analyzeBtn.disabled = false;
    }
  }
}
    analyzeBtn.disabled = false;
  }
}

// Display results
function displayResults(analysis: any) {
  showView('results-view');

  const score = analysis.score?.overall || 0;

  const scoreValue = $('score-value');
  if (scoreValue) scoreValue.textContent = score.toString();

  const scoreCircle = $('score-circle');
  if (scoreCircle) {
    const offset = 251 - (251 * score) / 100;
    (scoreCircle as HTMLElement).style.strokeDashoffset = offset.toString();
  }

  const skillsScore = $('skills-score');
  if (skillsScore) skillsScore.textContent = `${analysis.score?.skills || 0}%`;

  const experienceScore = $('experience-score');
  if (experienceScore) experienceScore.textContent = `${analysis.score?.experience || 0}%`;

  const keywordsScore = $('keywords-score');
  if (keywordsScore) keywordsScore.textContent = `${analysis.score?.keywords || 0}%`;

  const suggestionsList = $('suggestions-list');
  if (suggestionsList) {
    suggestionsList.innerHTML = '';
    if (analysis.suggestions?.length) {
      analysis.suggestions.forEach((suggestion: any) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        // Create elements safely without innerHTML to prevent XSS
        const header = document.createElement('div');
        header.className = 'suggestion-header';
        
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `priority-badge ${suggestion.priority || 'medium'}`;
        priorityBadge.textContent = suggestion.priority || 'medium';
        
        const title = document.createElement('span');
        title.className = 'suggestion-title';
        title.textContent = suggestion.title || 'Suggestion';
        
        const desc = document.createElement('p');
        desc.className = 'suggestion-desc';
        desc.textContent = suggestion.description || '';
        
        header.appendChild(priorityBadge);
        header.appendChild(title);
        item.appendChild(header);
        item.appendChild(desc);
        
        suggestionsList.appendChild(item);
      });
    }
  }
}

// Listen for messages from web app (for login)
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'LOGIN_SUCCESS') {
    state.isLoggedIn = true;
    state.userId = message.userId;
    state.userEmail = message.email;
    state.idToken = message.idToken;
    state.resume = message.resume;
    await saveState();
    updateUI();
  }
});
