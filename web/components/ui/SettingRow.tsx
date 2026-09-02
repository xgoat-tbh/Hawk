'use client';

import React from 'react';

interface SettingRowProps {
  label: string;
  description?: string;
  helper?: React.ReactNode;
  badge?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
  destructive?: boolean;
}

export function SettingRow({
  label,
  description,
  helper,
  badge,
  badgeVariant = 'neutral',
  children,
  className = '',
  destructive = false,
}: SettingRowProps) {
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'danger':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'info':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-white/[0.04] text-white/50 border-white/[0.08]';
    }
  };

  return (
    <div
      className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] last:border-b-0 ${
        destructive ? 'bg-red-500/[0.02] -mx-4 px-4 rounded-lg' : ''
      } ${className}`}
    >
      <div className="space-y-0.5 max-w-xl">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium tracking-wide ${destructive ? 'text-red-400' : 'text-white'}`}>
            {label}
          </span>
          {badge && (
            <span
              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${getBadgeClass()}`}
            >
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-[11px] text-white/40 leading-relaxed">{description}</p>}
        {helper && <div className="text-[10px] text-white/30 pt-0.5">{helper}</div>}
      </div>

      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
        {children}
      </div>
    </div>
  );
}
