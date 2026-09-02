'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        // Not authenticated
      } finally {
        setCheckingSession(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.trim() }),
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
      <div className="min-h-screen flex items-center justify-center bg-[#08090c]">
        <div className="w-8 h-8 rounded-full border-2 border-[#5865F2]/20 border-t-[#5865F2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#08090c]">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5865F2]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md glass-card p-8 sm:p-10 relative z-10 transition-all duration-300">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-5 text-[#5865F2] shadow-[0_0_25px_rgba(88,101,242,0.15)] group hover:scale-105 transition-transform duration-300">
            <Shield className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">Hawk Control Panel</h1>
          <p className="text-xs text-white/40 mt-1.5 font-normal">
            Private administrative dashboard. Enter your Discord Snowflake ID to authenticate.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/60 tracking-wide uppercase">Discord User ID</label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 1293525264650997842"
                className="glass-input pr-10 font-mono text-sm"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-outline-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Permissions...</span>
              </>
            ) : (
              <>
                <span>Access Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-white/30">
            Access can be granted by administrators using <code className="text-[#5865F2]/80 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">!access @user dashboard</code>
          </p>
        </div>
      </div>
    </div>
  );
}
