'use client';


import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signInWithGoogle, logOut, onAuthChange, getIdToken, type User } from '@/lib/firebase';
import { api, uploadFile } from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchResume = async () => {
    const token = await getIdToken();
    if (!token) return;
    const result = await api.getResume(token);
    if (result.success && result.data) {
      setResume((result.data as any).resume);
    }
  };

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
      setResume((result.data as any).resume);
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
        setAnalysis((result.data as any).analysis);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }

    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass-card rounded-3xl p-8">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">Arigatoo</h1>
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">{user.email}</span>
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20" onClick={handleLogin}>
              Sign in with Google
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {!user ? (
          // Landing
          <div className="text-center py-20">
            <h2 className="text-5xl font-bold text-white mb-6">
              Resume <span className="gradient-text">Analyzer</span>
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Match your resume with job descriptions using AI. Get compatibility scores and improvement suggestions.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-white/90 text-lg px-8 py-6 rounded-2xl glow"
              onClick={handleLogin}
            >
              Get Started
            </Button>
          </div>
        ) : (
          // Dashboard
          <div className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="glass-card rounded-2xl p-2 w-full grid grid-cols-3 gap-2">
                <TabsTrigger 
                  value="resume" 
                  className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Resume
                </TabsTrigger>
                <TabsTrigger 
                  value="job" 
                  className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Job Description
                </TabsTrigger>
                <TabsTrigger 
                  value="results" 
                  className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Results
                </TabsTrigger>
              </TabsList>

              {/* Resume Tab */}
              <TabsContent value="resume" className="mt-8">
                <Card className="glass-card rounded-3xl p-8 border-0">
                  <h3 className="text-2xl font-semibold text-white mb-6">Your Resume</h3>
                  
                  {resume ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{resume.fileName}</p>
                          <p className="text-white/50 text-sm">{resume.parsedContent?.skills?.length || 0} skills detected</p>
                        </div>
                      </div>

                      {resume.parsedContent?.skills?.length > 0 && (
                        <div>
                          <p className="text-white/70 mb-3">Detected Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {resume.parsedContent.skills.slice(0, 10).map((skill: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        variant="outline" 
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace Resume
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-white/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-white/80 font-medium mb-2">
                        {uploading ? 'Uploading...' : 'Upload your resume'}
                      </p>
                      <p className="text-white/50 text-sm">PDF, DOCX, or TXT</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </Card>
              </TabsContent>

              {/* Job Description Tab */}
              <TabsContent value="job" className="mt-8">
                <Card className="glass-card rounded-3xl p-8 border-0">
                  <h3 className="text-2xl font-semibold text-white mb-6">Job Description</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Paste URL</label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/jobs/..."
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="text-center text-white/40">— or —</div>

                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Paste Job Description</label>
                      <textarea
                        placeholder="Paste the job description here..."
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        rows={8}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
                      />
                    </div>

                    <Button 
                      className="w-full bg-white text-black hover:bg-white/90 rounded-xl py-6 text-lg font-medium"
                      onClick={handleAnalyze}
                      disabled={analyzing || (!resume && !jobText && !jobUrl)}
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Match'}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="mt-8">
                {analysis ? (
                  <div className="space-y-6">
                    {/* Score Card */}
                    <Card className="glass-card rounded-3xl p-8 border-0 text-center">
                      <h3 className="text-xl text-white/70 mb-6">Compatibility Score</h3>
                      
                      <div className="relative w-40 h-40 mx-auto mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="12"
                            fill="none"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="url(#scoreGradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="440"
                            strokeDashoffset={440 - (440 * (analysis.score?.overall || 0)) / 100}
                            className="score-ring"
                          />
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-5xl font-bold text-white">{analysis.score?.overall || 0}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-sm">Skills</p>
                          <p className="text-2xl font-bold text-white">{analysis.score?.skills || 0}%</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-sm">Experience</p>
                          <p className="text-2xl font-bold text-white">{analysis.score?.experience || 0}%</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-white/50 text-sm">Keywords</p>
                          <p className="text-2xl font-bold text-white">{analysis.score?.keywords || 0}%</p>
                        </div>
                      </div>
                    </Card>

                    {/* Suggestions */}
                    {analysis.suggestions?.length > 0 && (
                      <Card className="glass-card rounded-3xl p-8 border-0">
                        <h3 className="text-xl text-white mb-6">Improvement Suggestions</h3>
                        <div className="space-y-4">
                          {analysis.suggestions.map((suggestion: any, i: number) => (
                            <div key={i} className="p-4 bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  suggestion.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                                  suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-green-500/20 text-green-300'
                                }`}>
                                  {suggestion.priority}
                                </span>
                                <span className="text-white/50 text-sm">{suggestion.category}</span>
                              </div>
                              <h4 className="text-white font-medium mb-1">{suggestion.title}</h4>
                              <p className="text-white/60 text-sm">{suggestion.description}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Keywords */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {analysis.matchedKeywords?.length > 0 && (
                        <Card className="glass-card rounded-3xl p-6 border-0">
                          <h4 className="text-white font-medium mb-4">✓ Matched Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.matchedKeywords.map((kw: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </Card>
                      )}
                      {analysis.missingKeywords?.length > 0 && (
                        <Card className="glass-card rounded-3xl p-6 border-0">
                          <h4 className="text-white font-medium mb-4">✗ Missing Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.missingKeywords.map((kw: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                ) : (
                  <Card className="glass-card rounded-3xl p-12 border-0 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-white/60">No analysis yet. Upload your resume and paste a job description to get started.</p>
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
