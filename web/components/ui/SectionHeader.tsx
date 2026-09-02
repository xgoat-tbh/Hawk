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
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 pt-5 first:pt-0 border-b border-[#24272b] ${className}`}>
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f1f2f3] flex items-center gap-2">
          {icon && <span className="text-[#a9adb2]">{icon}</span>}
          <span>{title}</span>
        </h3>
        {description && <p className="text-[11px] text-[#7e8389]">{description}</p>}
      </div>

      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
