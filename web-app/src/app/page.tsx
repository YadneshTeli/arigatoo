'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { signInWithGoogle, logOut, onAuthChange, getIdToken, type User } from '@/lib/firebase';
import { api, uploadFile } from '@/lib/api';
import { ModeToggle } from '@/components/mode-toggle';

import { Upload, FileText, Briefcase, BarChart, CheckCircle, XCircle } from 'lucide-react';

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

interface AnalysisResults {
  score: {
    overall: number;
    skills: number;
    experience: number;
    keywords: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
}

interface ResumeData {
  fileName: string;
  parsedContent: {
    skills: string[];
  };
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResults | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  
  const fetchResume = async () => {
    const token = await getIdToken();
    if (!token) return;
    const result = await api.getResume(token);
    if (result.success && result.data) {
      setResume((result.data as { resume: ResumeData }).resume);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        fetchResume();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    await logOut();
    setResume(null);
    setAnalysis(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const token = await getIdToken();
    if (!token) {
      setUploading(false);
      return;
    }

    const result = await uploadFile('/resume/upload', file, token);
    if (result.success && result.data) {
      setResume((result.data as { resume: ResumeData }).resume);
      setActiveTab('job');
    }
    setUploading(false);
  };

  const handleAnalyze = async () => {
    if (!resume?.parsedContent && !jobText && !jobUrl) return;

    setAnalyzing(true);
    const token = await getIdToken();

    try {
      const result = await api.analyze(
        resume?.parsedContent,
        { rawText: jobText, sourceUrl: jobUrl },
        token || undefined
      );

      if (result.success && result.data) {
        setAnalysis((result.data as { analysis: AnalysisResults }).analysis);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }

    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <BarChart className="h-5 w-5" />
             </div>
             <h1 className="text-xl font-bold tracking-tight">Arigatoo</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <ModeToggle />
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {!user ? (
          // Landing
          <div className="text-center py-24 space-y-6">
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight lg:text-7xl">
              Optimize your resume <br/>
              <span className="text-muted-foreground">in seconds.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered analysis to match your resume with any job description. 
              Get clear scoring and actionable feedback.
            </p>
            <div className="pt-4">
                <Button size="lg" className="h-12 px-8 text-lg" onClick={handleLogin}>
                Get Started
                </Button>
            </div>
          </div>
        ) : (
          // Dashboard
          <div className="max-w-4xl mx-auto space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="resume" className="text-base gap-2">
                    <FileText className="h-4 w-4" /> Resume
                </TabsTrigger>
                <TabsTrigger value="job" className="text-base gap-2">
                    <Briefcase className="h-4 w-4" /> Job
                </TabsTrigger>
                <TabsTrigger value="results" className="text-base gap-2">
                    <BarChart className="h-4 w-4" /> Results
                </TabsTrigger>
              </TabsList>

              {/* Resume Tab */}
              <TabsContent value="resume" className="mt-8 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Resume</CardTitle>
                    <CardDescription>Upload your current resume (PDF, DOCX, TXT)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {resume ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                          <div className="h-10 w-10 bg-primary/10 text-primary rounded flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{resume.fileName}</p>
                            <p className="text-sm text-muted-foreground">{resume.parsedContent?.skills?.length || 0} skills detected</p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>

                        {resume.parsedContent?.skills?.length > 0 && (
                          <div className="space-y-2">
                             <span className="text-sm font-medium text-muted-foreground">Detected Skills</span>
                             <div className="flex flex-wrap gap-1.5">
                                {resume.parsedContent.skills.slice(0, 15).map((skill: string, i: number) => (
                                  <span key={i} className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                    {skill}
                                  </span>
                                ))}
                                {resume.parsedContent.skills.length > 15 && (
                                     <span className="text-xs text-muted-foreground self-center">+{resume.parsedContent.skills.length - 15} more</span>
                                )}
                             </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => document.getElementById('resume-upload')?.click()}>
                            Replace Resume
                            </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('resume-upload')?.click()}
                      >
                        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-1">Upload your resume</h3>
                        <p className="text-sm text-muted-foreground mb-4">Drag and drop or click to select</p>
                        <Button disabled={uploading} variant="secondary">
                           {uploading ? 'Uploading...' : 'Select File'}
                        </Button>
                      </div>
                    )}

                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Job Description Tab */}
              <TabsContent value="job" className="mt-8 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description</CardTitle>
                    <CardDescription>Paste the job URL or description text to match against.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Job URL</label>
                      <Input
                        type="url"
                        placeholder="https://linkedin.com/jobs/..."
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Paste the full job description here..."
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        rows={10}
                        className="min-h-[200px]"
                      />
                    </div>

                    <Button 
                      className="w-full h-11 text-base"
                      onClick={handleAnalyze}
                      disabled={analyzing || (!resume && !jobText && !jobUrl)}
                    >
                      {analyzing ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Analyzing...
                          </>
                      ) : 'Analyze Match'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="mt-8">
                {analysis ? (
                  <div className="space-y-6">
                    <Card>
                        <CardHeader className="text-center pb-2">
                             <CardTitle>Compatibility Score</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                              <div className="relative flex items-center justify-center">
                                 <svg className="h-40 w-40 -rotate-90 text-muted/20">
                                   <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" />
                                 </svg>
                                 <svg className="absolute h-40 w-40 -rotate-90 text-primary">
                                    <circle 
                                        cx="80" cy="80" r="70" 
                                        stroke="currentColor" strokeWidth="12" fill="none"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * (analysis.score?.overall || 0)) / 100}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                 </svg>
                                 <span className="absolute text-5xl font-bold">{analysis.score?.overall || 0}</span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-8 mt-8 w-full">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{analysis.score?.skills || 0}%</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Skills</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{analysis.score?.experience || 0}%</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Expr</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{analysis.score?.keywords || 0}%</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Keywords</div>
                                    </div>
                              </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-500">
                                    <CheckCircle className="h-5 w-5" /> Matched Keywords
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1.5">
                                    {analysis.matchedKeywords?.map((kw: string, i: number) => (
                                        <span key={i} className="inline-flex items-center rounded-md border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <XCircle className="h-5 w-5" /> Missing Keywords
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1.5">
                                    {analysis.missingKeywords?.map((kw: string, i: number) => (
                                        <span key={i} className="inline-flex items-center rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {analysis.suggestions?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Suggestions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysis.suggestions.map((suggestion, i) => (
                                    <div key={i} className="p-4 rounded-lg border bg-muted/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                suggestion.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                                {suggestion.priority}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{suggestion.category}</span>
                                        </div>
                                        <h4 className="font-semibold mb-1">{suggestion.title}</h4>
                                        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                  </div>
                ) : (
                    <Card className="p-12 text-center">
                         <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <BarChart className="h-6 w-6 text-muted-foreground" />
                         </div>
                         <h3 className="font-semibold text-lg">No analysis generated yet</h3>
                         <p className="text-muted-foreground mt-1">Upload a resume and provide a job description to see results.</p>
                    </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
