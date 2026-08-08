import { Events } from 'discord.js';
import { env } from './core/config/environment.js';
import { createClient, updateBotActivity } from './client/BotClient.js';
import { getCommandCount } from './core/commands/CommandRegistry.js';
import { getPrefix } from './core/database/repositories/guildConfigRepo.js';
import { classifyMessage, handleBotMention, MessageType } from './services/MentionHandler.js';
import { handleMessage } from './core/commands/CommandExecutor.js';
import { runMigrations } from './core/database/migrations/runner.js';
import { validateConnection, closeDb } from './core/database/pool.js';
import { logEvent } from './core/logging/WebhookLogger.js';
import { consoleLog } from './core/logging/ConsoleLogger.js';
import { isNoPrefixEnabled, loadNoPrefixCache } from './core/config/NoPrefixConfig.js';
import { loadAfkCache } from './core/database/repositories/afkRepo.js';
import { startInteractionCleanup } from './core/interactions/InteractionState.js';
import { startCooldownCleanup } from './core/cooldowns/CooldownManager.js';
import { handleAfkMessage } from './modules/general/_afkHandler.js';
import { handleStickyResurface } from './modules/sticky/_stickyHandler.js';
import {
  handleSuggestionPanelResurface,
  initializeSuggestionPanels,
  handleSuggestionButton,
  handleSuggestionModal,
  handleSuggestionReactionAdd,
  handleSuggestionReactionRemove,
} from './modules/suggestion/_suggestionHandler.js';
import {
  handleConfessionPanelResurface,
  initializeConfessionPanels,
  handleConfessionButton,
  handleConfessionModal,
} from './modules/confession/_confessionHandler.js';
import { handleMediaFilter } from './modules/media/_mediaHandler.js';
import { handleHelpSelect } from './modules/general/_helpHandler.js';
import { handleStealButton, handleStealModal } from './modules/general/_stealHandler.js';
import { handlePingRefresh } from './modules/general/pingUI.js';
import { handleInfoInteraction } from './modules/general/infoUI.js';
import { handleDragmeInteraction } from './modules/voice/_dragmeHandler.js';
import { handleVConfigFallback } from './modules/voice/vconfig.js';
import { handleFmvVoiceStateUpdate } from './modules/voice/FmvManager.js';
import { recordDeletedMessage } from './modules/moderation/SnipeManager.js';
import {
  handleMemberJoin,
  handleMemberLeave,
  handleWelcomeButton,
  handleWelcomeModal,
} from './modules/welcome/_welcomeHandler.js';
import { handleNukeInteraction } from './modules/moderation/_nukeHandler.js';

