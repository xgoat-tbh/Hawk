import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getDb } from '../../core/database/pool.js';
import { EmbedBuilder } from 'discord.js';
import { branding } from '../../core/config/branding.js';

export default defineCommand({
  name: 'money-audit-log',
  aliases: ['auditlog'],
  module: 'economy',
  description: 'View recent money audit logs',
  usage: 'money-audit-log',
  examples: ['money-audit-log'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const db = getDb();
    const logs = await db`
      SELECT * FROM economy_audit_logs
      WHERE guild_id = ${ctx.guild.id}
      ORDER BY created_at DESC
      LIMIT 15
    `;

    const embed = new EmbedBuilder()
      .setColor(branding.defaultColor)
      .setTitle('Economy Audit Log');
      
    if (logs.length === 0) {
      embed.setDescription('No recent audit logs.');
    } else {
      const desc = logs.map(l => {
        const time = Math.floor(new Date(l.created_at).getTime() / 1000);
        return `<t:${time}:R> **${l.action.toUpperCase()}** by <@${l.actor_id}> to <@${l.target_id}> Amount: ${l.amount} (${l.details})`;
      }).join('\n');
      embed.setDescription(desc);
    }

    await ctx.respond.raw({ embeds: [embed] });
  }
});
