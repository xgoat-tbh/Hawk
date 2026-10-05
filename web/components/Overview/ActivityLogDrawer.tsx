'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { X, Clock, UserCheck, Award, Radio, ShoppingBag, Zap, MessageSquare } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogDrawer({ isOpen, onClose }: ActivityLogDrawerProps) {
  const { guildId } = useGuildData();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/guilds/${guildId}/activity?type=${filter}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch (err) {
        console.error('Failed to load activity log:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [isOpen, filter, guildId]);

  if (!isOpen) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <UserCheck className="w-4 h-4 text-sky-500" />;
      case 'role_reward':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'voice_create':
        return <Radio className="w-4 h-4 text-blue-500" />;
      case 'store_purchase':
        return <ShoppingBag className="w-4 h-4 text-pink-500" />;
      case 'streak_reward':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const filters = [
    { id: 'all', label: 'All Activity' },
    { id: 'welcome', label: 'Welcome' },
    { id: 'role_reward', label: 'Roles' },
    { id: 'voice_create', label: 'Voice' },
    { id: 'store_purchase', label: 'Store' },
    { id: 'streak_reward', label: 'Streak & XP' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-white dark:bg-[#0e1013] border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary">Server Activity History</h3>
              <p className="text-[11px] text-text-muted dark:text-text-muted">Live event stream and audit trail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-black/[0.04] dark:border-white/[0.04] overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-[#101217] text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-text-muted dark:text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-text-muted">
              Loading event feed...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-1">
              <div className="text-xs font-semibold text-text-primary dark:text-text-primary">No events recorded</div>
              <div className="text-[11px] text-text-muted">Events will appear here as members interact with the bot.</div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1b1e25] border border-black/[0.05] dark:border-white/[0.05] flex items-center justify-center shrink-0">
                    {getEventIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text-primary dark:text-text-primary truncate">
                      {item.type === 'welcome'
                        ? 'Welcome message sent'
                        : item.type === 'role_reward'
                        ? 'Role reward claimed'
                        : item.type === 'voice_create'
                        ? 'Voice room created'
                        : item.type === 'store_purchase'
                        ? 'Store purchase completed'
                        : item.type === 'streak_reward'
                        ? 'Streak reward given'
                        : item.type === 'message'
                        ? 'Channel message posted'
                        : 'Server Event'}
                    </div>
                    <div className="text-[11px] text-text-muted dark:text-text-muted truncate">
                      <span className="font-medium text-text-primary dark:text-text-secondary">{item.actorName}</span>{' '}
                      {item.targetName}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-sans text-text-muted shrink-0 whitespace-nowrap">
                  {item.relativeTime}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
