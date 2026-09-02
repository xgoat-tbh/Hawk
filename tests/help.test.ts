import test from 'node:test';
import assert from 'node:assert/strict';

test('HELP_CATEGORIES contains 7 clean super-categories', async () => {
  const { HELP_CATEGORIES } = await import('../src/modules/general/helpUI.js');
  assert.equal(HELP_CATEGORIES.length, 7, 'Should have exactly 7 categories to prevent category clutter');

  const categoryIds = HELP_CATEGORIES.map(c => c.id);
  assert.ok(categoryIds.includes('moderation'));
  assert.ok(categoryIds.includes('voice'));
  assert.ok(categoryIds.includes('gaming'));
  assert.ok(categoryIds.includes('community'));
  assert.ok(categoryIds.includes('economy'));
  assert.ok(categoryIds.includes('pvc'));
  assert.ok(categoryIds.includes('general'));
});

test('buildCategoryHelpEmbed generates paginated V2 container payload with buttons', async () => {
  const { buildCategoryHelpEmbed } = await import('../src/modules/general/helpUI.js');
  const payload = buildCategoryHelpEmbed('moderation', '!', '123456789', 1);

  assert.ok(payload.components.length > 0, 'Payload should contain components');
  assert.ok(payload.flags > 0, 'Payload should contain MessageFlags');
});
