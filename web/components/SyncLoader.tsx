'use client';

import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface SyncLoaderProps {
  title?: string;
  subtitle?: string;
}

export function SyncLoader({
  title = 'Syncing Server Configuration',
  subtitle = 'Fetching Discord roles, channels, and settings in real-time...',
}: SyncLoaderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center relative">
          <Shield className="w-7 h-7 text-white/70" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#050507] border border-white/20 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-white tracking-wide">
        {title}
      </h2>
      <p className="text-xs text-white/40 mt-1 max-w-sm leading-relaxed">
        {subtitle}
      </p>

      {/* Progress Line */}
      <div className="w-40 h-0.5 bg-white/[0.06] rounded-full overflow-hidden mt-5">
        <div className="w-full h-full bg-white/40 animate-[pulse_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}