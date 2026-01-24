// API configuration and helpers
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
    token?: string;
    body?: any;
    headers?: Record<string, string>;
}

export async function apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    options: ApiOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const { token, body, headers = {} } = options;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...headers,
            },
            ...(body && { body: JSON.stringify(body) }),
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function uploadFile(
    endpoint: string,
    file: File,
    token: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Specific API calls
export const api = {
    // Auth
    verifyToken: (token: string) =>
        apiRequest('/auth/verify', 'POST', { token }),

    getMe: (token: string) =>
        apiRequest('/auth/me', 'GET', { token }),

    // Resume
    getResume: (token: string) =>
        apiRequest('/resume', 'GET', { token }),

    uploadResume: (file: File, token: string) =>
        uploadFile('/resume/upload', file, token),

    deleteResume: (token: string) =>
        apiRequest('/resume', 'DELETE', { token }),

    // Parse
    parseJob: (url?: string, text?: string) =>
        apiRequest('/parse/job', 'POST', { body: { url, text } }),

    // Analyze
    analyze: (resume: any, jobDescription: any, token?: string) =>
        apiRequest('/analyze', 'POST', { token, body: { resume, jobDescription } }),

    quickAnalyze: (resumeText: string, jobText?: string, jobUrl?: string) =>
        apiRequest('/analyze/quick', 'POST', { body: { resumeText, jobText, jobUrl } }),
};
