import { Injectable, BadRequestException } from '@nestjs/common';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import type { ParsedResume, JobDescription } from 'arigatoo-shared';

// Configuration constants
const FETCH_TIMEOUT_MS = 10000; // Timeout for URL fetch requests in milliseconds

@Injectable()
export class ParseService {
    // ============ PDF Parsing ============
    async parsePdf(buffer: Buffer): Promise<string> {
        try {
            const data = await pdfParse(buffer);
            return data.text;
        } catch (error) {
            console.error('PDF Parse Error:', error);
            throw new BadRequestException(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ============ Word Document Parsing ============
    async parseDocx(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            throw new BadRequestException('Failed to parse Word document');
        }
    }

    // ============ URL Scraping for JD ============
    async scrapeJobDescription(url: string): Promise<string> {
        try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove scripts and styles
            $('script, style, nav, header, footer').remove();

            // Try common job description selectors
            const selectors = [
                '[data-testid="job-description"]',
                '.job-description',
                '.description',
                '#job-description',
                'article',
                'main',
                '.content',
            ];

            for (const selector of selectors) {
                const content = $(selector).text().trim();
                if (content && content.length > 200) {
                    return this.cleanText(content);
                }
            }

            // Fallback to body text
            return this.cleanText($('body').text());
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new BadRequestException('Request timeout: URL took too long to respond');
            }
            throw new BadRequestException(`Failed to fetch job description from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ============ Resume Text Extraction ============
    async extractResumeData(text: string): Promise<ParsedResume> {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        return {
            rawText: text,
            name: this.extractName(lines),
            email: this.extractEmail(text),
            phone: this.extractPhone(text),
            location: this.extractLocation(lines),
            skills: this.extractSkills(text),
            experience: [],
            education: [],
            keywords: this.extractKeywords(text),
        };
    }

    // ============ Job Description Extraction ============
    async extractJobData(text: string, sourceUrl?: string): Promise<Partial<JobDescription>> {
        return {
            rawText: text,
            sourceUrl,
            requirements: this.extractRequirements(text),
            responsibilities: this.extractResponsibilities(text),
            skills: this.extractSkills(text),
            keywords: this.extractKeywords(text),
            createdAt: new Date(),
        };
    }

    // ============ Helper Methods ============
    private cleanText(text: string): string {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    private extractEmail(text: string): string | undefined {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = text.match(emailRegex);
        return match?.[0];
    }

    private extractPhone(text: string): string | undefined {
        const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        const match = text.match(phoneRegex);
        return match?.[0];
    }

    private extractName(lines: string[]): string | undefined {
        // First non-empty line is often the name
        for (const line of lines.slice(0, 5)) {
            if (line.length > 2 && line.length < 50 && !line.includes('@') && !line.match(/\d{3}/)) {
                return line;
            }
        }
        return undefined;
    }

    private extractLocation(lines: string[]): string | undefined {
        const locationPatterns = [
            /([A-Z][a-z]+,?\s*[A-Z]{2})/,
            /([A-Z][a-z]+,\s*[A-Z][a-z]+)/,
        ];

        for (const line of lines.slice(0, 10)) {
            for (const pattern of locationPatterns) {
                const match = line.match(pattern);
                if (match) return match[0];
            }
        }
        return undefined;
    }

    private extractSkills(text: string): string[] {
        const commonSkills = [
            'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP',
            'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask',
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub',
            'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Firebase', 'GraphQL',
            'HTML', 'CSS', 'Sass', 'Tailwind', 'Bootstrap',
            'REST', 'API', 'Microservices', 'Agile', 'Scrum',
            'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch',
        ];

        const foundSkills: string[] = [];
        const lowerText = text.toLowerCase();

        for (const skill of commonSkills) {
            if (lowerText.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        }

        return [...new Set(foundSkills)];
    }

    private extractKeywords(text: string): string[] {
        // Extract significant words (4+ chars, not common words)
        const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'will', 'would', 'could', 'should', 'about', 'which', 'their', 'there', 'these', 'those', 'being', 'other']);

        const words = text.toLowerCase()
            .replace(/[^a-z\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 4 && !stopWords.has(word));

        // Count frequency
        const freq: Record<string, number> = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }

        // Return top 20 keywords by frequency
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    private extractRequirements(text: string): string[] {
        const lines = text.split('\n');
        const requirements: string[] = [];
        let inRequirements = false;

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.includes('requirement') || lower.includes('qualification') || lower.includes('must have')) {
                inRequirements = true;
                continue;
            }
            if (inRequirements && (lower.includes('responsibilit') || lower.includes('about us') || lower.includes('benefits'))) {
                inRequirements = false;
            }
            if (inRequirements && line.trim().length > 10) {
                requirements.push(line.trim());
            }
        }

        return requirements.slice(0, 15);
    }

    private extractResponsibilities(text: string): string[] {
        const lines = text.split('\n');
        const responsibilities: string[] = [];
        let inResponsibilities = false;

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.includes('responsibilit') || lower.includes('what you') || lower.includes('you will')) {
                inResponsibilities = true;
                continue;
            }
            if (inResponsibilities && (lower.includes('requirement') || lower.includes('qualification') || lower.includes('benefits'))) {
                inResponsibilities = false;
            }
            if (inResponsibilities && line.trim().length > 10) {
                responsibilities.push(line.trim());
            }
        }

        return responsibilities.slice(0, 15);
    }
}
