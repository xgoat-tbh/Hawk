import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { deployMasterPanel } from './pvcMasterPanel.js';
import { setEconomyConfigField, getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { buyPvcTime, getSessionByOwner } from './pvcService.js';
import type { TextChannel } from 'discord.js';

export default defineCommand({
  name: 'pvc',
  module: 'pvc',
  description: 'Manage the PVC system',
  usage: 'pvc <subcommand>',
  examples: ['pvc setup', 'pvc panel'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const sub = ctx.parsed.args[0]?.toLowerCase();
    
    if (sub === 'buy') {
      const hoursStr = ctx.parsed.args[1];
      const hours = parseInt(hoursStr, 10);
      if (isNaN(hours) || hours <= 0) {
        await ctx.respond.error('Please provide a valid number of hours.');
        return;
      }
  
      const config = await getEconomyConfig(ctx.guild.id);
      try {
        const result = await buyPvcTime(ctx.guild.id, ctx.message.author.id, hours, config.pvcHourlyRate);
        if (result.extended) {
          await ctx.respond.success(`Extended your PVC time by ${hours} hours.`);
        } else {
          await ctx.respond.success(`Purchased ${hours} hours of PVC time. Join the JTC channel to activate it.`);
        }
      } catch (e: any) {
        if (e.message && e.message.includes('Insufficient funds')) {
          await ctx.respond.error(`Insufficient funds. You need ${hours * config.pvcHourlyRate} to buy ${hours} hours.`);
        } else {
          await ctx.respond.error('Failed to buy PVC time. Please try again.');
        }
      }
      return;
    }
    
    if (sub === 'info') {
      const session = await getSessionByOwner(ctx.guild.id, ctx.message.author.id);
      if (!session) {
        await ctx.respond.error("You don't have an active PVC.");
        return;
      }
      const { getAccessList } = await import('./pvcService.js');
      const { buildPvcInfoEmbed } = await import('./pvcInfoUI.js');
      const accessList = await getAccessList(session.channelId);
      const { embeds, components } = buildPvcInfoEmbed(session, ctx.message.author.username, accessList, ctx.message.client);
      await ctx.respond.raw({ embeds, components });
      return;
    }
    
    // Admin commands below
    if (!ctx.member.permissions.has('ManageGuild')) {
      await ctx.respond.error('You need Manage Server permissions to use PVC admin subcommands.');
      return;
    }
    
    if (sub === 'panel') {
      await deployMasterPanel(ctx.message.channel as TextChannel);
      await ctx.respond.success('Master panel deployed.');
      return;
    }
    
    if (sub === 'setup') {
      const jtcId = ctx.parsed.args[1]?.replace(/[<#>]/g, '');
      const catId = ctx.parsed.args[2];
      const cmdId = ctx.parsed.args[3]?.replace(/[<#>]/g, '');
      const panelId = ctx.parsed.args[4]?.replace(/[<#>]/g, '');
      
      if (!jtcId || !catId || !cmdId || !panelId) {
        await ctx.respond.error('Usage: `!pvc setup <jtc_channel_id> <category_id> <command_channel_id> <panel_channel_id>`');
        return;
      }
      
      await setEconomyConfigField(ctx.guild.id, 'pvcJtcChannelId', jtcId);
      await setEconomyConfigField(ctx.guild.id, 'pvcCategoryId', catId);
      await setEconomyConfigField(ctx.guild.id, 'pvcCommandChannelId', cmdId);
      await setEconomyConfigField(ctx.guild.id, 'pvcPanelChannelId', panelId);
      
      await ctx.respond.success('PVC system configured successfully.');
      return;
    }
    
    await ctx.respond.info('**PVC Commands:**\n`!pvc buy <hours>` - Buy PVC time\n`!pvc info` - PVC info panel\n`!au <@users>` - Allow users\n`!pvc panel` - Deploy master panel (Admin)\n`!pvc setup ...` - Configure PVC (Admin)');
  },
});
