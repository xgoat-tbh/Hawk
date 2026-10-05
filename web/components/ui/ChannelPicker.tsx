'use client';
import React from 'react';
import { Hash, Volume2, Folder } from 'lucide-react';
import type { DiscordChannel } from '@/lib/discord';
import { HawkSelect, type HawkSelectProps } from './HawkSelect';
export interface ChannelPickerProps extends Pick<HawkSelectProps, 'placeholder' | 'disabled' | 'className' | 'label' | 'id' | 'loading' | 'error' | 'onRetry'> { channels: DiscordChannel[]; value: string | null; onChange: (val: string | null) => void; allowedTypes?: number[]; }
export function ChannelPicker({ channels = [], value, onChange, allowedTypes = [0, 5], placeholder = 'Select a channel…', ...props }: ChannelPickerProps) {
  const categories = new Map(channels.filter(c => c.type === 4).map(c => [c.id, c.name]));
  return <HawkSelect {...props} label={props.label || 'Channel'} placeholder={placeholder} value={value} clearable onChange={v => onChange(v || null)} options={channels.filter(c => allowedTypes.includes(c.type)).sort((a,b) => (a.parentId || '').localeCompare(b.parentId || '') || a.position - b.position).map(c => ({ value: c.id, label: c.name, group: c.parentId ? categories.get(c.parentId) : c.type === 4 ? 'Categories' : 'Uncategorized', description: c.id, icon: c.type === 4 ? <Folder size={14}/> : [2,13].includes(c.type) ? <Volume2 size={14}/> : <Hash size={14}/> }))}/>;
}
