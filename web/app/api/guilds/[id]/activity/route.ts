import { NextRequest, NextResponse } from 'next/server';
import { getSession, canViewGuild } from '@/lib/auth';
import { db, ensureDatabaseSchema } from '@/lib/db';

export interface ActivityConsoleEntry {
  id: string;
  timestamp: string;
  time: string;
  timeFormatted: string;
  eventType: string;
  rawType: string;
  tag: string;
  tagColor: string;
  tagClass: string;
  description: string;
  relativeTime: string;
  actorName: string;
  targetName: string;
  details: Record<string, any>;
  sourceTable: 'activity_log' | 'economy_audit_log';
}

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
  return `${Math.round(diffMins / 1440)}d ago`;
}

function resolveConsoleTag(typeOrAction: string): {
  tag: string;
  tagColor: string;
  tagClass: string;
  eventType: string;
} {
  const t = (typeOrAction || '').toLowerCase();

  // 1. 'bot_ready' or 'system' → [READV]
  if (t === 'bot_ready' || t === 'system' || t.includes('ready')) {
    return {
      tag: '[READV]',
      tagColor: 'text-zinc-400',
      tagClass: 'console-tag-readv',
      eventType: 'system',
    };
  }

  // 2. 'welcome' → [WELCOME]
  if (t === 'welcome' || t.includes('welcome')) {
    return {
      tag: '[WELCOME]',
      tagColor: 'text-blue-400',
      tagClass: 'console-tag-welcome',
      eventType: 'welcome',
    };
  }

  // 3. 'economy' or 'reward' or 'daily' or 'streak' → [ECONOMY]
  if (
    t === 'economy' ||
    t === 'reward' ||
    t === 'daily' ||
    t === 'streak' ||
    t.includes('reward') ||
    t.includes('streak') ||
    t.includes('daily') ||
    t.includes('eco')
  ) {
    return {
      tag: '[ECONOMY]',
      tagColor: 'text-amber-400',
      tagClass: 'console-tag-economy',
      eventType: 'economy',
    };
  }

  // 4. 'voice' or 'pvc' → [VOICE]
  if (t === 'voice' || t === 'pvc' || t.includes('voice') || t.includes('pvc')) {
    return {
      tag: '[VOICE]',
      tagColor: 'text-purple-400',
      tagClass: 'console-tag-voice',
      eventType: 'voice',
    };
  }

  // 5. 'store' or 'purchase' → [STORE]
  if (t === 'store' || t === 'purchase' || t.includes('store') || t.includes('purchase')) {
    return {
      tag: '[STORE]',
      tagColor: 'text-pink-400',
      tagClass: 'console-tag-store',
      eventType: 'store',
    };
  }

  // 6. 'community' or 'suggestion' or 'confession' → [COMMUNITY]
  if (
    t === 'community' ||
    t === 'suggestion' ||
    t === 'confession' ||
    t === 'message' ||
    t.includes('suggest') ||
    t.includes('confess') ||
    t.includes('community')
  ) {
    return {
      tag: '[COMMUNITY]',
      tagColor: 'text-cyan-400',
      tagClass: 'console-tag-community',
      eventType: 'community',
    };
  }

  // 7. 'gaming' or 'lfg' → [LFG]
  if (t === 'gaming' || t === 'lfg' || t.includes('gaming') || t.includes('lfg') || t.includes('game')) {
    return {
      tag: '[LFG]',
      tagColor: 'text-orange-400',
      tagClass: 'console-tag-lfg',
      eventType: 'gaming',
    };
  }

  return {
    tag: '[READV]',
    tagColor: 'text-zinc-400',
    tagClass: 'console-tag-readv',
    eventType: 'system',
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canViewGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ensureDatabaseSchema();

  const searchParams = req.nextUrl.searchParams;
  const filterType = (searchParams.get('type') || 'all').toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    const shouldFetchActivity =
      filterType === 'all' ||
      [
        'system',
        'bot_ready',
        'welcome',
        'voice',
        'pvc',
        'store',
        'purchase',
        'community',
        'suggestion',
        'confession',
        'gaming',
        'lfg',
        'economy',
        'reward',
        'streak',
        'daily',
      ].some((prefix) => filterType.includes(prefix));

    const shouldFetchAudit =
      filterType === 'all' ||
      [
        'economy',
        'reward',
        'daily',
        'streak',
        'clean',
        'transfer',
        'reset',
        'add',
        'remove',
      ].some((prefix) => filterType.includes(prefix));

    const [activityResult, auditResult] = await Promise.all([
      shouldFetchActivity
        ? db`
            SELECT id, type, actor_id, actor_name, target_name, details, created_at
            FROM activity_log
            WHERE guild_id = ${guildId}
            ORDER BY created_at DESC
            LIMIT ${limit + offset}
          `.catch(() => [])
        : Promise.resolve([]),
      shouldFetchAudit
        ? db`
            SELECT id, action, actor_id, target_id, amount, details, created_at
            FROM economy_audit_log
            WHERE guild_id = ${guildId}
            ORDER BY created_at DESC
            LIMIT ${limit + offset}
          `.catch(() => [])
        : Promise.resolve([]),
    ]);

    const entries: ActivityConsoleEntry[] = [];

    for (const r of activityResult) {
      const date = new Date(r.created_at);
      const tagInfo = resolveConsoleTag(r.type);
      const timeStr = formatTime(date);

      // Description synthesis
      let desc = '';
      if (r.target_name && r.actor_name) {
        desc = `${r.actor_name} ${r.target_name}`;
      } else if (r.target_name) {
        desc = r.target_name;
      } else if (r.details && typeof r.details === 'object' && r.details.message) {
        desc = String(r.details.message);
      } else if (r.actor_name) {
        desc = `${r.actor_name} performed ${r.type}`;
      } else {
        desc = `${r.type.replace(/_/g, ' ')} recorded`;
      }

      if (r.details?.snippet) {
        desc += `: "${r.details.snippet}"`;
      }

      entries.push({
        id: `act_${r.id}`,
        timestamp: date.toISOString(),
        time: timeStr,
        timeFormatted: timeStr,
        eventType: tagInfo.eventType,
        rawType: r.type,
        tag: tagInfo.tag,
        tagColor: tagInfo.tagColor,
        tagClass: tagInfo.tagClass,
        description: desc,
        relativeTime: formatRelativeTime(date),
        actorName: r.actor_name || 'System',
        targetName: r.target_name || '',
        details: r.details || {},
        sourceTable: 'activity_log',
      });
    }

    for (const a of auditResult) {
      const date = new Date(a.created_at);
      const tagInfo = resolveConsoleTag('economy');
      const timeStr = formatTime(date);

      let desc = '';
      if (a.details) {
        desc = a.details;
      } else if (a.action === 'DAILY_CLAIM') {
        desc = `Daily reward claimed (+${a.amount || 0} coins)`;
      } else if (a.action === 'add') {
        desc = `Added ${a.amount || 0} coins to account`;
      } else if (a.action === 'remove') {
        desc = `Deducted ${a.amount || 0} coins from account`;
      } else if (a.action === 'transfer') {
        desc = `Transferred ${a.amount || 0} coins`;
      } else if (a.action === 'reset') {
        desc = `Reset economy balance`;
      } else {
        desc = `Economy action: ${a.action} (${a.amount || 0})`;
      }

      entries.push({
        id: `eco_${a.id}`,
        timestamp: date.toISOString(),
        time: timeStr,
        timeFormatted: timeStr,
        eventType: tagInfo.eventType,
        rawType: a.action,
        tag: tagInfo.tag,
        tagColor: tagInfo.tagColor,
        tagClass: tagInfo.tagClass,
        description: desc,
        relativeTime: formatRelativeTime(date),
        actorName: a.actor_id ? `<@${a.actor_id}>` : 'System',
        targetName: a.target_id ? `<@${a.target_id}>` : '',
        details: { action: a.action, amount: a.amount, details: a.details },
        sourceTable: 'economy_audit_log',
      });
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filtering if specific filterType requested
    let filtered = entries;
    if (filterType && filterType !== 'all') {
      filtered = entries.filter(
        (e) =>
          e.eventType === filterType ||
          e.rawType.toLowerCase() === filterType ||
          e.tag.toLowerCase().includes(filterType)
      );
    }

    const paginated = filtered.slice(offset, offset + limit);

    // Return empty array [] if no records — ZERO mock data fallback!
    return NextResponse.json({
      entries: paginated,
      items: paginated, // Alias for backwards-compatibility with ActivityLogDrawer
      total: filtered.length,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('Failed to get activity log:', err);
    return NextResponse.json({ error: 'Failed to retrieve activity' }, { status: 500 });
  }
}
