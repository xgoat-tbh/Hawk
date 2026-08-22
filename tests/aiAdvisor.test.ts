import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAiServerInsights,
  buildAiReportComponentsV2,
  type AiAnalysisReport,
} from '../src/core/ai/AiAdvisorEngine.js';
import {
  recordTelemetry,
  getTelemetryStats,
  setAiSuggestChannel,
  getAiSuggestChannel,
} from '../src/core/database/repositories/telemetryRepo.js';
import { resolveCommand } from '../src/core/commands/CommandRegistry.js';

test('AI Server Intelligence & Feature Advisor Suite', async (t) => {
  await t.test('buildAiReportComponentsV2 generates valid Components V2 container payload', () => {
    const mockReport: AiAnalysisReport = {
      guildId: '123456789',
      guildName: 'Test Guild',
      timestamp: new Date(),
      summary: 'High voice channel activity and repeated command usage detected.',
      suggestions: [
        {
          category: 'NEW_ALIAS',
          title: 'Add Shortcut for !move',
          rationale: 'Observed 50 executions of !move in 7 days.',
          actionableProposal: 'Add alias `mv` for `move`.',
          impact: 'High',
        },
        {
          category: 'NEW_FEATURE',
          title: 'Temporary VC Hub',
          rationale: '12 members active across 4 voice channels.',
          actionableProposal: 'Enable dynamic auto-generated voice rooms.',
          impact: 'Medium',
        },
      ],
    };

    const payload = buildAiReportComponentsV2(mockReport);
    assert.ok(payload.components.length > 0, 'Should generate at least one container');
    assert.ok(payload.flags > 0, 'Flags should contain IsComponentsV2');
  });

  await t.test('aisuggest command exists with owner-only access and proper metadata', async () => {
    const { default: cmd } = await import('../src/modules/owner/aisuggest.js');
    assert.equal(cmd.name, 'aisuggest');
    assert.equal(cmd.module, 'owner');
    assert.ok(cmd.ownerOnly, 'aisuggest must be owner-only');
    assert.ok(cmd.hidden, 'aisuggest must be hidden from public help');
    assert.ok(cmd.aliases.includes('aiadvisor'));
  });

  await t.test('telemetry repository functions correctly handle mock records', async () => {
    // Record mock command
    await recordTelemetry({
      guildId: 'mock-guild-1',
      userId: 'mock-user-1',
      commandName: 'vcmute',
      aliasUsed: 'vcm',
      rawContent: '!vcm @Test',
      outcome: 'success',
    });

    const stats = await getTelemetryStats('mock-guild-1', 7);
    assert.ok(stats.totalExecutions >= 1, 'Should record and retrieve execution count');
  });

  await t.test('ai suggest channel repository gets and sets channel cleanly', async () => {
    await setAiSuggestChannel('mock-guild-1', 'channel-999');
    const chanId = await getAiSuggestChannel('mock-guild-1');
    assert.equal(chanId, 'channel-999');

    await setAiSuggestChannel('mock-guild-1', null);
    const cleared = await getAiSuggestChannel('mock-guild-1');
    assert.equal(cleared, null);
  });
});
