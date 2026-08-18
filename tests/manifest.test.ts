import test from 'node:test';
import assert from 'node:assert/strict';
import { InteractionRouter } from '../src/core/interactions/InteractionRouter.js';
import type { ModuleManifest } from '../src/types/module.js';

test('InteractionRouter routes button interactions by registered prefix', async () => {
  const router = new InteractionRouter();
  let calledWith: any = null;
  const mockHandler = async (interaction: any) => {
    calledWith = interaction;
  };

  const manifest: ModuleManifest = {
    name: 'test_module',
    buttonPrefixes: ['test_btn_'],
    onButton: mockHandler,
  };

  router.registerModule(manifest);

  const fakeButtonInteraction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isModalSubmit: () => false,
    customId: 'test_btn_submit',
  } as any;

  const handled = await router.dispatch(fakeButtonInteraction);

  assert.equal(handled, true);
  assert.equal(calledWith, fakeButtonInteraction);
});

test('InteractionRouter returns false for unknown customId prefixes', async () => {
  const router = new InteractionRouter();

  const fakeButtonInteraction = {
    isButton: () => true,
    isStringSelectMenu: () => false,
    isChannelSelectMenu: () => false,
    isModalSubmit: () => false,
    customId: 'unknown_prefix_123',
  } as any;

  const handled = await router.dispatch(fakeButtonInteraction);
  assert.equal(handled, false);
});
