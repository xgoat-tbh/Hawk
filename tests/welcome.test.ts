import test from 'node:test';
import assert from 'node:assert/strict';
import { substituteVariables, renderWelcomePayload } from '../src/modules/welcome/welcomeEngine.js';
import type { VariableContext } from '../src/types/welcome.js';

test('substituteVariables replaces all alias tokens accurately', () => {
  const ctx: VariableContext = {
    username: 'Alice',
    usermention: '<@123456789>',
    usertag: 'Alice#0001',
    useravatar: 'https://cdn.discordapp.com/avatars/123/avatar.png',
    servername: 'Hawks Nest',
    servermember: 500,
    serveravatar: 'https://cdn.discordapp.com/icons/456/icon.png',
    randomuser: '<@987654321>',
  };

  const template =
    'Welcome {user} ({username}) to {server} ({servername}, {server.name})! You are member #{server.count} (#{servermember}, #{servercount}). Check avatar: {user.avatar} {server.icon}';

  const result = substituteVariables(template, ctx);

  assert.ok(result.includes('Welcome <@123456789> (Alice) to Hawks Nest (Hawks Nest, Hawks Nest)!'));
  assert.ok(result.includes('You are member #500 (#500, #500).'));
  assert.ok(result.includes('https://cdn.discordapp.com/avatars/123/avatar.png'));
  assert.ok(result.includes('https://cdn.discordapp.com/icons/456/icon.png'));
});

test('renderWelcomePayload processes rich JSON embeds with variable substitutions', () => {
  const ctx: VariableContext = {
    username: 'Bob',
    usermention: '<@111222333>',
    usertag: 'Bob#0002',
    useravatar: 'https://cdn.discordapp.com/avatars/111/avatar.png',
    servername: 'Test Server',
    servermember: 42,
    serveravatar: 'https://cdn.discordapp.com/icons/222/icon.png',
    randomuser: '<@333444555>',
  };

  const payloadJson = JSON.stringify({
    embeds: [
      {
        title: 'Welcome to {server}!',
        description: 'Hey {user}, welcome! Total members: {server.count}',
        color: 0xffffff,
      },
    ],
  });

  const rendered = renderWelcomePayload(payloadJson, ctx);
  assert.ok(rendered.embeds && rendered.embeds.length > 0);
  assert.equal(rendered.embeds[0].title, 'Welcome to Test Server!');
  assert.equal(rendered.embeds[0].description, 'Hey <@111222333>, welcome! Total members: 42');
});
