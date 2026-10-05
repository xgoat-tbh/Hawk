import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardHubLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      {/* Navbar Placeholder */}
      <header className="h-14 border-b border-border bg-surface-1/50 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-32 h-8 rounded-md" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="border-b border-surface-3 pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-36 h-5" />
            <Skeleton className="w-6 h-4 rounded" />
          </div>
          <Skeleton className="w-72 h-3.5 mt-2" />
        </div>

        {/* Server Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-border bg-surface-1/60 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
                <Skeleton className="w-16 h-5 rounded-full" />
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-border/50">
                <Skeleton className="w-24 h-3.5" />
                <Skeleton className="w-28 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
