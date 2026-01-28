// Content script for auto-extracting job descriptions from job pages

// Common job site selectors for JD extraction
const JD_SELECTORS = [
    // LinkedIn
    '[data-testid="job-description"]',
    '.jobs-description__content',
    '.jobs-description-content',

    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',

    // Glassdoor
    '.jobDescriptionContent',
    '[data-test="jobDescription"]',

    // Generic
    '.job-description',
    '.description__text',
    '#job-description',
    '[class*="JobDescription"]',
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    'article.job',
    'section.job-details',
];

// Company name selectors
const COMPANY_SELECTORS = [
    '[data-testid="employer-name"]',
    '.jobs-unified-top-card__company-name',
    '.jobsearch-InlineCompanyRating-companyHeader',
    '[data-test="employerName"]',
    '.company-name',
    '[class*="companyName"]',
];

// Job title selectors
const TITLE_SELECTORS = [
    '[data-testid="job-title"]',
    '.jobs-unified-top-card__job-title',
    '.jobsearch-JobInfoHeader-title',
    '[data-test="jobTitle"]',
    '.job-title',
    'h1[class*="title"]',
];

interface ExtractedJobData {
    title?: string;
    company?: string;
    description: string;
    url: string;
}

// Extract text using multiple selectors
function extractWithSelectors(selectors: string[]): string | null {
    for (const selector of selectors) {
        try {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                if (text.length > 10) return text;
            }
        } catch (e) {
            // Selector might be invalid
        }
    }
    return null;
}

// Extract job description from page
function extractJobDescriptionText(): string {
    const jd = extractWithSelectors(JD_SELECTORS);
    if (jd && jd.length > 100) return jd;

    // Fallback: try to find main content
    const main = document.querySelector('main');
    if (main) {
        // Remove navigation and footer
        const clone = main.cloneNode(true) as Element;
        clone.querySelectorAll('nav, header, footer, script, style').forEach(el => el.remove());
        const text = clone.textContent?.trim();
        if (text && text.length > 200) return text.substring(0, 5000);
    }

    // Last resort: body content
    return document.body.textContent?.trim().substring(0, 5000) || '';
}

// Check if current page is a job listing
function isJobPage(): boolean {
    const url = window.location.href.toLowerCase();
    const jobPatterns = [
        '/jobs/', '/job/', '/career', '/position', '/vacancy',
        'linkedin.com/jobs', 'indeed.com', 'glassdoor.com',
        'monster.com', 'ziprecruiter.com', 'dice.com',
    ];

    return jobPatterns.some(pattern => url.includes(pattern));
}

// Extract all job data
function extractJobData(): ExtractedJobData {
    return {
        title: extractWithSelectors(TITLE_SELECTORS) || undefined,
        company: extractWithSelectors(COMPANY_SELECTORS) || undefined,
        description: extractJobDescriptionText(),
        url: window.location.href,
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_JD') {
        const jobData = extractJobData();
        sendResponse({ success: true, data: jobData });
        return true;
    }

    if (message.type === 'CHECK_JOB_PAGE') {
        sendResponse({ isJobPage: isJobPage() });
        return true;
    }
});

// Auto-detect job page and notify extension
if (isJobPage()) {
    chrome.runtime.sendMessage({
        type: 'JOB_PAGE_DETECTED',
        url: window.location.href,
    }).catch((error) => {
        // Extension context might be invalidated, ignore error
        console.debug('Failed to send message to background:', error);
    });
}

console.log('Arigatoo content script loaded');
