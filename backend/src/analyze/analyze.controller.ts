import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AnalyzeService } from './analyze.service';
import { ParseService } from '../parse/parse.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import type { ParsedResume, JobDescription } from 'arigatoo-shared';

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
