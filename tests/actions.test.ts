import test from 'node:test';
import assert from 'node:assert/strict';

test('Anime action commands exist and are marked with hidden: true', async () => {
  const hugCmd = (await import('../src/modules/actions/hug.js')).default;
  const kissCmd = (await import('../src/modules/actions/kiss.js')).default;
  const cuddleCmd = (await import('../src/modules/actions/cuddle.js')).default;
  const patCmd = (await import('../src/modules/actions/pat.js')).default;
  const slapCmd = (await import('../src/modules/actions/slap.js')).default;
  const biteCmd = (await import('../src/modules/actions/bite.js')).default;
  const holdhandsCmd = (await import('../src/modules/actions/holdhands.js')).default;
  const lickCmd = (await import('../src/modules/actions/lick.js')).default;
  const pokeCmd = (await import('../src/modules/actions/poke.js')).default;
  const highfiveCmd = (await import('../src/modules/actions/highfive.js')).default;
  const lappillowCmd = (await import('../src/modules/actions/lappillow.js')).default;
  const tickleCmd = (await import('../src/modules/actions/tickle.js')).default;
  const blushCmd = (await import('../src/modules/actions/blush.js')).default;
  const winkCmd = (await import('../src/modules/actions/wink.js')).default;
  const smileCmd = (await import('../src/modules/actions/smile.js')).default;

  const actionCmds = [
    hugCmd, kissCmd, cuddleCmd, patCmd, slapCmd, biteCmd,
    holdhandsCmd, lickCmd, pokeCmd, highfiveCmd, lappillowCmd,
    tickleCmd, blushCmd, winkCmd, smileCmd,
  ];

  for (const cmd of actionCmds) {
    assert.ok(cmd.name, 'Command should have a name');
    assert.equal(cmd.module, 'actions');
    assert.equal(cmd.hidden, true, `${cmd.name} should have hidden: true`);
  }
});

test('getModuleCommands filters out hidden commands by default', async () => {
  const { registerCommand, getModuleCommands } = await import('../src/core/commands/CommandRegistry.js');
  const hugCmd = (await import('../src/modules/actions/hug.js')).default;

  registerCommand(hugCmd);

  const defaultCmds = getModuleCommands('actions');
  assert.equal(defaultCmds.length, 0, 'actions module should return 0 commands when includeHidden is false');

  const withHidden = getModuleCommands('actions', true);
  assert.ok(withHidden.length > 0, 'actions module should return commands when includeHidden is true');
});
