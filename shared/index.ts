// Shared types and utilities for Arigatoo

// ============ User & Auth ============
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  provider: 'email' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

// ============ Resume ============
export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileUrl: string;
  parsedContent: ParsedResume;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedResume {
  rawText: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  keywords: string[];
}

export interface Experience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

// ============ Job Description ============
export interface JobDescription {
  id: string;
  userId?: string;
  title: string;
  company?: string;
  location?: string;
  sourceUrl?: string;
  rawText: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  experience?: string;
  keywords: string[];
  createdAt: Date;
}

// ============ Analysis ============
export interface AnalysisResult {
  id: string;
  resumeId: string;
  jobDescriptionId: string;
  userId?: string;
  score: CompatibilityScore;
  suggestions: Suggestion[];
  matchedKeywords: string[];
  missingKeywords: string[];
  createdAt: Date;
}

export interface CompatibilityScore {
  overall: number; // 0-100
  skills: number;
  experience: number;
  keywords: number;
}

export interface Suggestion {
  category: 'skills' | 'experience' | 'keywords' | 'formatting' | 'other';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

// ============ API Types ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ParseResumeRequest {
  file?: File;
  fileUrl?: string;
  text?: string;
}

export interface ParseJDRequest {
  url?: string;
  text?: string;
}

export interface AnalyzeRequest {
  resumeId?: string;
  parsedResume?: ParsedResume;
  jobDescription: JobDescription;
  geminiApiKey?: string; // For extension guest mode
}

// ============ Extension ============
export interface ExtensionSettings {
  geminiApiKey?: string;
  isLoggedIn: boolean;
  userId?: string;
  cachedResume?: ParsedResume;
}
