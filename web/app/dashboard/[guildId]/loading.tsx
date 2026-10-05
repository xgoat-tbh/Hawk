import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function GuildDashboardLoading() {
  return (
    <div className="space-y-7 animate-in fade-in-50 duration-200">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="w-44 h-7" />
          <Skeleton className="w-80 h-4" />
        </div>
        <Skeleton className="w-24 h-9 rounded-lg" />
      </div>

      {/* Guild Banner Skeleton */}
      <section className="flex flex-col sm:flex-row gap-5 sm:items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-36 h-5" />
            <Skeleton className="w-24 h-3.5" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-32 h-9 rounded-lg" />
          <Skeleton className="w-32 h-9 rounded-lg" />
        </div>
      </section>

      {/* Health Bar Skeleton */}
      <div className="flex flex-wrap gap-4 items-center">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="w-28 h-4" />
        <Skeleton className="w-20 h-5 rounded-full" />
        <Skeleton className="w-36 h-4" />
        <Skeleton className="w-40 h-4 sm:ml-auto" />
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card p-5 space-y-3">
            <Skeleton className="w-24 h-3.5" />
            <Skeleton className="w-28 h-8 rounded" />
            <Skeleton className="w-32 h-3" />
          </div>
        ))}
      </div>

      {/* Activity Chart & Recent Activity Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-surface-1/40 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-20 h-3.5" />
          </div>
          <Skeleton className="w-full h-64 rounded-lg" />
        </div>

        <div className="p-6 rounded-xl border border-border bg-surface-1/40 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-16 h-3.5" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/40">
                <Skeleton className="w-16 h-3.5" />
                <Skeleton className="w-24 h-3.5" />
                <Skeleton className="w-20 h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
