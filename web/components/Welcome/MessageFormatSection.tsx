'use client';

import React from 'react';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AlignLeft, Sparkles } from 'lucide-react';
import { WelcomeFormState, COLOR_PRESETS, VARIABLE_TOKENS } from './types';

interface MessageFormatSectionProps {
  current: WelcomeFormState;
  setField: (field: keyof WelcomeFormState, value: any) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  insertToken: (token: string) => void;
}

export function MessageFormatSection({
  current,
  setField,
  textareaRef,
  insertToken,
}: MessageFormatSectionProps) {
  return (
    <div className="space-y-1" data-animate-section>
      <SectionHeader
        title="Message Format & Content"
        description="Customize the text body and visual styling of the greeting."
        icon={<AlignLeft className="w-3.5 h-3.5 text-[#6e747c]" />}
      />

      <div className="pt-2">
        <SettingRow
          label="Message Presentation"
          description="Display as an authentic Discord Rich Embed or standard text message."
        >
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a0b0d] p-0.5 rounded-md border border-black/[0.08] dark:border-[#1f2226]">
            <button
              type="button"
              onClick={() => setField('isEmbed', true)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                current.isEmbed
                  ? 'bg-white dark:bg-[#17191c] text-[#101217] dark:text-[#ededed] shadow-xs'
                  : 'text-slate-500 dark:text-[#6e747c] hover:text-black dark:hover:text-[#ededed]'
              }`}
            >
              Rich Embed
            </button>
            <button
              type="button"
              onClick={() => setField('isEmbed', false)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                !current.isEmbed
                  ? 'bg-white dark:bg-[#17191c] text-[#101217] dark:text-[#ededed] shadow-xs'
                  : 'text-slate-500 dark:text-[#6e747c] hover:text-black dark:hover:text-[#ededed]'
              }`}
            >
              Plain Text
            </button>
          </div>
        </SettingRow>

        {current.isEmbed && (
          <SettingRow
            label="Embed Title"
            description="Top title line displayed in bold."
          >
            <input
              type="text"
              value={current.title}
              maxLength={256}
              onChange={(e) => setField('title', e.target.value)}
              className="glass-input text-xs w-64"
              placeholder="Welcome to {server}!"
            />
          </SettingRow>
        )}

        {/* Message Textarea with Token Injection */}
        <div className="py-3 border-b border-black/[0.06] dark:border-[#17191c] space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-[#101217] dark:text-[#ededed]">
                {current.isEmbed ? 'Embed Description' : 'Message Body'}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-[#6e747c]">
                Supports Markdown: **bold**, *italic*, `code`, and variable tokens.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-[#6e747c]">
              {current.description.length} / {current.isEmbed ? '4096' : '2000'}
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={current.description}
            maxLength={current.isEmbed ? 4096 : 2000}
            rows={4}
            onChange={(e) => setField('description', e.target.value)}
            className="glass-input font-mono text-xs w-full resize-y min-h-[90px]"
            placeholder="Hey {user}, welcome to {server}! Check out #rules..."
          />

          {/* Variable Tokens Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-[#6e747c]">
              <Sparkles className="w-3 h-3 text-warning" />
              <span>Click a variable to insert into editor:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_TOKENS.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertToken(v.token)}
                  title={v.desc}
                  className="px-2 py-1 rounded bg-slate-50 dark:bg-[#121417] border border-black/[0.08] dark:border-[#1f2226] hover:border-black/[0.15] dark:hover:border-[#2a2d33] hover:bg-slate-100 dark:hover:bg-[#17191c] active:translate-y-[0.5px] text-[11px] font-mono text-[#101217] dark:text-[#ededed] flex items-center gap-1 transition-all shadow-xs"
                >
                  <span className="text-emerald-600 dark:text-success">{v.token}</span>
                  <span className="text-[9px] text-slate-400 dark:text-[#6e747c]">({v.label})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embed Visual Customization */}
        {current.isEmbed && (
          <>
            <SettingRow
              label="Accent Border Color"
              description="Left colored strip displayed on the Discord embed card."
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setField('color', p.hex)}
                      title={p.name}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        current.color.toLowerCase() === p.hex.toLowerCase()
                          ? 'scale-125 border-white ring-1 ring-white/50'
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: p.hex }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={current.color}
                  maxLength={7}
                  onChange={(e) => setField('color', e.target.value)}
                  className="glass-input font-mono text-xs w-20 text-center"
                  placeholder="#5865f2"
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Thumbnail Image URL"
              description="Small image on the top right. Use {user.avatar} for member avatar."
            >
              <input
                type="text"
                value={current.thumbnailUrl}
                onChange={(e) => setField('thumbnailUrl', e.target.value)}
                className="glass-input text-xs w-64 font-mono"
                placeholder="{user.avatar} or https://..."
              />
            </SettingRow>

            <SettingRow
              label="Large Banner Image URL"
              description="Wide image banner displayed at the bottom of the embed."
            >
              <input
                type="text"
                value={current.imageUrl}
                onChange={(e) => setField('imageUrl', e.target.value)}
                className="glass-input text-xs w-64 font-mono"
                placeholder="https://..."
              />
            </SettingRow>

            <SettingRow
              label="Footer Text"
              description="Small footer caption at the bottom of the embed."
            >
              <input
                type="text"
                value={current.footerText}
                maxLength={2048}
                onChange={(e) => setField('footerText', e.target.value)}
                className="glass-input text-xs w-64"
                placeholder="Member #{server.count}"
              />
            </SettingRow>
          </>
        )}
      </div>
    </div>
  );
}
