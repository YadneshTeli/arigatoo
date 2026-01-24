import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';
import type { ParsedResume, JobDescription, AnalysisResult, Suggestion } from 'arigatoo-shared';
import { RedisService } from '../cache/redis.service';

// In-memory fallback cache
const memoryCache = new Map<string, { result: AnalysisResult; timestamp: number }>();
const CACHE_TTL = 3600; // 1 hour in seconds

@Injectable()
export class AnalyzeService {
    private openai: OpenAI | null = null;
    private gemini: GoogleGenerativeAI | null = null;

    constructor(
        private configService: ConfigService,
        private redisService: RedisService,
    ) {
        const openrouterKey = this.configService.get<string>('OPENROUTER_API_KEY');
        const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (openrouterKey) {
            this.openai = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: openrouterKey,
            });
        }

        if (geminiKey) {
            this.gemini = new GoogleGenerativeAI(geminiKey);
        }
    }

    // Generate cache key from resume and JD content
    private generateCacheKey(resume: ParsedResume, job: JobDescription): string {
        const content = `${resume.rawText?.substring(0, 500) || ''}-${job.rawText?.substring(0, 500) || ''}`;
        return `analysis:${crypto.createHash('md5').update(content).digest('hex')}`;
    }

    async analyzeResumeVsJob(
        resume: ParsedResume,
        job: JobDescription,
        userGeminiKey?: string,
    ): Promise<AnalysisResult> {
        const cacheKey = this.generateCacheKey(resume, job);

        // Try Redis cache first
        if (this.redisService.isConnected()) {
            const cached = await this.redisService.get<AnalysisResult>(cacheKey);
            if (cached) {
                console.log('✅ Redis cache hit for analysis');
                return cached;
            }
        } else {
            // Fallback to in-memory cache
            const memCached = memoryCache.get(cacheKey);
            if (memCached && Date.now() - memCached.timestamp < CACHE_TTL * 1000) {
                console.log('✅ Memory cache hit for analysis');
                return memCached.result;
            }
        }

        const prompt = this.buildAnalysisPrompt(resume, job);
        let aiResponse: string | null = null;

        // Try OpenRouter first
        if (this.openai) {
            try {
                aiResponse = await this.callOpenRouter(prompt);
            } catch (error) {
                console.error('OpenRouter failed, falling back to Gemini:', error);
            }
        }

        // Fallback to Gemini (system or user key)
        if (!aiResponse) {
            const geminiInstance = userGeminiKey
                ? new GoogleGenerativeAI(userGeminiKey)
                : this.gemini;

            if (geminiInstance) {
                try {
                    aiResponse = await this.callGemini(geminiInstance, prompt);
                } catch (error) {
                    console.error('Gemini failed:', error);
                }
            }
        }

        // Parse AI response or use fallback analysis
        let result: AnalysisResult;
        if (aiResponse) {
            result = this.parseAIResponse(aiResponse, resume, job);
        } else {
            result = this.fallbackAnalysis(resume, job);
        }

        // Cache the result
        if (this.redisService.isConnected()) {
            await this.redisService.set(cacheKey, result, CACHE_TTL);
            console.log('✅ Cached analysis in Redis');
        } else {
            memoryCache.set(cacheKey, { result, timestamp: Date.now() });
        }

        return result;
    }

    // ============ Analyze with user's Gemini key (for extension guest mode) ============
    async analyzeWithUserKey(
        resume: ParsedResume,
        job: JobDescription,
        geminiApiKey: string,
    ): Promise<AnalysisResult> {
        return this.analyzeResumeVsJob(resume, job, geminiApiKey);
    }

    // ============ AI Calls ============
    private async callOpenRouter(prompt: string): Promise<string> {
        if (!this.openai) throw new Error('OpenRouter not configured');

        const response = await this.openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert career advisor analyzing resumes against job descriptions. Respond in JSON format.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
        });

        return response.choices[0]?.message?.content || '';
    }

    private async callGemini(gemini: GoogleGenerativeAI, prompt: string): Promise<string> {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
    }

    // ============ Prompt Building ============
    private buildAnalysisPrompt(resume: ParsedResume, job: JobDescription): string {
        return `
Analyze this resume against the job description and provide a detailed assessment.

RESUME:
Name: ${resume.name || 'Not provided'}
Skills: ${resume.skills?.join(', ') || 'Not extracted'}
Keywords: ${resume.keywords?.join(', ') || 'Not extracted'}

Full Text:
${resume.rawText?.substring(0, 2000) || 'No text provided'}

JOB DESCRIPTION:
Title: ${job.title || 'Not provided'}
Company: ${job.company || 'Not provided'}
Required Skills: ${job.skills?.join(', ') || 'Not extracted'}
Requirements: ${job.requirements?.join('; ') || 'Not extracted'}

Full Text:
${job.rawText?.substring(0, 2000) || 'No text provided'}

Respond in JSON format with:
{
  "overallScore": <0-100>,
  "skillsScore": <0-100>,
  "experienceScore": <0-100>,
  "keywordsScore": <0-100>,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": [
    {
      "category": "skills|experience|keywords|formatting|other",
      "priority": "high|medium|low",
      "title": "Short title",
      "description": "Detailed suggestion",
      "action": "Specific action to take"
    }
  ]
}
`;
    }

    // ============ Response Parsing ============
    private parseAIResponse(response: string, resume: ParsedResume, job: JobDescription): AnalysisResult {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                id: this.generateId(),
                resumeId: '',
                jobDescriptionId: '',
                score: {
                    overall: parsed.overallScore || 50,
                    skills: parsed.skillsScore || 50,
                    experience: parsed.experienceScore || 50,
                    keywords: parsed.keywordsScore || 50,
                },
                suggestions: (parsed.suggestions || []).map((s: any) => ({
                    category: s.category || 'other',
                    priority: s.priority || 'medium',
                    title: s.title || 'Suggestion',
                    description: s.description || '',
                    action: s.action,
                })),
                matchedKeywords: parsed.matchedKeywords || [],
                missingKeywords: parsed.missingKeywords || [],
                createdAt: new Date(),
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return this.fallbackAnalysis(resume, job);
        }
    }

    // ============ Fallback Analysis (no AI) ============
    private fallbackAnalysis(resume: ParsedResume, job: JobDescription): AnalysisResult {
        const resumeKeywords = new Set((resume.keywords || []).map(k => k.toLowerCase()));
        const resumeSkills = new Set((resume.skills || []).map(s => s.toLowerCase()));
        const jobKeywords = new Set((job.keywords || []).map(k => k.toLowerCase()));
        const jobSkills = new Set((job.skills || []).map(s => s.toLowerCase()));

        const matchedKeywords = [...jobKeywords].filter(k => resumeKeywords.has(k));
        const missingKeywords = [...jobKeywords].filter(k => !resumeKeywords.has(k));
        const matchedSkills = [...jobSkills].filter(s => resumeSkills.has(s));
        const missingSkills = [...jobSkills].filter(s => !resumeSkills.has(s));

        const keywordsScore = jobKeywords.size > 0 ? Math.round((matchedKeywords.length / jobKeywords.size) * 100) : 50;
        const skillsScore = jobSkills.size > 0 ? Math.round((matchedSkills.length / jobSkills.size) * 100) : 50;
        const experienceScore = 50;
        const overallScore = Math.round((keywordsScore + skillsScore + experienceScore) / 3);

        const suggestions: Suggestion[] = [];

        if (missingSkills.length > 0) {
            suggestions.push({
                category: 'skills',
                priority: 'high',
                title: 'Add Missing Skills',
                description: `Consider adding: ${missingSkills.slice(0, 5).join(', ')}`,
                action: 'Update your skills section',
            });
        }

        if (missingKeywords.length > 0) {
            suggestions.push({
                category: 'keywords',
                priority: 'medium',
                title: 'Include Industry Keywords',
                description: `Missing: ${missingKeywords.slice(0, 5).join(', ')}`,
                action: 'Incorporate these terms naturally',
            });
        }

        return {
            id: this.generateId(),
            resumeId: '',
            jobDescriptionId: '',
            score: { overall: overallScore, skills: skillsScore, experience: experienceScore, keywords: keywordsScore },
            suggestions,
            matchedKeywords,
            missingKeywords,
            createdAt: new Date(),
        };
    }

    private generateId(): string {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
