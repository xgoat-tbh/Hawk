'use client';
import React from 'react';
import type { DiscordRole } from '@/lib/discord';
import { HawkSelect, type HawkSelectProps } from './HawkSelect';
export interface RolePickerProps extends Pick<HawkSelectProps, 'placeholder' | 'disabled' | 'className' | 'label' | 'id' | 'loading' | 'error' | 'onRetry'> { roles: DiscordRole[]; value: string | null; onChange: (val: string | null) => void; }
export function RolePicker({ roles = [], value, onChange, placeholder = 'Select a role…', ...props }: RolePickerProps) {
  return <HawkSelect {...props} label={props.label || 'Role'} placeholder={placeholder} clearable value={value} onChange={v => onChange(v || null)} options={roles.map(r => ({ value: r.id, label: r.name, description: r.id, badge: r.managed ? 'Managed' : undefined, icon: <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#a5abb3' }}/> }))}/>;
}
