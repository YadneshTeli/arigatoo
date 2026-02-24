// Content script for auto-extracting job descriptions from job pages

interface SiteConfig {
    name: string;
    urlPatterns: string[];
    selectors: string[];
    textMarkers: string[]; // Text that indicates start of JD section
    endMarkers?: string[]; // Optional: Text that indicates end of JD section
}

// Site-specific configurations
const SITE_CONFIGS: SiteConfig[] = [
    {
        name: 'LinkedIn',
        urlPatterns: ['linkedin.com/jobs'],
        selectors: [
            '.jobs-description__content',
            '.jobs-description-content__text',
            '[data-testid="job-description"]',
            '.jobs-box__html-content',
        ],
        textMarkers: ['About the job', 'About this job'],
        endMarkers: ['Show more', 'About the company'],
    },
    {
        name: 'Internshala',
        urlPatterns: ['internshala.com'],
        selectors: [
            '.internship_details',
            '.detail_view',
            '.individual_internship_details',
            '#about_company_and_activity',
        ],
        textMarkers: ['About the work from home job/internship', 'About the internship', 'About the job'],
        endMarkers: ['Who can apply', 'Skill(s) required', 'Number of openings'],
    },
    {
        name: 'Indeed',
        urlPatterns: ['indeed.com'],
        selectors: [
            '#jobDescriptionText',
            '.jobsearch-jobDescriptionText',
            '.jobsearch-JobComponent-description',
        ],
        textMarkers: ['Full job description', 'Job Description'],
        endMarkers: ['Report job', 'Hiring Insights'],
    },
    {
        name: 'Glassdoor',
        urlPatterns: ['glassdoor.com'],
        selectors: [
            '.jobDescriptionContent',
            '[data-test="jobDescription"]',
        ],
        textMarkers: ['Job Description'],
    },
    {
        name: 'Naukri',
        urlPatterns: ['naukri.com'],
        selectors: [
            '.job-desc',
            '.dang-inner-html',
            '.jd-container',
        ],
        textMarkers: ['Job Description', 'About the job'],
    },
];

// Company name selectors
const COMPANY_SELECTORS = [
    '[data-testid="employer-name"]',
    '.jobs-unified-top-card__company-name',
    '.jobsearch-InlineCompanyRating-companyHeader',
    '[data-test="employerName"]',
    '.company-name',
    '[class*="companyName"]',
    '.company_and_location a', // Internshala
];

// Job title selectors
const TITLE_SELECTORS = [
    '[data-testid="job-title"]',
    '.jobs-unified-top-card__job-title',
    '.jobsearch-JobInfoHeader-title',
    '[data-test="jobTitle"]',
    '.job-title',
    'h1[class*="title"]',
    '.heading_4_5', // Internshala
];

interface ExtractedJobData {
    title?: string;
    company?: string;
    description: string;
    url: string;
    source?: string;
}

