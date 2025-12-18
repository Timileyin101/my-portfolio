'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User, Auth, UserCredential, AuthError } from 'firebase/auth';
import { Loader2, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

// --- Type Definitions ---
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// --- Firebase Initialization ---
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
// ------------------------------

export default function LoginPage(){
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // Use router.push('/admin') for Next.js App Router compatible push
        router.push('/admin');
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch (err: unknown) {
      console.error(err);
      
      const authError = err as AuthError;
      
      if (
        authError.code === 'auth/invalid-credential' || 
        authError.code === 'auth/user-not-found' || 
        authError.code === 'auth/wrong-password'
      ) {
        setError('Invalid email or password.');
      } else if (authError.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to log in. Please check your connection.');
      }
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Brand/Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900/20 text-blue-500 mb-4 border border-blue-900/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Access</h1>
          <p className="text-zinc-500 mt-2 text-sm">Enter your credentials to manage your portfolio</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                    placeholder="admin@portfolio.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>Protected Area. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
}