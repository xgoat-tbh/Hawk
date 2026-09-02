'use client';

import React from 'react';

interface DiscordEmbedSimulatorProps {
  title?: string;
  description?: string;
  color?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  footerText?: string | null;
  serverName?: string;
  memberCount?: number;
}

export function DiscordEmbedSimulator({
  title = 'Welcome to {server}!',
  description = 'Hey {user}, welcome! Check out the rules.',
  color = '#5865F2',
  imageUrl,
  thumbnailUrl,
  footerText = 'Member #{server.count}',
  serverName = 'Hawk Community',
  memberCount = 1250,
}: DiscordEmbedSimulatorProps) {
  // Replace placeholders for simulation
  const replaceTags = (text: string) => {
    return text
      .replace(/\{user\}/g, '@Yoshii')
      .replace(/\{user\.mention\}/g, '@Yoshii')
      .replace(/\{user\.name\}/g, 'Yoshii')
      .replace(/\{server\}/g, serverName)
      .replace(/\{server\.name\}/g, serverName)
      .replace(/\{server\.count\}/g, memberCount.toLocaleString());
  };

  const formattedTitle = replaceTags(title);
  const formattedDescription = replaceTags(description);
  const formattedFooter = footerText ? replaceTags(footerText) : null;

  return (
    <div className="bg-[#313338] rounded-2xl p-4 text-white max-w-xl font-sans text-sm shadow-xl border border-white/5 select-none">
      {/* Bot Message Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          H
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white hover:underline cursor-pointer">Hawk</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">
              BOT
            </span>
            <span className="text-xs text-[#949ba4]">Today at 12:00 PM</span>
          </div>

          {/* Embed Container */}
          <div
            className="mt-2 rounded-lg bg-[#2b2d31] p-4 flex gap-4 border-l-4 transition-colors max-w-lg"
            style={{ borderLeftColor: color || '#5865F2' }}
          >
            <div className="flex-1 space-y-2 overflow-hidden">
              {/* Title */}
              {formattedTitle && (
                <div className="font-bold text-base text-white hover:underline cursor-pointer">
                  {formattedTitle}
                </div>
              )}

              {/* Description */}
              {formattedDescription && (
                <div className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                  {formattedDescription}
                </div>
              )}

              {/* Image Banner */}
              {imageUrl && (
                <div className="pt-2">
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    className="rounded-lg max-h-48 w-full object-cover border border-white/5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Footer */}
              {formattedFooter && (
                <div className="text-xs text-[#949ba4] pt-2 flex items-center gap-1.5 border-t border-white/5 mt-3">
                  <span>{formattedFooter}</span>
                </div>
              )}
            </div>

            {/* Thumbnail */}
            {thumbnailUrl && (
              <div className="w-16 h-16 rounded-lg bg-surface flex-shrink-0 overflow-hidden border border-white/10">
                <img
                  src={thumbnailUrl === '{user.avatar}' ? 'https://cdn.discordapp.com/embed/avatars/0.png' : thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
