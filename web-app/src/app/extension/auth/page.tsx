'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { signInWithGoogle, getIdToken, type User, onAuthChange } from '@/lib/firebase';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

export default function ExtensionAuthPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Checking authentication status...');

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        handleHandshake(currentUser);
      } else {
        setStatus('idle');
        setMessage('Please sign in to connect properly with the extension.');
      }
    });

    return () => unsubscribe();
  }, [searchParams]);

  const handleHandshake = async (currentUser: User) => {
    const extId = searchParams.get('extId');
    if (!extId) {
        setStatus('error');
        setMessage('Error: Missing Extension ID. Please try clicking "Login" from the extension again.');
        return;
    }

    try {
        setStatus('loading');
        setMessage('Connecting to extension...');
        const token = await getIdToken();
        
        let resume = null;
        const res = await api.getResume(token || '');
        if (res.success && res.data) {
            resume = (res.data as any).resume;
        }

        if (window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage(extId, {
                type: 'LOGIN_SUCCESS',
                userId: currentUser.uid,
                email: currentUser.email,
                idToken: token,
                resume: resume
            }, (response) => {
                if (window.chrome.runtime.lastError) {
                    console.error(window.chrome.runtime.lastError);
                    setStatus('error');
                    setMessage('Failed to reach extension. Make sure it is installed and enabled.');
                } else {
                    setStatus('success');
                    setMessage('Successfully connected! You can now close this tab.');
                }
            });
        } else {
            setStatus('error');
            setMessage('Chrome runtime not found. Are you using a Chromium-based browser?');
        }
    } catch (err) {
        console.error('Handshake failed:', err);
        setStatus('error');
        setMessage('An error occurred while connecting.');
    }
  };

  const handleSignIn = async () => {
    try {
        setStatus('loading');
        await signInWithGoogle();
    } catch (error) {
        console.error(error);
        setStatus('error');
        setMessage('Sign in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Link2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Connect Extension</CardTitle>
            <CardDescription>
                {message}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {status === 'loading' && (
                <div className="flex justify-center p-4">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {status === 'idle' && (
                 <Button 
                    onClick={handleSignIn}
                    className="w-full h-11 text-base"
                 >
                    Sign In to Connect
                 </Button>
            )}

            {status === 'success' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium text-sm">Connected as {user?.email}</span>
                    </div>
                    <Button 
                        variant="outline"
                        onClick={() => window.close()}
                        className="w-full"
                    >
                        Close Tab
                    </Button>
                </div>
            )}

            {status === 'error' && (
                 <Button 
                    onClick={() => window.location.reload()}
                    variant="destructive"
                    className="w-full"
                 >
                    Try Again
                 </Button>
            )}
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        Arigatoo uses secure authentication to sync your resume and settings.
      </p>
    </div>
  );
}