// Detect which site we're on
function detectSite(): SiteConfig | null {
    const url = window.location.href.toLowerCase();
    for (const config of SITE_CONFIGS) {
        if (config.urlPatterns.some(pattern => url.includes(pattern))) {
            return config;
        }
    }
    return null;
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

// Clean up text - remove excessive whitespace
function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Extract text between markers
function extractBetweenMarkers(
    fullText: string, 
    startMarkers: string[], 
    endMarkers?: string[]
): string | null {
    const lowerText = fullText.toLowerCase();
    
    // Find start position
    let startPos = -1;
    let usedStartMarker = '';
    for (const marker of startMarkers) {
        const pos = lowerText.indexOf(marker.toLowerCase());
        if (pos !== -1 && (startPos === -1 || pos < startPos)) {
            startPos = pos;
            usedStartMarker = marker;
        }
    }
    
    if (startPos === -1) return null;
    
    // Move past the marker text
    startPos += usedStartMarker.length;
    
    // Find end position
    let endPos = fullText.length;
    if (endMarkers && endMarkers.length > 0) {
        for (const marker of endMarkers) {
            const pos = lowerText.indexOf(marker.toLowerCase(), startPos + 50); // Skip at least 50 chars
            if (pos !== -1 && pos < endPos) {
                endPos = pos;
            }
        }
    }
    
    // Extract and clean
    const extracted = fullText.substring(startPos, endPos);
    return cleanText(extracted);
}

// Site-specific extraction
function extractJobDescriptionForSite(config: SiteConfig): string | null {
    // First try CSS selectors
    for (const selector of config.selectors) {
        try {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = el.textContent.trim();
                
                // If we have text markers, use them to refine
                if (config.textMarkers.length > 0) {
                    const refined = extractBetweenMarkers(text, config.textMarkers, config.endMarkers);
                    if (refined && refined.length > 100) {
                        return refined;
                    }
                }
                
                // If no markers or markers didn't work, use selector content
                if (text.length > 100) {
                    return cleanText(text.substring(0, 8000)); // Limit to 8000 chars
                }
            }
        } catch (e) {
            // Continue to next selector
        }
    }
    
    // Fallback: Try markers on main content
    const mainContent = document.querySelector('main')?.textContent 
        || document.querySelector('article')?.textContent
        || document.body.textContent;
    
    if (mainContent && config.textMarkers.length > 0) {
        const refined = extractBetweenMarkers(mainContent, config.textMarkers, config.endMarkers);
        if (refined && refined.length > 100) {
            return refined;
        }
    }
    
    return null;
}

// Generic fallback extraction (improved)
function extractGenericJobDescription(): string {
    // Common job description selectors
    const genericSelectors = [
        '.job-description',
        '.description__text',
        '#job-description',
        '[class*="JobDescription"]',
        '[class*="job-description"]',
        '[class*="jobDescription"]',
        'article.job',
        'section.job-details',
    ];
    
    for (const selector of genericSelectors) {
        try {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const text = cleanText(el.textContent);
                if (text.length > 100) {
                    return text.substring(0, 8000);
                }
            }
        } catch (e) {
            // Continue
        }
    }
    
    // Last resort: Extract main content but limit it
    const main = document.querySelector('main');
    if (main) {
        const clone = main.cloneNode(true) as Element;
        clone.querySelectorAll('nav, header, footer, script, style, aside, [role="navigation"]').forEach(el => el.remove());
        const text = cleanText(clone.textContent || '');
        if (text.length > 200) {
            return text.substring(0, 5000);
        }
    }
    
    return cleanText(document.body.textContent || '').substring(0, 3000);
}

// Main extraction function
function extractJobDescriptionText(): { description: string; source: string } {
    const siteConfig = detectSite();
    
    if (siteConfig) {
        const siteSpecificJD = extractJobDescriptionForSite(siteConfig);
        if (siteSpecificJD) {
            return { 
                description: siteSpecificJD, 
                source: siteConfig.name 
            };
        }
    }
    
    // Fallback to generic extraction
    return { 
        description: extractGenericJobDescription(), 
        source: 'Generic' 
    };
}

// Check if current page is a job listing
function isJobPage(): boolean {
    const url = window.location.href.toLowerCase();
    const jobPatterns = [
        '/jobs/', '/job/', '/career', '/position', '/vacancy',
        'linkedin.com/jobs', 'indeed.com', 'glassdoor.com',
        'monster.com', 'ziprecruiter.com', 'dice.com',
        'internshala.com', 'naukri.com',
    ];

    return jobPatterns.some(pattern => url.includes(pattern));
}

// Extract all job data
function extractJobData(): ExtractedJobData {
    const { description, source } = extractJobDescriptionText();
    
    return {
        title: extractWithSelectors(TITLE_SELECTORS) || undefined,
        company: extractWithSelectors(COMPANY_SELECTORS) || undefined,
        description,
        url: window.location.href,
        source,
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_JD') {
        const jobData = extractJobData();
        console.log(`[Arigatoo] Extracted JD from ${jobData.source}:`, jobData.description.substring(0, 200) + '...');
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

console.log('[Arigatoo] Content script loaded - Site-specific JD extraction enabled');