async function bootstrap() {
  const startTime = Date.now();
  consoleLog('info', 'startup', 'Starting Hawk Discord Bot...');

  try {
    await validateConnection();
    consoleLog('info', 'database', 'PostgreSQL database connection verified.');
    const applied = await runMigrations();
    consoleLog('info', 'database', `Database migrations up to date (${applied} new applied).`);
  } catch (error) {
    consoleLog('critical', 'database', `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const { loadCommands } = await import('./core/commands/CommandLoader.js');
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const url = await import('node:url');
  const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
  let modulesDir = path.join(currentDir, 'modules');
  const dirExists = await fs.stat(modulesDir).then(s => s.isDirectory()).catch(() => false);
  if (!dirExists) {
    modulesDir = path.join(process.cwd(), 'src', 'modules');
  }
  await loadCommands(modulesDir);
  consoleLog('info', 'startup', `Loaded ${getCommandCount()} commands across all modules.`);

  const client = createClient();

  client.on(Events.ClientReady, async () => {
    const elapsed = Date.now() - startTime;
    (globalThis as any).hawkClient = client;
    updateBotActivity(client);
    startInteractionCleanup();
    startCooldownCleanup();
    await loadNoPrefixCache();
    await loadAfkCache();
    await initializeSuggestionPanels(client);
    await initializeConfessionPanels(client);
    consoleLog('info', 'startup', `Logged in as ${client.user?.tag} \u2014 ${getCommandCount()} commands loaded \u2014 ${elapsed}ms startup`);
    logEvent('info', 'startup', `Bot started: ${client.user?.tag}`, { commands: getCommandCount(), startupMs: elapsed, environment: env.nodeEnv, guilds: client.guilds.cache.size });
  });

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    try {
      const prefix = await getPrefix(message.guild.id);
      const type = classifyMessage(message, prefix);

      // Run background non-command tasks concurrently without blocking command processing
      Promise.allSettled([
        handleStickyResurface(message),
        handleSuggestionPanelResurface(message),
        handleConfessionPanelResurface(message),
        handleAfkMessage(message),
        handleMediaFilter(message),
      ]).catch(() => {});

      switch (type) {
        case MessageType.PrefixCommand:
          await handleMessage(message);
          break;
        case MessageType.BotMention:
          await handleBotMention(message, prefix);
          break;
        case MessageType.Normal:
          if (isNoPrefixEnabled(message.guild.id, message.author.id)) {
            await handleMessage(message);
          }
          break;
      }
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in messageCreate: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('messageDelete', (message) => {
    try {
      recordDeletedMessage(message as any);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in messageDelete: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      await handleFmvVoiceStateUpdate(oldState, newState);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in voiceStateUpdate: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      await handleSuggestionReactionAdd(reaction, user);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in messageReactionAdd: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    try {
      await handleSuggestionReactionRemove(reaction, user);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in messageReactionRemove: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      await handleMemberJoin(member);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in guildMemberAdd: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      await handleMemberLeave(member);
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in guildMemberRemove: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChannelSelectMenu()) {
        const id = interaction.customId;
        if (id.startsWith('vconfig_')) {
          await handleVConfigFallback(interaction);
        }
      } else if (interaction.isStringSelectMenu()) {
        await handleHelpSelect(interaction);
      } else if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith('sug_') || id.startsWith('suggest_')) {
          await handleSuggestionButton(interaction);
        } else if (id.startsWith('conf_') || id.startsWith('confess_')) {
          await handleConfessionButton(interaction);
        } else if (id.startsWith('dragme_')) {
          await handleDragmeInteraction(interaction);
        } else if (id.startsWith('ping_refresh_')) {
          await handlePingRefresh(interaction);
        } else if (id.startsWith('info_')) {
          await handleInfoInteraction(interaction);
        } else if (id.startsWith('welcome_')) {
          await handleWelcomeButton(interaction);
        } else if (id.startsWith('nuke_')) {
          await handleNukeInteraction(interaction);
        } else if (id.startsWith('vconfig_')) {
          await handleVConfigFallback(interaction);
        } else if (id.startsWith('steal_btn_')) {
          await handleStealButton(interaction);
        }
      } else if (interaction.isModalSubmit()) {
        const id = interaction.customId;
        if (id.startsWith('sug_') || id.startsWith('suggest_')) {
          await handleSuggestionModal(interaction);
        } else if (id.startsWith('conf_') || id.startsWith('confess_')) {
          await handleConfessionModal(interaction);
        } else if (id.startsWith('welcome_modal_')) {
          await handleWelcomeModal(interaction);
        } else if (id.startsWith('steal_modal_')) {
          await handleStealModal(interaction);
        }
      }
    } catch (error) {
      consoleLog('error', 'unhandled_exception', `Unhandled error in interactionCreate: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  process.on('unhandledRejection', (reason) => {
    consoleLog('critical', 'unhandled_rejection', `Unhandled Promise Rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
  });

  process.on('uncaughtException', (error) => {
    consoleLog('critical', 'uncaught_exception', `Uncaught Exception: ${error.stack ?? error.message}`);
  });

  const handleGracefulShutdown = async (signal: string) => {
    consoleLog('info', 'shutdown', `Received ${signal}, initiating graceful shutdown...`);
    try {
      client.destroy();
      await closeDb();
      consoleLog('info', 'shutdown', 'Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      consoleLog('error', 'shutdown', `Error during graceful shutdown: ${err}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

  // Start HTTP health-check server for Render free tier web service hosting
  const http = await import('node:http');
  const port = process.env.PORT || 3000;
  http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: client.user?.tag || 'starting', uptime: Math.floor(process.uptime()) }));
  }).listen(port, () => {
    consoleLog('info', 'startup', `HTTP health-check server listening on port ${port}`);
  });

  await client.login(env.botToken);
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
