'use client';
import React from 'react';
import { Terminal } from 'lucide-react';
import { HawkSelect, type HawkSelectProps } from './HawkSelect';
export interface CommandItem { name: string; category?: string; description?: string; aliases?: string[]; module?: string; permissionState?: string; }
export interface CommandPickerProps extends Pick<HawkSelectProps, 'placeholder' | 'disabled' | 'className' | 'label'> { commands?: CommandItem[]; value: string | null; onChange: (val: string | null) => void; }
export function CommandPicker({ commands = [], value, onChange, placeholder = 'Select a command…', ...props }: CommandPickerProps) {
  return <HawkSelect {...props} label={props.label || 'Command'} placeholder={placeholder} clearable value={value} onChange={v => onChange(v || null)} options={commands.map(c => ({ value: c.name, label: c.name, description: c.description, group: c.category, badge: c.permissionState, keywords: c.aliases?.join(' '), icon: <Terminal size={14}/> }))}/>;
}
