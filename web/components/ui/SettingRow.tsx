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
        return 'bg-success-soft text-success-text border-success-border';
      case 'warning':
        return 'bg-warning-soft text-warning-text border-warning-border';
      case 'danger':
        return 'bg-critical-soft text-critical-text border-critical-border';
      case 'info':
        return 'bg-info-soft text-info-text border-info-border';
      default:
        return 'bg-slate-100 dark:bg-[#121417] text-slate-600 dark:text-[#949aa2] border-black/[0.08] dark:border-[#1f2226]';
    }
  };

  return (
    <div
      className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-[#17191c] last:border-b-0 ${
        destructive ? 'bg-critical-soft/20 -mx-3 px-3 rounded-md' : ''
      } ${className}`}
    >
      <div className="space-y-0.5 max-w-xl">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium tracking-tight ${destructive ? 'text-critical-text' : 'text-[#101217] dark:text-[#ededed]'}`}>
            {label}
          </span>
          {badge && (
            <span
              className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-sm border ${getBadgeClass()}`}
            >
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-[11px] text-slate-500 dark:text-[#8a9199] leading-relaxed">{description}</p>}
        {helper && <div className="text-[10px] text-slate-400 dark:text-[#8a9199]/80 pt-0.5">{helper}</div>}
      </div>

      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
        {children}
      </div>
    </div>
  );
}
