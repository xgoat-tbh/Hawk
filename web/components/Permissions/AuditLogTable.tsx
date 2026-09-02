'use client';

import React, { useState, useEffect } from 'react';
import { AuditEvent } from '@/lib/audit';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search, Clock, User } from 'lucide-react';

interface AuditLogTableProps {
  guildId: string;
}

export function AuditLogTable({ guildId }: AuditLogTableProps) {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedModule !== 'ALL') params.append('module', selectedModule);
        if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
        if (search.trim()) params.append('q', search.trim());

        const res = await fetch(`/api/guilds/${guildId}/audit?${params.toString()}`);
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadLogs();
    }, 200);

    return () => clearTimeout(timer);
  }, [guildId, search, selectedModule, selectedSeverity]);

  const getSeverityVariant = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'danger';
      case 'WARNING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Toolbar */}
      <div className="p-3.5 rounded-xl bg-[#08080a] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search audit actions, users, targets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input pl-8 text-xs font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="glass-input text-xs font-sans w-36"
          >
            <option value="ALL" className="bg-[#0a0a0c] text-white">All Modules</option>
            <option value="permissions" className="bg-[#0a0a0c] text-white">Permissions</option>
            <option value="economy" className="bg-[#0a0a0c] text-white">Economy</option>
            <option value="store" className="bg-[#0a0a0c] text-white">Store</option>
            <option value="welcome" className="bg-[#0a0a0c] text-white">Welcome</option>
            <option value="general" className="bg-[#0a0a0c] text-white">General</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="glass-input text-xs font-sans w-32"
          >
            <option value="ALL" className="bg-[#0a0a0c] text-white">All Severities</option>
            <option value="INFO" className="bg-[#0a0a0c] text-white">Info</option>
            <option value="WARNING" className="bg-[#0a0a0c] text-white">Warning</option>
            <option value="CRITICAL" className="bg-[#0a0a0c] text-white">Critical</option>
          </select>
        </div>
      </div>

      {/* Audit Log Data Table (with Independent Internal Scroll Container) */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action & Scope</th>
                <th className="py-3 px-4">Value Changes</th>
                <th className="py-3 px-4 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-white/30 text-xs">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-white/30 text-xs">
                    No security audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/50">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-white/40" />
                          <span className="font-medium text-white">{log.userName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-white">{log.action}</div>
                          <div className="text-[10px] font-mono text-white/40 uppercase">
                            Module: {log.module} {log.target ? `• Target: ${log.target}` : ''}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {log.previousValue || log.newValue ? (
                          <div className="text-[11px] font-mono text-white/70 space-y-0.5 truncate">
                            {log.previousValue && (
                              <div className="text-white/40 line-through truncate">
                                {log.previousValue}
                              </div>
                            )}
                            {log.newValue && (
                              <div className="text-emerald-400 truncate">
                                → {log.newValue}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/20 font-mono text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <StatusBadge
                          status={log.severity}
                          variant={getSeverityVariant(log.severity)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
