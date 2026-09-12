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
    <div className="relative overflow-hidden bg-[#0c0d10] border border-[#1a1d24] hover:border-[#262a33] rounded-xl p-5 transition-all duration-200 group">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#7d8590] uppercase tracking-wider">{title}</span>
        <div className="p-2.5 rounded-lg bg-[#14161b] border border-[#20242c] text-indigo-400 group-hover:text-indigo-300 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <div className="text-2xl font-bold text-[#f0f2f5] tracking-tight">{value}</div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#646b75]">{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
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
