'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signInWithGoogle, getIdToken, type User, onAuthChange } from '@/lib/firebase';
import { api } from '@/lib/api';

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
        
        // Fetch resume data
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
                    console.log('Extension notified:', response);
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
        // creating listener in useEffect will trigger handleHandshake
    } catch (error) {
        console.error(error);
        setStatus('error');
        setMessage('Sign in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md p-8 text-center rounded-3xl border-0">
        <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
        <p className="text-white/60 mb-8">{message}</p>

        {status === 'loading' && (
            <div className="flex justify-center mb-6">
                 <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        )}

        {status === 'idle' && (
             <Button 
                onClick={handleSignIn}
                className="w-full bg-white text-black hover:bg-white/90 rounded-xl py-6 text-lg"
             >
                Sign In with Google
             </Button>
        )}

        {status === 'success' && (
            <div className="space-y-4">
                <div className="p-4 bg-green-500/20 text-green-300 rounded-xl mb-4">
                    ✓ Connected as {user?.email}
                </div>
                <Button 
                    variant="outline"
                    onClick={() => window.close()}
                    className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl py-6"
                >
                    Close Tab
                </Button>
            </div>
        )}

        {status === 'error' && (
             <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-6"
             >
                Try Again
             </Button>
        )}
      </Card>
    </div>
  );
}
