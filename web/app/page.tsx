'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  KeyRound,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'ID' | 'OTP'>('ID');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error') || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Timers for OTP expiry (120s) and resend cooldown (30s)
  const [expiryCountdown, setExpiryCountdown] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

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

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'OTP') return;

    const timer = setInterval(() => {
      setExpiryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = userId.trim().replace(/[<@!>]/g, '');

    if (!cleanId) {
      setError('Please enter your Discord User ID.');
      return;
    }

    if (!/^\d{17,20}$/.test(cleanId)) {
      setError('Invalid User ID. Discord Snowflake IDs must be 17-20 numeric digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setStep('OTP');
      setExpiryCountdown(120); // 2 minutes
      setResendCooldown(30); // 30 seconds
      setSuccessMsg('A 6-digit code has been sent directly to your Discord DMs.');
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = userId.trim().replace(/[<@!>]/g, '');
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('The verification code must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanId,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#6e747c] animate-spin" />
          <span className="text-xs font-mono text-[#6e747c]">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative bg-[#08090a]">
      {/* Login Card */}
      <div className="w-full max-w-md bg-[#0d0e10] border border-[#1f2226] rounded-xl p-6 sm:p-8 relative z-10 shadow-2xl">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#121417] border border-[#1f2226] flex items-center justify-center mb-4 text-[#ededed] shadow-tactile-btn">
            <Shield className="w-6 h-6 text-[#c8ccd0]" />
          </div>

          <h1 className="text-base font-semibold text-[#ededed] tracking-tight">Hawk Ops Console</h1>
          <p className="text-xs text-[#6e747c] mt-1 max-w-xs">
            Operational Discord server configuration, bot administration, and telemetry.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-5 p-3 rounded-lg bg-critical-soft border border-critical-border flex items-start gap-2.5 text-xs text-critical-text">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="mt-5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Discord User ID */}
        {step === 'ID' && (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-[#8e96a0] flex items-center justify-between">
                <span>Discord User ID</span>
                <span className="text-[10px] text-[#555a62] font-normal">Snowflake ID</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 1293525264650997842"
                className="glass-input font-mono text-xs w-full"
                disabled={loading}
              />
              <p className="text-[11px] text-[#6e747c] leading-relaxed pt-1">
                A 6-digit one-time code will be dispatched directly to your Discord direct messages (DMs) by Hawk.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter 6-Digit OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-[#17191c]">
              <div className="flex items-center gap-1.5 text-[#8e96a0] font-mono text-[11px]">
                <span>ID:</span>
                <span className="text-[#ededed] font-medium">{userId}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('ID');
                  setOtp('');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[11px] text-[#8e96a0] hover:text-[#ededed] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Change ID</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#8e96a0]">
                  6-Digit Verification Code
                </label>
                {expiryCountdown > 0 ? (
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Expires in {formatTime(expiryCountdown)}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-red-400">Code expired</span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="glass-input font-mono text-center tracking-[0.4em] text-lg font-bold py-2 w-full"
                  disabled={loading}
                />
                <KeyRound className="w-4 h-4 text-[#555a62] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || expiryCountdown === 0 || otp.length !== 6}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Enter Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Resend Action */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                disabled={loading || resendCooldown > 0}
                onClick={() => handleRequestOtp()}
                className="text-xs text-[#8e96a0] hover:text-[#ededed] disabled:text-[#454950] disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors font-mono"
              >
                <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? (
                  <span>Resend code in {resendCooldown}s</span>
                ) : (
                  <span>Resend verification code</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-[#17191c] text-center">
          <p className="text-[11px] text-[#6e747c]">
            Role-based dashboard permissions are granted using{' '}
            <code className="text-[#ededed] font-mono bg-[#121417] px-1.5 py-0.5 rounded border border-[#1f2226]">
              !access @user dashboard
            </code>
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
        <div className="min-h-screen flex items-center justify-center bg-[#08090a]">
          <div className="w-6 h-6 rounded-full border border-[#1f2226] border-t-white animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
