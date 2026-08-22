import { getDb } from '../pool.js';

export interface TelemetryRecord {
  guildId: string;
  userId: string;
  commandName: string;
  aliasUsed: string;
  rawContent: string;
  outcome: string;
}

export interface TelemetryStats {
  totalExecutions: number;
  topCommands: { commandName: string; count: number }[];
  topAliases: { alias: string; count: number }[];
  outcomesBreakdown: Record<string, number>;
  uniqueUsersCount: number;
}

const aiSuggestChannelCache = new Map<string, string | null>();

export async function recordTelemetry(record: TelemetryRecord): Promise<void> {
  const db = getDb();
  try {
    await db`
      INSERT INTO command_telemetry (guild_id, user_id, command_name, alias_used, raw_content, outcome)
      VALUES (${record.guildId}, ${record.userId}, ${record.commandName}, ${record.aliasUsed}, ${record.rawContent}, ${record.outcome})
    `;
  } catch (err: any) {
    if (err?.code === '42P01') {
      // Table doesn't exist yet, auto-heal
      await db`
        CREATE TABLE IF NOT EXISTS command_telemetry (
          id BIGSERIAL PRIMARY KEY,
          guild_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          command_name TEXT NOT NULL,
          alias_used TEXT NOT NULL,
          raw_content TEXT NOT NULL,
          outcome TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `.catch(() => {});
      await db`
        INSERT INTO command_telemetry (guild_id, user_id, command_name, alias_used, raw_content, outcome)
        VALUES (${record.guildId}, ${record.userId}, ${record.commandName}, ${record.aliasUsed}, ${record.rawContent}, ${record.outcome})
      `.catch(() => {});
    }
  }
}

export async function getTelemetryStats(guildId: string, days = 7): Promise<TelemetryStats> {
  const db = getDb();
  try {
    const rows = await db`
      SELECT command_name, alias_used, outcome, user_id
      FROM command_telemetry
      WHERE guild_id = ${guildId}
        AND created_at >= NOW() - (${days} || ' days')::INTERVAL
    `;

    const totalExecutions = rows.length;
    const cmdCounts = new Map<string, number>();
    const aliasCounts = new Map<string, number>();
    const outcomesBreakdown: Record<string, number> = {};
    const userSet = new Set<string>();

    for (const r of rows) {
      const c = r.command_name as string;
      const a = r.alias_used as string;
      const o = r.outcome as string;
      const u = r.user_id as string;

      cmdCounts.set(c, (cmdCounts.get(c) || 0) + 1);
      if (a && a !== c) {
        aliasCounts.set(a, (aliasCounts.get(a) || 0) + 1);
      }
      outcomesBreakdown[o] = (outcomesBreakdown[o] || 0) + 1;
      userSet.add(u);
    }

    const topCommands = Array.from(cmdCounts.entries())
      .map(([commandName, count]) => ({ commandName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topAliases = Array.from(aliasCounts.entries())
      .map(([alias, count]) => ({ alias, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalExecutions,
      topCommands,
      topAliases,
      outcomesBreakdown,
      uniqueUsersCount: userSet.size,
    };
  } catch {
    return {
      totalExecutions: 0,
      topCommands: [],
      topAliases: [],
      outcomesBreakdown: {},
      uniqueUsersCount: 0,
    };
  }
}

export async function getAiSuggestChannel(guildId: string): Promise<string | null> {
  const cached = aiSuggestChannelCache.get(guildId);
  if (cached !== undefined) return cached;

  try {
    const db = getDb();
    const rows = await db`SELECT ai_suggest_channel_id FROM guild_config WHERE guild_id = ${guildId}`.catch(async () => {
      await db`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS ai_suggest_channel_id TEXT`.catch(() => {});
      return await db`SELECT ai_suggest_channel_id FROM guild_config WHERE guild_id = ${guildId}`.catch(() => []);
    });
    const channelId = (rows[0]?.ai_suggest_channel_id as string) ?? null;
    aiSuggestChannelCache.set(guildId, channelId);
    return channelId;
  } catch {
    return null;
  }
}

export async function setAiSuggestChannel(guildId: string, channelId: string | null): Promise<void> {
  const db = getDb();
  try {
    await db`
      INSERT INTO guild_config (guild_id, ai_suggest_channel_id)
      VALUES (${guildId}, ${channelId})
      ON CONFLICT (guild_id)
      DO UPDATE SET ai_suggest_channel_id = ${channelId}, updated_at = NOW()
    `;
  } catch (err: any) {
    if (err?.message?.includes('ai_suggest_channel_id') || err?.code === '42703') {
      await db`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS ai_suggest_channel_id TEXT`.catch(() => {});
      await db`
        INSERT INTO guild_config (guild_id, ai_suggest_channel_id)
        VALUES (${guildId}, ${channelId})
        ON CONFLICT (guild_id)
        DO UPDATE SET ai_suggest_channel_id = ${channelId}, updated_at = NOW()
      `;
    } else {
      throw err;
    }
  }
  aiSuggestChannelCache.set(guildId, channelId);
}

export async function getAllGuildsWithAiSuggestChannel(): Promise<{ guildId: string; channelId: string }[]> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT guild_id, ai_suggest_channel_id
      FROM guild_config
      WHERE ai_suggest_channel_id IS NOT NULL AND ai_suggest_channel_id != ''
    `;
    return rows.map((r) => ({
      guildId: r.guild_id as string,
      channelId: r.ai_suggest_channel_id as string,
    }));
  } catch {
    return [];
  }
}
