'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { UserPicker } from '@/components/ui/UserPicker';
import { HawkSelect } from '@/components/ui/HawkSelect';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import {
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  HelpCircle,
  Search,
  Command as CommandIcon,
  Layers,
  Loader2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { DiscordRole } from '@/lib/discord';
import type {
  PermissionProfile,
  RolePolicy,
  UserOverride,
  SimulationResponse,
  CommandAccessEvaluation,
} from '@/lib/permissions';

interface AccessPreviewerProps {
  roles: DiscordRole[];
  profiles: PermissionProfile[];
  rolePolicies: RolePolicy[];
  userOverrides: UserOverride[];
}

export function AccessPreviewer({
  roles,
}: AccessPreviewerProps) {
  const { guildId } = useParams() as { guildId: string };

  const [targetType, setTargetType] = useState<'role' | 'user'>('role');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null);
  const [testUserId, setTestUserId] = useState('');
  const [isSuperAdminSim, setIsSuperAdminSim] = useState(false);

  // Sub-tab view: 'modules' | 'commands'
  const [activeSubTab, setActiveSubTab] = useState<'modules' | 'commands'>('commands');

  // Command filtering
  const [commandSearch, setCommandSearch] = useState('');
  const [commandFilter, setCommandFilter] = useState<'ALL' | 'ALLOWED' | 'DENIED' | 'OVERRIDDEN'>('ALL');

  // Inspected Item Explainer
  const [inspectedCommand, setInspectedCommand] = useState<CommandAccessEvaluation | null>(null);
  const [inspectedModule, setInspectedModule] = useState<string | null>(null);

  // Simulation API Data State
  const [simData, setSimData] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetTypeOptions = [
    { value: 'role', label: 'Preview by Role' },
    { value: 'user', label: 'Preview by User' },
  ];

  const targetId = targetType === 'role' ? selectedRoleId || '' : testUserId.trim();

  // Fetch simulation data whenever target or simulation settings change
  useEffect(() => {
    let isCurrent = true;

    async function fetchSimulation() {
      if (!guildId) return;

      setIsLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({
          targetType,
          targetId,
          simulateAdmin: String(isSuperAdminSim),
        });

        const res = await fetch(`/api/guilds/${guildId}/permissions/simulate?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch permission simulation');

        const data: SimulationResponse = await res.json();
        if (isCurrent) {
          setSimData(data);
          // If we had an inspected command, update it to latest evaluation
          if (inspectedCommand) {
            const updated = data.commands.find((c) => c.command === inspectedCommand.command);
            if (updated) setInspectedCommand(updated);
          }
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err.message || 'Error resolving permissions');
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchSimulation();

    return () => {
      isCurrent = false;
    };
  }, [guildId, targetType, targetId, isSuperAdminSim]);

  // Filter commands
  const filteredCommands = (simData?.commands || []).filter((cmd) => {
    const matchesSearch =
      cmd.command.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.category.toLowerCase().includes(commandSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (commandFilter === 'ALLOWED') return cmd.effectiveAccess === 'ALLOWED';
    if (commandFilter === 'DENIED') return cmd.effectiveAccess === 'DENIED';
    if (commandFilter === 'OVERRIDDEN') return cmd.hasOverride;

    return true;
  });

  const selectedModuleDetail = (simData?.modules || []).find((m) => m.module.module === inspectedModule);

  return (
    <div className="space-y-5">
      {/* Simulation Controls Header */}
      <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#a9adb2]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f1f2f3]">
              Access Simulator & Rule Explainer
            </h4>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-[#7e8389]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Resolving rules...</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-[#7e8389]">
          Simulate resolved dashboard visibility, bot command ACL overrides, and deterministic rule precedence.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-3">
            <HawkSelect
              options={targetTypeOptions}
              value={targetType}
              onChange={(val) => setTargetType(val as 'role' | 'user')}
              searchable={false}
            />
          </div>

          {targetType === 'role' ? (
            <div className="sm:col-span-6">
              <RolePicker
                roles={roles}
                value={selectedRoleId}
                onChange={setSelectedRoleId}
                placeholder="Select role to preview..."
              />
            </div>
          ) : (
            <div className="sm:col-span-6">
              <UserPicker
                value={testUserId}
                onChange={(id) => setTestUserId(id)}
                placeholder="Search or enter User ID..."
              />
            </div>
          )}

          <div className="sm:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs text-[#a9adb2] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSuperAdminSim}
                onChange={(e) => setIsSuperAdminSim(e.target.checked)}
                className="rounded border-[#24272b] bg-[#121417] text-white focus:ring-0"
              />
              <span>Simulate Bot Admin</span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center justify-between text-xs text-critical-text">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setSelectedRoleId(selectedRoleId);
            }}
            className="flex items-center gap-1 text-[11px] underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Overview Metric Summary Cards */}
      {simData && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#7e8389]">Accessible Modules</span>
            <div className="text-lg font-bold text-[#f1f2f3]">
              {simData.summary.accessibleModules} <span className="text-xs font-normal text-[#7e8389]">/ {simData.summary.totalModules}</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#7e8389]">Restricted Modules</span>
            <div className="text-lg font-bold text-[#a9adb2]">
              {simData.summary.restrictedModules}
            </div>
          </div>

          <div className="p-3 rounded-md bg-success-soft/30 border border-success-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-success-text">Commands Allowed</span>
            <div className="text-lg font-bold text-success-text">
              {simData.summary.allowedCommands} <span className="text-xs font-normal text-[#7e8389]">/ {simData.summary.totalCommands}</span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-critical-soft/30 border border-critical-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-critical-text">Commands Denied</span>
            <div className="text-lg font-bold text-critical-text">
              {simData.summary.deniedCommands}
            </div>
          </div>

          <div className="p-3 rounded-md bg-warning-soft/30 border border-warning-border space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono uppercase text-warning-text">Overrides Active</span>
            <div className="text-lg font-bold text-warning-text">
              {simData.summary.overriddenCommands}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#1c1f23] pb-px">
        <button
          type="button"
          onClick={() => setActiveSubTab('commands')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all ${
            activeSubTab === 'commands'
              ? 'border-[#f1f2f3] text-[#f1f2f3] font-semibold'
              : 'border-transparent text-[#7e8389] hover:text-[#f1f2f3]'
          }`}
        >
          <CommandIcon className="w-3.5 h-3.5" />
          <span>Bot Commands ({simData?.summary.allowedCommands ?? 0} allowed)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('modules')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all ${
            activeSubTab === 'modules'
              ? 'border-[#f1f2f3] text-[#f1f2f3] font-semibold'
              : 'border-transparent text-[#7e8389] hover:text-[#f1f2f3]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dashboard Modules ({simData?.summary.accessibleModules ?? 0} accessible)</span>
        </button>
      </div>

      {/* SECTION A: COMMAND ACCESS SIMULATION */}
      {activeSubTab === 'commands' && (
        <div className="space-y-4">
          {/* Command Search & Quick Filters */}
          <div className="p-3 rounded-md bg-[#0d0e10] border border-[#24272b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8389]" />
              <input
                type="text"
                placeholder="Search commands by name or description..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="glass-input pl-8 text-xs font-sans"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0a0b0d] p-0.5 rounded-md border border-[#24272b]">
              {(['ALL', 'ALLOWED', 'DENIED', 'OVERRIDDEN'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCommandFilter(filter)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    commandFilter === filter
                      ? 'bg-[#e6e8eb] text-[#0d0e10] shadow-clay-button font-semibold'
                      : 'text-[#7e8389] hover:text-[#f1f2f3]'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All'
                    : filter === 'ALLOWED'
                    ? 'Allowed'
                    : filter === 'DENIED'
                    ? 'Denied'
                    : 'Overrides'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Command Explanation Drawer */}
          {inspectedCommand && (
            <div className="p-4 rounded-md bg-[#121417] border border-[#2b2f34] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-info" />
                  <h5 className="text-xs font-semibold text-[#f1f2f3]">
                    Why Can / Can't {simData?.subject.name || 'This Role'} Use <span className="font-mono text-white">!{inspectedCommand.command}</span>?
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedCommand(null)}
                  className="text-[11px] text-[#7e8389] hover:text-[#f1f2f3]"
                >
                  Close Explainer
                </button>
              </div>

              {/* Effective Outcome Banner */}
              <div
                className={`p-3 rounded-md border flex items-center justify-between ${
                  inspectedCommand.effectiveAccess === 'ALLOWED'
                    ? 'bg-success-soft border-success-border text-success-text'
                    : 'bg-critical-soft border-critical-border text-critical-text'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  {inspectedCommand.effectiveAccess === 'ALLOWED' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold uppercase tracking-wider">
                      Effective Access: {inspectedCommand.effectiveAccess}
                    </span>
                    <p className="text-[11px] mt-0.5 opacity-90">{inspectedCommand.reason}</p>
                  </div>
                </div>

                {inspectedCommand.hasOverride && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning-soft border border-warning-border text-warning-text">
                    Custom Override Active
                  </span>
                )}
              </div>

              {/* Rule Chain Inspector */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-[#7e8389]">
                  Deterministic Rule Resolution Chain
                </span>

                <div className="space-y-1 text-xs">
                  {inspectedCommand.ruleChain.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-md border transition-all ${
                        step.isWinningRule
                          ? step.result === 'ALLOW'
                            ? 'bg-success-soft/50 border-success-border text-[#f1f2f3] ring-1 ring-success-border'
                            : 'bg-critical-soft/50 border-critical-border text-[#f1f2f3] ring-1 ring-critical-border'
                          : 'bg-[#0d0e10] border-[#24272b] text-[#7e8389]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className={step.isWinningRule ? 'font-semibold text-white' : 'text-[#a9adb2]'}>
                          {step.step}
                        </span>
                        <div className="flex items-center gap-2">
                          {step.isWinningRule && (
                            <span className="text-[9px] font-sans uppercase px-1.5 py-0.2 rounded bg-info-soft text-info border border-info-border">
                              Winning Rule
                            </span>
                          )}
                          <span
                            className={
                              step.result === 'ALLOW'
                                ? 'text-success-text font-bold'
                                : step.result === 'DENY'
                                ? 'text-critical-text font-bold'
                                : 'text-[#7e8389]'
                            }
                          >
                            {step.result}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#d5d7da] mt-1 leading-relaxed">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Commands Data Table */}
          <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
            <HawkScrollArea maxHeight="55vh">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                  <tr>
                    <th className="py-2.5 px-4">Command</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Access Decision</th>
                    <th className="py-2.5 px-4">Required Discord Perm</th>
                    <th className="py-2.5 px-4 text-right">Action / Explainer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1f23]">
                  {filteredCommands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#7e8389] text-xs">
                        No commands matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCommands.map((cmd) => {
                      const isAllowed = cmd.effectiveAccess === 'ALLOWED';
                      return (
                        <tr
                          key={cmd.command}
                          onClick={() => setInspectedCommand(cmd)}
                          className={`hover:bg-[#121417]/50 cursor-pointer transition-colors ${
                            inspectedCommand?.command === cmd.command ? 'bg-[#121417]' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-medium text-[#f1f2f3]">
                              !{cmd.command}
                            </div>
                            <div className="text-[10px] text-[#7e8389] truncate max-w-xs">{cmd.description}</div>
                          </td>

                          <td className="py-2.5 px-4 capitalize text-[#a9adb2]">
                            {cmd.category}
                          </td>

                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {isAllowed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-text bg-success-soft border border-success-border px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>ALLOWED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-critical-text bg-critical-soft border border-critical-border px-2 py-0.5 rounded">
                                  <XCircle className="w-3 h-3" />
                                  <span>DENIED</span>
                                </span>
                              )}
                              {cmd.hasOverride && (
                                <span className="text-[9px] font-mono text-warning-text bg-warning-soft border border-warning-border px-1.5 py-0.5 rounded">
                                  OVERRIDE
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-[#7e8389] font-mono text-[11px]">
                            {cmd.requiredDiscordPerm || 'None'}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedCommand(cmd);
                              }}
                              className="btn-outline-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                            >
                              <span>Why?</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
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
      )}

      {/* SECTION B: DASHBOARD MODULES SIMULATION */}
      {activeSubTab === 'modules' && (
        <div className="space-y-4">
          {/* Why Can / Can't Access Module Explainer Card */}
          {selectedModuleDetail && (
            <div className="p-4 rounded-md bg-[#121417] border border-[#2b2f34] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-info" />
                  <h5 className="text-xs font-semibold text-[#f1f2f3]">
                    Permission Breakdown: {selectedModuleDetail.module.label}
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedModule(null)}
                  className="text-[11px] text-[#7e8389] hover:text-[#f1f2f3]"
                >
                  Close Explainer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-[#0d0e10] border border-[#24272b] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#7e8389]">VIEW PERMISSION</span>
                    <span className={selectedModuleDetail.canView ? 'text-success-text font-bold' : 'text-critical-text font-bold'}>
                      {selectedModuleDetail.canView ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#d5d7da]">{selectedModuleDetail.viewReason}</p>
                </div>

                <div className="p-3 rounded bg-[#0d0e10] border border-[#24272b] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#7e8389]">MANAGE PERMISSION</span>
                    <span className={selectedModuleDetail.canManage ? 'text-success-text font-bold' : 'text-critical-text font-bold'}>
                      {selectedModuleDetail.canManage ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#d5d7da]">{selectedModuleDetail.manageReason}</p>
                </div>
              </div>

              {selectedModuleDetail.conflict && (
                <div className="p-2.5 rounded bg-warning-soft border border-warning-border flex items-center gap-2 text-xs text-warning-text">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedModuleDetail.conflict.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Simulation Results Split View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Granted Access Panel */}
            <div className="border border-success-border rounded-md bg-success-soft/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-success-text">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Accessible Modules ({simData?.modules.filter((m) => m.canView).length ?? 0})
                </span>
              </div>

              <HawkScrollArea maxHeight="350px" className="space-y-2 pr-1">
                {(simData?.modules || []).filter((m) => m.canView).length === 0 ? (
                  <div className="text-xs text-[#7e8389] p-3">No dashboard modules accessible.</div>
                ) : (
                  (simData?.modules || [])
                    .filter((m) => m.canView)
                    .map((item) => (
                      <div
                        key={item.module.module}
                        onClick={() => setInspectedModule(item.module.module)}
                        className={`p-2.5 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1 cursor-pointer hover:border-[#373b42] transition-colors ${
                          inspectedModule === item.module.module ? 'ring-1 ring-info' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#f1f2f3]">{item.module.label}</span>
                          <span className="text-[10px] font-mono text-success-text">
                            {item.canManage ? 'FULL MANAGE' : 'READ ONLY'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#7e8389]">{item.viewReason}</p>
                      </div>
                    ))
                )}
              </HawkScrollArea>
            </div>

            {/* Denied Access Panel */}
            <div className="border border-critical-border rounded-md bg-critical-soft/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-critical-text">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Restricted Modules ({simData?.modules.filter((m) => !m.canView).length ?? 0})
                </span>
              </div>

              <HawkScrollArea maxHeight="350px" className="space-y-2 pr-1">
                {(simData?.modules || []).filter((m) => !m.canView).length === 0 ? (
                  <div className="text-xs text-[#7e8389] p-3">No restricted modules. User has full server visibility.</div>
                ) : (
                  (simData?.modules || [])
                    .filter((m) => !m.canView)
                    .map((item) => (
                      <div
                        key={item.module.module}
                        onClick={() => setInspectedModule(item.module.module)}
                        className={`p-2.5 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1 cursor-pointer hover:border-[#373b42] transition-colors ${
                          inspectedModule === item.module.module ? 'ring-1 ring-info' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#a9adb2]">{item.module.label}</span>
                          <span className="text-[10px] font-mono text-critical-text">DENIED</span>
                        </div>
                        <p className="text-[10px] text-[#7e8389]">{item.viewReason}</p>
                      </div>
                    ))
                )}
              </HawkScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
