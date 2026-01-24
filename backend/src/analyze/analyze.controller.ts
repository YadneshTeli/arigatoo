import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { ParseService } from '../parse/parse.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import type { ParsedResume, JobDescription } from 'arigatoo-shared';

// Validation constants
const MAX_TEXT_LENGTH = 50000; // Maximum length for resume and job text
const MIN_API_KEY_LENGTH = 10; // Minimum length for API key
const MAX_API_KEY_LENGTH = 200; // Maximum length for API key

@Controller('analyze')
export class AnalyzeController {
    constructor(
        private readonly analyzeService: AnalyzeService,
        private readonly parseService: ParseService,
    ) { }

    @Post()
    async analyze(
        @Body('resume') resume: ParsedResume,
        @Body('jobDescription') jobDescription: JobDescription,
        @Body('geminiApiKey') geminiApiKey?: string,
    ) {
        if (!resume || !jobDescription) {
            return { success: false, error: 'Resume and job description are required' };
        }

        const result = geminiApiKey
            ? await this.analyzeService.analyzeWithUserKey(resume, jobDescription, geminiApiKey)
            : await this.analyzeService.analyzeResumeVsJob(resume, jobDescription);

        return {
            success: true,
            data: { analysis: result },
        };
    }

    @Post('quick')
    async quickAnalyze(
        @Body('resumeText') resumeText: string,
        @Body('jobText') jobText?: string,
        @Body('jobUrl') jobUrl?: string,
        @Body('geminiApiKey') geminiApiKey?: string,
    ) {
        if (!resumeText) {
            return { success: false, error: 'Resume text is required' };
        }

        if (!jobText && !jobUrl) {
            return { success: false, error: 'Job description text or URL is required' };
        }

        // Validate input sizes to prevent abuse
        if (resumeText.length > MAX_TEXT_LENGTH) {
            return { success: false, error: `Resume text is too long (max ${MAX_TEXT_LENGTH.toLocaleString()} characters)` };
        }

        if (jobText && jobText.length > MAX_TEXT_LENGTH) {
            return { success: false, error: `Job description is too long (max ${MAX_TEXT_LENGTH.toLocaleString()} characters)` };
        }

        // Validate geminiApiKey format if provided
        if (geminiApiKey && (geminiApiKey.length < MIN_API_KEY_LENGTH || geminiApiKey.length > MAX_API_KEY_LENGTH)) {
            return { success: false, error: 'Invalid API key format' };
        }

        // Validate jobUrl format if provided
        if (jobUrl) {
            try {
                const url = new URL(jobUrl);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    return { success: false, error: 'Invalid URL protocol (only http and https allowed)' };
                }
            } catch {
                return { success: false, error: 'Invalid job URL format' };
            }
        }

        // Parse resume
        const parsedResume = await this.parseService.extractResumeData(resumeText);

        // Parse job description
        let rawJobText = jobText;
        if (jobUrl && !jobText) {
            rawJobText = await this.parseService.scrapeJobDescription(jobUrl);
        }

        const jobData = await this.parseService.extractJobData(rawJobText!, jobUrl);
        const jobDescription: JobDescription = {
            id: `job_${Date.now()}`,
            title: '',
            rawText: rawJobText!,
            requirements: jobData.requirements || [],
            responsibilities: jobData.responsibilities || [],
            skills: jobData.skills || [],
            keywords: jobData.keywords || [],
            createdAt: new Date(),
            ...jobData,
        };

        // Analyze
        const result = geminiApiKey
            ? await this.analyzeService.analyzeWithUserKey(parsedResume, jobDescription, geminiApiKey)
            : await this.analyzeService.analyzeResumeVsJob(parsedResume, jobDescription);

        return {
            success: true,
            data: {
                analysis: result,
                parsedResume,
                jobDescription,
            },
        };
    }
}
