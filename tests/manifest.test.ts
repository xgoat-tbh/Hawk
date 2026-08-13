import { describe, it, expect, vi } from 'vitest';
import { InteractionRouter } from '../src/core/interactions/InteractionRouter.js';
import type { ModuleManifest } from '../src/types/module.js';

describe('InteractionRouter', () => {
  it('routes button interactions by registered prefix', async () => {
    const router = new InteractionRouter();
    const mockHandler = vi.fn().mockResolvedValue(undefined);

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

    expect(handled).toBe(true);
    expect(mockHandler).toHaveBeenCalledWith(fakeButtonInteraction);
  });

  it('returns false for unknown customId prefixes', async () => {
    const router = new InteractionRouter();

    const fakeButtonInteraction = {
      isButton: () => true,
      isStringSelectMenu: () => false,
      isChannelSelectMenu: () => false,
      isModalSubmit: () => false,
      customId: 'unknown_prefix_123',
    } as any;

    const handled = await router.dispatch(fakeButtonInteraction);
    expect(handled).toBe(false);
  });
});
