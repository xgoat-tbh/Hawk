'use client';

import React from 'react';

interface DiscordEmbedSimulatorProps {
  isEmbed?: boolean;
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
  isEmbed = true,
  title = 'Welcome to {server}!',
  description = 'Hey {user}, welcome! Check out the rules.',
  color = '#ffffff',
  imageUrl,
  thumbnailUrl,
  footerText = 'Member #{server.count}',
  serverName = 'Discord Server',
  memberCount = 1250,
}: DiscordEmbedSimulatorProps) {
  const currentServer = serverName || 'Discord Server';

  // Replace placeholders for simulation
  const replaceTags = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\{user\}/gi, '@Member')
      .replace(/\{usermention\}/gi, '@Member')
      .replace(/\{username\}/gi, 'Member')
      .replace(/\{usertag\}/gi, 'Member#0001')
      .replace(/\{servername\}/gi, currentServer)
      .replace(/\{server\}/gi, currentServer)
      .replace(/\{server\.name\}/gi, currentServer)
      .replace(/\{server\.count\}/gi, memberCount.toLocaleString())
      .replace(/\{servermember\}/gi, memberCount.toLocaleString())
      .replace(/\{servercount\}/gi, memberCount.toLocaleString())
      .replace(/\{randomuser\}/gi, '@ActiveMember');
  };

  const formattedTitle = replaceTags(title);
  const rawDescription = replaceTags(description);
  const formattedFooter = footerText ? replaceTags(footerText) : null;

  // Discord markdown + custom emoji parser for authentic preview
  const renderContent = (text: string) => {
    if (!text) return null;

    const regex = /(<a?:[a-zA-Z0-9_]+:[0-9]+>|\*\*.*?\*\*|\*.*?\*|@\w+|#[a-zA-Z0-9_-]+|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // 1. Custom Discord Emoji: <:name:id> or <a:name:id>
      const emojiMatch = part.match(/^<(a)?:([a-zA-Z0-9_]+):([0-9]+)>$/);
      if (emojiMatch) {
        const isAnimated = Boolean(emojiMatch[1]);
        const emojiName = emojiMatch[2];
        const emojiId = emojiMatch[3];
        const ext = isAnimated ? 'gif' : 'png';
        return (
          <img
            key={index}
            src={`https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=48&quality=lossless`}
            alt={emojiName}
            title={`:${emojiName}:`}
            className="inline-block w-5 h-5 align-text-bottom mx-0.5 object-contain"
            loading="lazy"
          />
        );
      }

      // 2. Bold: **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }

      // 3. Italic: *text*
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        return <em key={index} className="italic text-white/90">{part.slice(1, -1)}</em>;
      }

      // 4. Inline Code: `text`
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={index} className="bg-[#1e1f22] px-1.5 py-0.5 rounded text-xs font-mono text-[#e0e1e5]">
            {part.slice(1, -1)}
          </code>
        );
      }

      // 5. Mention: @name
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-white/10 text-white font-medium px-1 rounded hover:bg-white/20 transition-colors">
            {part}
          </span>
        );
      }

      // 6. Channel: #channel
      if (part.startsWith('#')) {
        return (
          <span key={index} className="bg-white/10 text-white/80 font-medium px-1 rounded hover:bg-white/20 transition-colors">
            {part}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-[#313338] rounded-xl p-4 text-white max-w-xl font-sans text-sm border border-white/[0.08] select-none shadow-xl">
      {/* Bot Message Header */}
      <div className="flex items-start gap-3">
        {/* Bot Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#1e1f22] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden ring-1 ring-white/10">
          <img
            src="https://cdn.discordapp.com/embed/avatars/0.png"
            alt="Hawk Avatar"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Header Info */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-medium text-white text-sm hover:underline cursor-pointer">
              Hawk
            </span>
            <span className="bg-white/20 text-white text-[9px] font-bold px-1 py-0.5 rounded-[3px] uppercase tracking-wider flex items-center gap-0.5">
              <span>✓</span>
              <span>BOT</span>
            </span>
            <span className="text-[11px] text-[#949ba4] ml-1.5">Today at 12:00 PM</span>
          </div>

          {/* Plain Text Mode (No Embed) */}
          {!isEmbed ? (
            <div className="mt-2 text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
              {renderContent(rawDescription)}
            </div>
          ) : (
            /* Rich Embed Container */
            <div
              className="mt-2.5 rounded-lg bg-[#2b2d31] p-4 flex gap-4 border-l-4 transition-colors max-w-lg"
              style={{ borderLeftColor: color || '#ffffff' }}
            >
              <div className="flex-1 space-y-2 overflow-hidden">
                {/* Embed Title */}
                {formattedTitle && (
                  <div className="font-semibold text-sm text-white hover:underline cursor-pointer">
                    {formattedTitle}
                  </div>
                )}

                {/* Embed Description */}
                {rawDescription && (
                  <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                    {renderContent(rawDescription)}
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
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                {formattedFooter && (
                  <div className="text-[11px] text-[#949ba4] pt-2 flex items-center gap-1.5 border-t border-white/[0.06] mt-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center text-[8px] text-white font-bold">
                      H
                    </div>
                    <span>{formattedFooter}</span>
                    <span className="text-white/20">•</span>
                    <span>Today at 12:00 PM</span>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              {thumbnailUrl && (
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-lg bg-[#1e1f22] overflow-hidden border border-white/5 flex items-center justify-center">
                    <img
                      src={thumbnailUrl.includes('{user.avatar}') ? 'https://cdn.discordapp.com/embed/avatars/1.png' : thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/1.png';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}