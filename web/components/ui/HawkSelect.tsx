'use client';
import React, { useState, useMemo, useId } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { Command } from 'cmdk';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
export interface HawkSelectOption { value: string; label: string; description?: string; icon?: React.ReactNode; badge?: string; badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger'; group?: string; keywords?: string; disabled?: boolean; }
export interface HawkSelectProps {
  options: HawkSelectOption[]; value: string | null; onChange: (value: string) => void;
  placeholder?: string; searchable?: boolean; clearable?: boolean; disabled?: boolean; className?: string;
  label?: string; id?: string; loading?: boolean; error?: string | null; onRetry?: () => void;
  onSearchChange?: (query: string) => void;
  allowCustomId?: boolean; multiple?: boolean; values?: string[]; onValuesChange?: (values: string[]) => void;
}

export function HawkSelect({ options = [], value, onChange, placeholder = 'Select an option…', searchable = true, clearable = false, disabled = false, className = '', label, id, loading, error, onRetry, onSearchChange, allowCustomId, multiple, values = [], onValuesChange }: HawkSelectProps) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const uid = useId();
  const selected = options.find(o => o.value === value);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); const found = options.filter(o => `${o.label} ${o.description || ''} ${o.keywords || ''} ${o.value}`.toLowerCase().includes(q)); return allowCustomId && /^\d{17,20}$/.test(q) && !found.some(o => o.value === q) ? [{ value: q, label: q }, ...found] : found; }, [options, query, allowCustomId]);
  const text = multiple ? `${values.length} selected` : selected?.label || value || placeholder;
  const content = <><span className="truncate flex-1 text-left">{text}</span>{loading ? <Loader2 size={14} className="animate-spin"/> : <ChevronDown size={14}/>}</>;
  return <div className={`min-w-0 ${className}`}>
    <div className="flex gap-1 items-center">
    {!searchable && !multiple && !allowCustomId ? <Select.Root value={value || ''} onValueChange={onChange} disabled={disabled}><Select.Trigger id={id} aria-label={label || placeholder} className="hawk-select-trigger"><Select.Value placeholder={placeholder}/><Select.Icon><ChevronDown size={14}/></Select.Icon></Select.Trigger><Select.Portal><Select.Content position="popper" className="z-[80] bg-surface-3 border border-border rounded-lg shadow-xl max-h-80 min-w-[var(--radix-select-trigger-width)]"><Select.Viewport className="p-1">{options.filter(o => o.value).map(o => <Select.Item key={o.value} value={o.value} disabled={o.disabled} className="p-2 text-sm rounded outline-none data-[highlighted]:bg-surface-5 flex gap-2"><Select.ItemText>{o.label}</Select.ItemText><Select.ItemIndicator><Check size={14}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root> :
    <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (!next) { setQuery(''); onSearchChange?.(''); } }}><Popover.Trigger id={id} disabled={disabled} className="hawk-select-trigger" aria-label={label || placeholder}>{content}</Popover.Trigger><Popover.Portal><Popover.Content align="start" sideOffset={6} className="z-[80] w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[calc(100vw-24px)] rounded-lg border border-border bg-surface-3 shadow-xl overflow-hidden"><Command shouldFilter={false} label={label || placeholder}>
      {searchable && <Command.Input id={`${uid}-search`} value={query} onValueChange={q => { setQuery(q); onSearchChange?.(q); }} aria-label={`Search ${label || 'options'}`} placeholder="Search…" className="w-full bg-surface-2 border-b border-border p-3 text-sm outline-none"/>}
      <Command.List className="max-h-72 overflow-y-auto p-1" aria-multiselectable={multiple || undefined}>{loading && <div role="status" className="p-3 text-sm">Loading…</div>}{error && <div role="alert" className="p-3 text-critical-text">{error}{onRetry && <button onClick={onRetry} className="btn-secondary">Retry</button>}</div>}<Command.Empty className="p-4 text-xs text-text-muted">No matching options</Command.Empty>
      {filtered.map(o => <Command.Item key={o.value} value={o.value} disabled={o.disabled} aria-selected={multiple ? values.includes(o.value) : value === o.value} onSelect={() => { if (multiple) onValuesChange?.(values.includes(o.value) ? values.filter(v => v !== o.value) : [...values, o.value]); else { onChange(o.value); setOpen(false); setQuery(''); onSearchChange?.(''); } }} className="flex items-center gap-2 rounded p-2 cursor-pointer text-sm data-[selected=true]:bg-surface-5 data-[disabled=true]:opacity-40">{o.icon}<span className="flex-1 min-w-0"><span className="block truncate">{o.label}</span>{o.description && <span className="block truncate text-xs text-text-muted">{o.description}</span>}</span>{(multiple ? values.includes(o.value) : value === o.value) && <Check size={14}/>}</Command.Item>)}
      </Command.List></Command></Popover.Content></Popover.Portal></Popover.Root>}
      {clearable && value && <button disabled={disabled} type="button" aria-label={`Clear ${label || 'selection'}`} className="btn-ghost" onClick={() => onChange('')}><X size={14}/></button>}
    </div>
  </div>;
}
