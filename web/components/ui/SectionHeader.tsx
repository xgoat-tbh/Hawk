'use client';

import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  icon,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 pt-6 first:pt-0 border-b border-white/[0.08] ${className}`}>
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
          {icon && <span className="text-white/60">{icon}</span>}
          <span>{title}</span>
        </h3>
        {description && <p className="text-[11px] text-white/40">{description}</p>}
      </div>

      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
