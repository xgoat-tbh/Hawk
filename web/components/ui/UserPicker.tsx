'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMemberSearch } from '@/hooks/useMemberSearch';
import { HawkSelect, type HawkSelectProps } from './HawkSelect';
export interface UserOption { id: string; username: string; displayName?: string; avatar?: string | null; roleName?: string; }
export interface UserPickerProps extends Pick<HawkSelectProps, 'placeholder' | 'disabled' | 'className' | 'label' | 'loading' | 'error' | 'onRetry'> { value: string; onChange: (userId: string, userName?: string) => void; users?: UserOption[]; }
export function UserPicker({ value, onChange, users = [], placeholder = 'Search members or enter user ID…', ...props }: UserPickerProps) {
  const params = useParams();
  const [query, setQuery] = useState('');
  const remote = useMemberSearch(String(params?.guildId || ''), query);
  const mergedUsers = [...users, ...remote.users.filter(u => !users.some(v => v.id === u.id))];
  return <HawkSelect onSearchChange={setQuery} loading={remote.loading} error={remote.error} {...props} label={props.label || 'Discord user'} value={value} placeholder={placeholder} clearable allowCustomId onChange={v => { const user = mergedUsers.find(u => u.id === v); onChange(v, user?.displayName || user?.username); }} options={mergedUsers.map(u => ({ value: u.id, label: u.displayName || u.username, description: `${u.username} · ${u.id}`, badge: u.roleName, icon: u.avatar ? <img src={u.avatar.startsWith('http') ? u.avatar : `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=32`} alt="" className="w-6 h-6 rounded-full"/> : <span className="w-6 h-6 bg-surface-4 rounded-full text-xs flex items-center justify-center">{u.username[0]}</span> }))}/>;
}
