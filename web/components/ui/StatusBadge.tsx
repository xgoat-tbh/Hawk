'use client';

import React from 'react';

export type StatusVariant =
  | 'operational'
  | 'connected'
  | 'enabled'
  | 'disabled'
  | 'pending'
  | 'warning'
  | 'error'
  | 'danger'
  | 'denied'
  | 'inherited'
  | 'neutral'
  | 'info';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

export function StatusDot({ variant = 'neutral', className = '' }: { variant?: StatusVariant; className?: string }) {
  const getDotColor = () => {
    switch (variant) {
      case 'operational':
      case 'connected':
      case 'enabled':
        return 'bg-success';
      case 'pending':
      case 'warning':
        return 'bg-warning';
      case 'error':
      case 'danger':
      case 'denied':
        return 'bg-critical';
      case 'inherited':
      case 'info':
        return 'bg-info';
      case 'disabled':
      default:
        return 'bg-[#6e747c]';
    }
  };

  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${getDotColor()} ${className}`} />;
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
      case 'connected':
      case 'enabled':
        return {
          bg: 'bg-success-soft',
          text: 'text-success-text',
          border: 'border-success-border',
        };
      case 'pending':
      case 'warning':
        return {
          bg: 'bg-warning-soft',
          text: 'text-warning-text',
          border: 'border-warning-border',
        };
      case 'error':
      case 'danger':
      case 'denied':
        return {
          bg: 'bg-critical-soft',
          text: 'text-critical-text',
          border: 'border-critical-border',
        };
      case 'inherited':
      case 'info':
        return {
          bg: 'bg-info-soft',
          text: 'text-info-text',
          border: 'border-info-border',
        };
      case 'disabled':
      default:
        return {
          bg: 'bg-[#121417]',
          text: 'text-[#949aa2]',
          border: 'border-[#1f2226]',
        };
    }
  };

  const colors = getColors();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border} select-none ${className}`}
    >
      {dot && <StatusDot variant={variant} />}
      <span>{status}</span>
    </span>
  );
}
