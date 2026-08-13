import test from 'node:test';
import assert from 'node:assert/strict';

test('stickyrefresh command exists with proper metadata and aliases', async () => {
  const stickyrefreshCmd = (await import('../src/modules/sticky/stickyrefresh.js')).default;

  assert.equal(stickyrefreshCmd.name, 'stickyrefresh');
  assert.equal(stickyrefreshCmd.module, 'sticky');
  assert.ok(stickyrefreshCmd.aliases.includes('refreshsticky'));
  assert.ok(stickyrefreshCmd.aliases.includes('stickrefresh'));
  assert.ok(stickyrefreshCmd.aliases.includes('srefresh'));
});

test('stick and stickyremove have convenient aliases', async () => {
  const stickCmd = (await import('../src/modules/sticky/stick.js')).default;
  const stickyremoveCmd = (await import('../src/modules/sticky/stickyremove.js')).default;

  assert.ok(stickCmd.aliases.includes('sticky'));
  assert.ok(stickyremoveCmd.aliases.includes('unstick'));
});
