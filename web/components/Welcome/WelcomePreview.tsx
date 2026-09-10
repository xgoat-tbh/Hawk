'use client';

import React from 'react';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { WelcomeFormState } from './types';

interface WelcomePreviewProps {
  current: WelcomeFormState;
  guildName?: string;
  botUsername?: string;
  botAvatarUrl?: string | null;
}

export function WelcomePreview({
  current,
  guildName = 'Discord Server',
  botUsername = 'Hawk',
  botAvatarUrl = null,
}: WelcomePreviewProps) {
  return (
    <div className="lg:col-span-5 sticky top-20 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ededed]">
            Live Discord Preview
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        </div>
        <span className="text-[10px] font-mono text-[#6e747c]">Simulated Output</span>
      </div>

      <div className="rounded-lg overflow-hidden border border-[#1f2226] shadow-2xl bg-[#313338]">
        <DiscordEmbedSimulator
          isEmbed={current.isEmbed}
          title={current.title}
          description={current.description}
          color={current.color}
          thumbnailUrl={
            current.thumbnailUrl === '{user.avatar}'
              ? 'https://cdn.discordapp.com/embed/avatars/0.png'
              : current.thumbnailUrl
          }
          imageUrl={current.imageUrl || null}
          footerText={current.footerText}
          serverName={guildName}
          memberCount={1250}
          botName={botUsername}
          botAvatarUrl={botAvatarUrl}
        />
      </div>

      <p className="text-[10px] text-[#6e747c] px-1 text-center font-mono">
        Preview renders Discord Markdown, custom emojis, and live variable interpolation.
      </p>
    </div>
  );
}
