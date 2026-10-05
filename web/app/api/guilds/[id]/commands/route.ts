import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canViewGuild, canManageGuild } from '@/lib/auth';
import { validateFlow, scriptToFlow, flowToScript } from '@/lib/commandFlow';
import { cleanSnowflakeArray } from '../config/helpers';
import { logDashboardAction } from '@/lib/auditLogger';
import { BUILT_IN_COMMANDS } from '@/lib/commands';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await getSession();
  if (!session || !await canViewGuild(session.id, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try { return NextResponse.json({ commands: await db`SELECT * FROM custom_commands WHERE guild_id = ${id} ORDER BY name LIMIT 200` }); }
  catch { return NextResponse.json({ error: 'Custom commands unavailable. Apply database migration 030.' }, { status: 503 }); }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await getSession();
  if (!session || !await canManageGuild(session.id, id)) return NextResponse.json({ error: 'Editor access required' }, { status: 403 });
  try {
    const body = await req.json();
    const name = String(body.name || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(name)) throw new Error('Use a command name of 1–32 letters, numbers or hyphens');
    const catalog = BUILT_IN_COMMANDS;
    if (catalog.some(c => c.name === name || c.aliases?.includes(name))) throw new Error('This name is reserved by a built-in command');
    const flow = body.flow_json ? validateFlow(body.flow_json) : scriptToFlow(body.script_text);
    const cooldown = Number(body.cooldown_ms ?? 1000);
    if (!Number.isInteger(cooldown) || cooldown < 1000 || cooldown > 86400000) throw new Error('Cooldown must be 1000–86400000ms');
    const roles = cleanSnowflakeArray(body.required_roles || []);
    const command = await db.begin(async sql => {
      // Serialize capacity checks per guild, including concurrent creates.
      await sql`SELECT pg_advisory_xact_lock(hashtext(${'custom_commands:' + id}))`;
      const [count] = await sql`SELECT COUNT(*)::int AS count FROM custom_commands WHERE guild_id = ${id}`;
      if (!body.id && count.count >= 200) throw new Error('A server can have at most 200 custom commands');
      const rows = body.id ? await sql`UPDATE custom_commands SET name = ${name}, trigger = ${name}, flow_json = ${sql.json(flow as any)}, script_text = ${flowToScript(flow)}, enabled = ${body.enabled !== false}, cooldown_ms = ${cooldown}, required_roles = ${roles}, updated_at = NOW() WHERE id = ${body.id} AND guild_id = ${id} RETURNING *` : await sql`INSERT INTO custom_commands (guild_id, name, trigger, flow_json, script_text, enabled, cooldown_ms, required_roles) VALUES (${id}, ${name}, ${name}, ${sql.json(flow as any)}, ${flowToScript(flow)}, ${body.enabled !== false}, ${cooldown}, ${roles}) RETURNING *`;
      if (!rows[0]) throw new Error('Command no longer exists');
      await sql`SELECT pg_notify('custom_commands_changed', ${id})`;
      await logDashboardAction({ userId: session.id, guildId: id, action: 'command_saved', module: 'commands', after: { id: rows[0].id, name } }, sql);
      return rows[0];
    });
    return NextResponse.json({ command });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Unable to save command' }, { status: 400 }); }
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const session = await getSession();
  if (!session || !await canManageGuild(session.id, id)) return NextResponse.json({ error: 'Editor access required' }, { status: 403 });
  try {
    const body = await req.json();
    if (!Number.isSafeInteger(body.id) || body.id <= 0) return NextResponse.json({ error: 'Invalid command ID' }, { status: 400 });
    const deleted = await db.begin(async sql => {
      const rows = await sql`DELETE FROM custom_commands WHERE id = ${body.id} AND guild_id = ${id} RETURNING name`;
      if (!rows.length) return false;
      await sql`SELECT pg_notify('custom_commands_changed', ${id})`;
      await logDashboardAction({ userId: session.id, guildId: id, action: 'command_deleted', module: 'commands', before: rows[0] }, sql);
      return true;
    });
    return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Command not found' }, { status: 404 });
  } catch { return NextResponse.json({ error: 'Unable to delete command' }, { status: 400 }); }
}
