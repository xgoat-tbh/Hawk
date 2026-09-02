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
          bg: 'bg-success-soft',
          text: 'text-success-text',
          border: 'border-success-border',
          dotBg: 'bg-success',
        };
      case 'warning':
        return {
          bg: 'bg-warning-soft',
          text: 'text-warning-text',
          border: 'border-warning-border',
          dotBg: 'bg-warning',
        };
      case 'danger':
        return {
          bg: 'bg-critical-soft',
          text: 'text-critical-text',
          border: 'border-critical-border',
          dotBg: 'bg-critical',
        };
      case 'info':
        return {
          bg: 'bg-info-soft',
          text: 'text-info-text',
          border: 'border-info-border',
          dotBg: 'bg-info',
        };
      default:
        return {
          bg: 'bg-[#17191c]',
          text: 'text-[#a9adb2]',
          border: 'border-[#24272b]',
          dotBg: 'bg-[#7e8389]',
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
