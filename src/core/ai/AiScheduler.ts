import type { Client, GuildTextBasedChannel } from 'discord.js';
import { getAllGuildsWithAiSuggestChannel } from '../database/repositories/telemetryRepo.js';
import { generateAiServerInsights, buildAiReportComponentsV2 } from './AiAdvisorEngine.js';
import { consoleLog } from '../logging/ConsoleLogger.js';
import { logEvent } from '../logging/WebhookLogger.js';

let intervalTimer: ReturnType<typeof setInterval> | null = null;
let initialTimeout: ReturnType<typeof setTimeout> | null = null;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function runScheduledAiAnalysis(client: Client): Promise<void> {
  const configs = await getAllGuildsWithAiSuggestChannel();
  if (configs.length === 0) return;

  for (const { guildId, channelId } of configs) {
    try {
      const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
      if (!guild) continue;

      const channel = (guild.channels.cache.get(channelId) ||
        (await guild.channels.fetch(channelId).catch(() => null))) as GuildTextBasedChannel | null;
      if (!channel || !('send' in channel)) continue;

      const report = await generateAiServerInsights(guild);
      const payload = buildAiReportComponentsV2(report);

      await channel.send({
        components: payload.components,
        flags: payload.flags as any,
        allowedMentions: { parse: [], roles: [], users: [] },
      });

      logEvent('info', 'config_change', `Scheduled AI Server Insights posted for ${guild.name}`, {
        guild: guild.name,
        guildId: guild.id,
        suggestionsCount: report.suggestions.length,
      });
    } catch (err: any) {
      consoleLog('error', 'api_error', `Failed to run scheduled AI analysis for guild ${guildId}: ${err?.message || String(err)}`);
    }
  }
}

export function startAiScheduler(client: Client): void {
  if (intervalTimer) return;

  // Run initial check after 60s from startup, then every 24h
  initialTimeout = setTimeout(() => {
    runScheduledAiAnalysis(client).catch(() => {});
  }, 60_000);
  initialTimeout.unref();

  intervalTimer = setInterval(() => {
    runScheduledAiAnalysis(client).catch(() => {});
  }, TWENTY_FOUR_HOURS_MS);
  intervalTimer.unref();
}

export function stopAiScheduler(): void {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
