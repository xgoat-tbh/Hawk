'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badge?: string;
}

function StatCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
}: StatCardProps) {
  return (
    <div role="status" className="relative overflow-hidden bg-white dark:bg-surface-1 border border-black/[0.06] dark:border-border hover:border-black/[0.12] dark:hover:border-[#262a33] rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm group">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-text-muted dark:text-text-muted uppercase tracking-wider">{title}</span>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#14161b] border border-black/[0.04] dark:border-border text-info-text dark:text-info-text group-hover:scale-105 transition-all">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <div className="text-2xl font-extrabold text-text-primary dark:text-text-primary tracking-tight">{value}</div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-info-text dark:text-info-text border border-indigo-500/20">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && <span className="text-text-muted dark:text-text-secondary font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const StatCard = React.memo(StatCardComponent);
