'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { AuditEvent } from '@/lib/audit';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HawkSelect } from '@/components/ui/HawkSelect';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
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

  const moduleOptions = [
    { value: 'ALL', label: 'All Modules' },
    { value: 'permissions', label: 'Permissions' },
    { value: 'economy', label: 'Economy' },
    { value: 'store', label: 'Store' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'general', label: 'General' },
  ];

  const severityOptions = [
    { value: 'ALL', label: 'All Severities' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedModule !== 'ALL') params.append('module', selectedModule);
        if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
        if (search.trim()) params.append('q', search.trim());

        const res = await apiFetch(`/api/guilds/${guildId}/audit?${params.toString()}`);
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
      <div className="p-3.5 rounded-md bg-white dark:bg-panel border border-black/[0.08] dark:border-border-strong shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted" />
          <input
            type="text"
            placeholder="Search actions, users, targets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input pl-8 text-xs font-sans text-text-primary dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <HawkSelect
              options={moduleOptions}
              value={selectedModule}
              onChange={setSelectedModule}
              searchable={false}
            />
          </div>

          <div className="w-36">
            <HawkSelect
              options={severityOptions}
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              searchable={false}
            />
          </div>
        </div>
      </div>

      {/* Audit Log Data Table with HawkScrollArea */}
      <div className="border border-black/[0.08] dark:border-border-strong rounded-md overflow-hidden bg-white dark:bg-panel">
        <HawkScrollArea maxHeight="50vh">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-surface-0 border-b border-black/[0.08] dark:border-[#1c1f23] text-[10px] font-sans uppercase tracking-wider text-text-muted dark:text-text-muted">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Action & Scope</th>
                <th className="py-2.5 px-4">Value Changes</th>
                <th className="py-2.5 px-4 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.08] dark:divide-[#1c1f23]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-muted dark:text-text-muted text-xs">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-muted dark:text-text-muted text-xs">
                    No security audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-surface-3/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] font-sans text-text-muted dark:text-text-secondary">
                          <Clock className="w-3 h-3 text-text-muted dark:text-text-muted" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-text-muted dark:text-text-muted" />
                          <span className="font-medium text-text-primary dark:text-text-primary">{log.userName}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-text-primary dark:text-text-primary">{log.action}</div>
                          <div className="text-[10px] font-sans text-text-muted dark:text-text-muted uppercase">
                            Module: {log.module} {log.target ? `• Target: ${log.target}` : ''}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 max-w-xs">
                        {log.previousValue || log.newValue ? (
                          <div className="text-[11px] font-sans text-text-muted dark:text-text-secondary space-y-0.5 truncate">
                            {log.previousValue && (
                              <div className="text-text-muted dark:text-text-muted line-through truncate">
                                {log.previousValue}
                              </div>
                            )}
                            {log.newValue && (
                              <div className="text-success-text truncate">
                                → {log.newValue}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted dark:text-text-secondary font-sans text-xs">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right">
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
        </HawkScrollArea>
      </div>
    </div>
  );
}
