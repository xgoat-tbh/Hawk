'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, KeyRound, ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // Not authenticated
      } finally {
        setCheckingSession(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleDiscordOAuth = () => {
    window.location.href = '/api/auth/discord';
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          passcode: passcode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Access Denied: You are not authorized.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-6 h-6 rounded-full border border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative bg-[#050505]">
      {/* Login Card */}
      <div className="w-full max-w-md glass-card p-6 sm:p-8 relative z-10 transition-all">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 text-white">
            <Shield className="w-6 h-6" />
          </div>

          <h1 className="text-lg font-semibold text-white tracking-tight">Hawk Control Panel</h1>
          <p className="text-xs text-white/40 mt-1 max-w-xs">
            Private administrative dashboard for Discord server configuration and bot orchestration.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-5 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Primary OAuth2 Authentication */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleDiscordOAuth}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            <span>Continue with Discord</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-[1px] flex-1 bg-white/[0.08]" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-white/30">Or</span>
            <div className="h-[1px] flex-1 bg-white/[0.08]" />
          </div>

          {!showPasskey ? (
            <button
              type="button"
              onClick={() => setShowPasskey(true)}
              className="btn-outline-secondary w-full py-2 text-xs flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-white/50" />
              <span>Developer / Passcode Login</span>
            </button>
          ) : (
            /* Developer / Passcode Form */
            <form onSubmit={handlePasscodeLogin} className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Discord User ID
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 1293525264650997842"
                  className="glass-input font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Admin Passcode / Access Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter security key..."
                    className="glass-input font-mono text-xs pr-9"
                  />
                  <Lock className="w-3.5 h-3.5 text-white/30 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-outline-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-white/30">
            Access can be granted by administrators using <code className="text-white/70 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">!access @user dashboard</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#050505]">
          <div className="w-6 h-6 rounded-full border border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
