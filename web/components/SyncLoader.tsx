'use client';

import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';

interface SyncLoaderProps {
  title?: string;
  subtitle?: string;
}

export function SyncLoader({
  title = 'Syncing Server with Hawk Bot',
  subtitle = 'Fetching Discord roles, channels, and database configurations in real-time...',
}: SyncLoaderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="relative mb-6">
        {/* Ambient Ring */}
        <div className="w-20 h-20 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center relative">
          <Shield className="w-9 h-9 text-[#5865F2] animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#040406] border border-white/20 flex items-center justify-center">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          </div>
        </div>
      </div>

      <h2 className="text-base font-bold text-white tracking-wide uppercase">
        {title}
      </h2>
      <p className="text-xs text-white/40 mt-1.5 max-w-sm leading-relaxed">
        {subtitle}
      </p>

      {/* Progress Line */}
      <div className="w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden mt-6">
        <div className="w-full h-full bg-[#5865F2] animate-[pulse_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}