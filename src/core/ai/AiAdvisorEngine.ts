import type { Guild } from 'discord.js';
import { env } from '../config/environment.js';
import { getTelemetryStats } from '../database/repositories/telemetryRepo.js';
import { getAllCommands } from '../commands/CommandRegistry.js';
import { ui, type ComponentV2Payload } from '../ui/index.js';
import { consoleLog } from '../logging/ConsoleLogger.js';

export interface AiSuggestion {
  category: 'NEW_ALIAS' | 'NEW_FEATURE' | 'OPTIMIZATION' | 'DEPRECATION';
  title: string;
  rationale: string;
  actionableProposal: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface AiAnalysisReport {
  guildId: string;
  guildName: string;
  timestamp: Date;
  summary: string;
  suggestions: AiSuggestion[];
}

export async function generateAiServerInsights(guild: Guild): Promise<AiAnalysisReport> {
  const telemetry = await getTelemetryStats(guild.id, 7);
  const allCommands = getAllCommands(true);

  // Collect Guild Context
  const memberCount = guild.memberCount || guild.members.cache.size;
  const botCount = guild.members.cache.filter(m => m.user.bot).size;
  const humanCount = Math.max(1, memberCount - botCount);

  const voiceActiveCount = guild.voiceStates.cache.filter(vs => vs.channelId !== null).size;

  const topRoles = Array.from(guild.roles.cache.values())
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .slice(0, 15)
    .map(r => ({ name: r.name, id: r.id, members: r.members.size }));

  const activeCommandNames = allCommands.map(c => c.name);

  // If Gemini API Key is provided, call Gemini 2.0 Flash
  if (env.geminiApiKey) {
    try {
      const prompt = `You are an expert Discord Bot Architect and Server Optimization AI.
Analyze this server telemetry and role structure to suggest 3-5 high-impact improvements for the bot and server.

SERVER METRICS:
- Server Name: "${guild.name}"
- Total Members: ${humanCount} humans, ${botCount} bots
- Active in Voice: ${voiceActiveCount} members
- Active Bot Commands: ${activeCommandNames.join(', ')}

7-DAY TELEMETRY:
- Total Command Triggers: ${telemetry.totalExecutions}
- Top Commands Used: ${JSON.stringify(telemetry.topCommands)}
- Top Aliases Used: ${JSON.stringify(telemetry.topAliases)}
- Outcome Breakdown: ${JSON.stringify(telemetry.outcomesBreakdown)}
- Unique Active Users: ${telemetry.uniqueUsersCount}

TOP SERVER ROLES:
${topRoles.map(r => `- ${r.name}: ${r.members} members`).join('\n')}

Provide an executive summary and 3-5 distinct suggestions categorized under:
- "NEW_ALIAS" (Shortcuts or aliases for high-frequency or mistyped commands)
- "NEW_FEATURE" (New command or feature tailored to this server's specific community/gaming/voice activity)
- "OPTIMIZATION" (Workflow, cooldown, or permission configuration improvements)
- "DEPRECATION" (Commands with 0 usage or redundant settings)

Return ONLY valid JSON matching this exact structure:
{
  "summary": "Brief 2-sentence executive summary of server activity patterns",
  "suggestions": [
    {
      "category": "NEW_ALIAS",
      "title": "Short title",
      "rationale": "Why this is recommended based on data",
      "actionableProposal": "Exact proposed change or command syntax",
      "impact": "High"
    }
  ]
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            guildId: guild.id,
            guildName: guild.name,
            timestamp: new Date(),
            summary: parsed.summary || 'Automated server telemetry review completed.',
            suggestions: parsed.suggestions || [],
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        consoleLog('warning', 'api_error', `Gemini API returned ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      consoleLog('error', 'api_error', `Failed to generate Gemini AI insights: ${err?.message || String(err)}`);
    }
  }

  // Deterministic Heuristic Analysis (Engine Fallback / Offline Mode)
  const suggestions: AiSuggestion[] = [];

  // 1. Voice activity vs Commands Analysis
  if (voiceActiveCount > 5) {
    suggestions.push({
      category: 'NEW_FEATURE',
      title: 'Dynamic Temporary Voice Rooms',
      rationale: `Observed ${voiceActiveCount} members actively in voice channels. High voice engagement benefits from auto-generated temporary VC rooms.`,
      actionableProposal: 'Add a `!tempvc` or `!voicehub` auto-creator channel that spawns dedicated rooms when members join.',
      impact: 'High',
    });
  }

  // 2. Command usage & alias detection
  if (telemetry.topCommands.length > 0) {
    const topCmd = telemetry.topCommands[0];
    suggestions.push({
      category: 'NEW_ALIAS',
      title: `Dedicated Shortcut for \`${topCmd.commandName}\``,
      rationale: `\`${topCmd.commandName}\` is the #1 most used command (${topCmd.count} executions in 7 days).`,
      actionableProposal: `Add ultra-short aliases for \`${topCmd.commandName}\` to streamline moderator and member workflows.`,
      impact: 'Medium',
    });
  }

  // 3. Permission and Failure Rate Analysis
  const failCount = (telemetry.outcomesBreakdown['denied'] || 0) + (telemetry.outcomesBreakdown['fail'] || 0);
  if (failCount > 10) {
    suggestions.push({
      category: 'OPTIMIZATION',
      title: 'Review Role Custom Permits',
      rationale: `Recorded ${failCount} permission denials in the last 7 days. Key roles may be missing custom permits.`,
      actionableProposal: 'Run `!access list` to inspect permitted staff roles and grant necessary moderation/voice scopes.',
      impact: 'High',
    });
  }

  // 4. Role Hierarchy Optimization
  if (topRoles.length > 0) {
    suggestions.push({
      category: 'OPTIMIZATION',
      title: 'Automated Gaming & Community LFG Roles',
      rationale: `Server has ${humanCount} members distributed across ${topRoles.length} active roles.`,
      actionableProposal: 'Use `!gamerole add` and `!suggestpanel` to allow self-serve community engagement and feature polling.',
      impact: 'Medium',
    });
  }

  return {
    guildId: guild.id,
    guildName: guild.name,
    timestamp: new Date(),
    summary: `Analyzed ${humanCount} members, ${voiceActiveCount} voice users, and ${telemetry.totalExecutions} command events over 7 days.`,
    suggestions: suggestions.slice(0, 4),
  };
}

export function buildAiReportComponentsV2(report: AiAnalysisReport): ComponentV2Payload {
  const sections: string[] = [
    `• **Server:** **${report.guildName}**\n` +
    `• **Generated:** <t:${Math.floor(report.timestamp.getTime() / 1000)}:f> (<t:${Math.floor(report.timestamp.getTime() / 1000)}:R>)\n` +
    `• **Overview:** ${report.summary}`,
  ];

  for (let i = 0; i < report.suggestions.length; i++) {
    const s = report.suggestions[i];
    const block = [
      `### [${s.category}] ${s.title} *(${s.impact} Impact)*`,
      `• **Rationale:** ${s.rationale}`,
      `• **Proposed Action:** ${s.actionableProposal}`,
    ].join('\n');
    sections.push(block);
  }

  return ui.standard({
    title: 'AI Server Intelligence & Feature Advisor',
    sections,
  });
}
