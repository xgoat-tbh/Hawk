'use client';

import React from 'react';

export type StatusVariant = 'operational' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  variant = 'neutral',
  dot = true,
  className = '',
}: StatusBadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'operational':
      case 'success':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          dotBg: 'bg-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          dotBg: 'bg-amber-400',
        };
      case 'danger':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          border: 'border-red-500/20',
          dotBg: 'bg-red-400',
        };
      case 'info':
        return {
          bg: 'bg-sky-500/10',
          text: 'text-sky-400',
          border: 'border-sky-500/20',
          dotBg: 'bg-sky-400',
        };
      default:
        return {
          bg: 'bg-white/[0.04]',
          text: 'text-white/60',
          border: 'border-white/[0.08]',
          dotBg: 'bg-white/40',
        };
    }
  };

  const colors = getColors();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dotBg}`} />}
      <span>{status}</span>
    </span>
  );
}
