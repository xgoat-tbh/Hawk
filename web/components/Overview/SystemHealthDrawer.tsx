'use client';

import React from 'react';
import { X, Activity, Server, Cpu, HardDrive, Radio, CheckCircle2 } from 'lucide-react';

interface SystemHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  health: {
    cpu: number;
    memory: number;
    gateway: number;
    uptime: string;
    status: string;
  };
}

export function SystemHealthDrawer({ isOpen, onClose, health }: SystemHealthDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-white dark:bg-[#0e1013] border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary">System Health & Diagnostics</h3>
              <p className="text-[11px] text-text-muted dark:text-text-muted">Live bot cluster and runtime metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Operational Banner */}
          <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">All Shards Operational</h4>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70">
                Connected to Discord Gateway with 0 dropped websocket frames.
              </p>
            </div>
          </div>

          {/* Detailed Metric Cards */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="text-xs font-medium text-text-primary dark:text-text-primary">CPU Utilization</div>
                  <div className="text-[10px] text-text-muted dark:text-text-muted">Process scheduler load</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-sans text-text-primary dark:text-text-primary">{health.cpu}%</div>
                <div className="w-20 h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${health.cpu}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-sky-500" />
                <div>
                  <div className="text-xs font-medium text-text-primary dark:text-text-primary">Memory Heap</div>
                  <div className="text-[10px] text-text-muted dark:text-text-muted">V8 runtime allocated memory</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-sans text-text-primary dark:text-text-primary">{health.memory}%</div>
                <div className="w-20 h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${health.memory}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="text-xs font-medium text-text-primary dark:text-text-primary">Gateway Latency</div>
                  <div className="text-[10px] text-text-muted dark:text-text-muted">WebSocket heartbeat ping</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-sans text-text-primary dark:text-text-primary">{health.gateway}ms</div>
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-sans text-emerald-500 bg-emerald-500/10 rounded mt-0.5">
                  Excellent
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-xs font-medium text-text-primary dark:text-text-primary">Cluster Uptime</div>
                  <div className="text-[10px] text-text-muted dark:text-text-muted">Service SLA compliance</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-sans text-text-primary dark:text-text-primary">{health.uptime}</div>
                <span className="text-[10px] text-text-muted dark:text-text-muted">Continuous</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
