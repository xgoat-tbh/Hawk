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

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#0c0d10] border border-black/[0.06] dark:border-[#1a1d24] hover:border-black/[0.12] dark:hover:border-[#262a33] rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm group">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">{title}</span>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#14161b] border border-black/[0.04] dark:border-[#20242c] text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-all">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <div className="text-2xl font-extrabold text-[#101217] dark:text-[#f0f2f5] tracking-tight">{value}</div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#64748b] dark:text-[#8c949e] font-medium">{subtitle}</span>}
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
