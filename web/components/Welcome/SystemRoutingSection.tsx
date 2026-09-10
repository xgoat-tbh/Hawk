'use client';

import React from 'react';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Settings2 } from 'lucide-react';
import { WelcomeFormState } from './types';

interface SystemRoutingSectionProps {
  current: WelcomeFormState;
  channels: any[];
  setField: (field: keyof WelcomeFormState, value: any) => void;
}

export function SystemRoutingSection({
  current,
  channels,
  setField,
}: SystemRoutingSectionProps) {
  return (
    <div className="space-y-1" data-animate-section>
      <SectionHeader
        title="System Routing"
        description="Configure dispatch destination and activation state."
        icon={<Settings2 className="w-3.5 h-3.5 text-[#6e747c]" />}
      />

      <div className="pt-2">
        <SettingRow
          label="Enable Welcome Greetings"
          description="When enabled, Hawk will automatically post the greeting when a new user arrives."
          badge={current.enabled ? 'Active' : 'Disabled'}
          badgeVariant={current.enabled ? 'success' : 'neutral'}
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={current.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-[#1f2226]"></div>
          </label>
        </SettingRow>

        <SettingRow
          label="Target Welcome Channel"
          description="The text channel where welcome messages are dispatched."
          badge="Channel"
        >
          <div className="w-64">
            <ChannelPicker
              channels={channels}
              value={current.channelId}
              onChange={(val) => setField('channelId', val)}
              placeholder="Select welcome channel..."
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Direct Message (DM) Delivery"
          description="Send the greeting directly to the user's private messages in addition to the channel."
          badge="Optional"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={current.sendAsDm}
              onChange={(e) => setField('sendAsDm', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-[#1f2226]"></div>
          </label>
        </SettingRow>
      </div>
    </div>
  );
}
