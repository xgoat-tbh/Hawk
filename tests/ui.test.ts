import test from 'node:test';
import assert from 'node:assert/strict';

test('Amo UI Theme exports borderless container settings and clean tokens', async () => {
  const { ui, AmoTheme, HawkTheme } = await import('../src/core/ui/index.js');
  assert.equal(ui.theme.container.borderless, true);
  assert.equal(ui.theme.container.accentColor, undefined);
  assert.equal(AmoTheme.colors.primary, 0x1e1f22);
  assert.equal(HawkTheme.colors.primary, 0x1e1f22);
});

test('Amo UI creates borderless containers by default', async () => {
  const { ui } = await import('../src/core/ui/index.js');
  const container = ui.container();
  assert.ok(container, 'Container should be created');
  assert.equal((container as any).data?.accent_color, undefined, 'Container accent color should be undefined for borderless look');
});

test('Amo UI standard and dashboard builders construct valid Components V2 payloads', async () => {
  const { ui } = await import('../src/core/ui/index.js');
  const standardPayload = ui.standard({
    title: 'System Notice',
    text: 'Operation completed successfully.',
  });
  assert.ok(standardPayload.components.length > 0);
  assert.ok(standardPayload.flags > 0);

  const dashPayload = ui.dashboard({
    title: 'Server Dashboard',
    description: 'Overview of system status',
    fields: [
      { name: 'Status', value: 'Online' },
      { name: 'Ping', value: '18ms' },
    ],
  });
  assert.ok(dashPayload.components.length > 0);
});

test('Amo UI customId builder and parser work correctly', async () => {
  const { ui } = await import('../src/core/ui/index.js');
  const built = ui.customId.build('v2', 'prev', '12345', 'extra');
  assert.equal(built, 'v2_prev_12345_extra');

  const parsed = ui.customId.parse(built);
  assert.equal(parsed.prefix, 'v2');
  assert.equal(parsed.action, 'prev');
  assert.equal(parsed.ownerId, '12345');
  assert.equal(parsed.extra, 'extra');

  const isOwner = ui.customId.isOwner({ user: { id: '12345' } } as any, '12345');
  assert.equal(isOwner, true);

  const isNotOwner = ui.customId.isOwner({ user: { id: '99999' } } as any, '12345');
  assert.equal(isNotOwner, false);
});

test('Amo UI status helpers generate valid V2 component payloads', async () => {
  const { ui } = await import('../src/core/ui/index.js');
  const successPayload = ui.success('Operation completed');
  assert.ok(successPayload.components.length > 0);
  assert.ok(successPayload.flags > 0);

  const errorPayload = ui.error({ text: 'Error details', title: 'Action Failed' });
  assert.ok(errorPayload.components.length > 0);
});

test('Confession UI generates pure Components V2 payloads', async () => {
  const { buildConfessionPanel, buildAnonymousConfessionPayload } = await import('../src/modules/confession/confessionUI.js');
  const panel = buildConfessionPanel();
  assert.ok(panel.components.length > 0);
  assert.ok(panel.flags > 0);

  const confessionMsg = buildAnonymousConfessionPayload('This is a test confession');
  assert.ok(confessionMsg.components.length > 0);
  assert.ok(confessionMsg.flags > 0);
});

test('Welcome UI generates clean Components V2 payloads without emoji buttons', async () => {
  const { buildWelcomeConfigPanel } = await import('../src/modules/welcome/welcomeUI.js');
  const greetPanel = buildWelcomeConfigPanel('greet');
  assert.ok(greetPanel.components.length > 0);
  assert.ok(greetPanel.flags > 0);

  const leavePanel = buildWelcomeConfigPanel('leave');
  assert.ok(leavePanel.components.length > 0);
  assert.ok(leavePanel.flags > 0);
});

test('PVC Master Panel generates minimal container with 3x3 buttons inside container', async () => {
  const { buildMasterPanel } = await import('../src/modules/pvc/pvcMasterPanel.js');
  const { createBuyHoursModal } = await import('../src/modules/pvc/pvcModals.js');
  const { branding, getEmoji } = await import('../src/core/config/branding.js');

  const panel = buildMasterPanel();
  assert.ok(panel.components.length > 0, 'Panel should have components');
  assert.ok(panel.flags > 0, 'Panel should have Components V2 flags');

  const container = panel.components[0] as any;
  assert.ok(container, 'Container should exist');

  // Verify container components: text display + separator + action rows
  const containerComponents = container.components || [];
  const actionRows = containerComponents.filter((c: any) => c.data?.type === 1 || c.components !== undefined);
  assert.equal(actionRows.length, 3, 'Should have exactly 3 action rows inside container');

  const expectedGrid = [
    [
      { id: 'btn_master_add_hours', label: 'Add', emoji: getEmoji('pvc_btn_add') },
      { id: 'btn_master_fastag', label: 'Autopay', emoji: getEmoji('pvc_btn_autopay') },
      { id: 'btn_master_limit', label: 'Limit', emoji: getEmoji('pvc_btn_limit') },
    ],
    [
      { id: 'btn_master_trust', label: 'Trust', emoji: getEmoji('pvc_btn_trust') },
      { id: 'btn_master_rename', label: 'Rename', emoji: getEmoji('pvc_btn_rename') },
      { id: 'btn_master_info', label: 'Info', emoji: getEmoji('pvc_btn_info') },
    ],
    [
      { id: 'btn_master_transfer', label: 'Transfer', emoji: getEmoji('pvc_btn_transfer') },
      { id: 'btn_master_privacy', label: 'Privacy', emoji: getEmoji('pvc_btn_privacy') },
      { id: 'btn_master_remove_user', label: 'Remove', emoji: getEmoji('pvc_btn_remove') },
    ],
  ];

  for (let r = 0; r < 3; r++) {
    const row = actionRows[r];
    const buttons = row.components || [];
    assert.equal(buttons.length, 3, `Row ${r + 1} should have exactly 3 buttons`);
    for (let c = 0; c < 3; c++) {
      const btn = buttons[c];
      const expected = expectedGrid[r][c];
      assert.equal(btn.data?.custom_id, expected.id, `Button at [${r}][${c}] should have customId ${expected.id}`);
      assert.equal(btn.data?.label, expected.label, `Button at [${r}][${c}] should have label ${expected.label}`);
      if (expected.emoji.startsWith('<:')) {
        const match = /^<:([^:]+):(\d+)>$/.exec(expected.emoji);
        assert.ok(match, `Emoji ${expected.emoji} should match custom format`);
        assert.equal(btn.data?.emoji?.name, match[1], `Button at [${r}][${c}] should have custom emoji name ${match[1]}`);
        assert.equal(btn.data?.emoji?.id, match[2], `Button at [${r}][${c}] should have custom emoji id ${match[2]}`);
      } else {
        assert.equal(btn.data?.emoji?.name, expected.emoji, `Button at [${r}][${c}] should have emoji ${expected.emoji}`);
      }
    }
  }

  // Verify modal
  const buyModal = createBuyHoursModal();
  assert.equal(buyModal.data.custom_id, 'pvc_modal_buy');
  assert.equal(buyModal.data.title, 'Add PVC Hours');

  // Verify PVC Info UI has clean container without redundant buttons
  const { buildPvcInfoPayload } = await import('../src/modules/pvc/pvcInfoUI.js');
  const infoPayload = buildPvcInfoPayload(
    {
      channelId: '123',
      guildId: '456',
      ownerId: '789',
      isLocked: false,
      isHidden: false,
      autoPayEnabled: true,
      userLimit: 5,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    },
    'TestOwner',
    [],
  );
  assert.ok(infoPayload.components.length > 0);
  const infoContainer = infoPayload.components[0] as any;
  const infoActionRows = (infoContainer.components || []).filter((c: any) => c.data?.type === 1 || c.components !== undefined);
  assert.equal(infoActionRows.length, 0, 'PVC Info container should have zero action buttons');

  // Verify dynamic emoji resolution via client cache fallback
  const originalHawkClient = (globalThis as any).hawkClient;
  (globalThis as any).hawkClient = {
    emojis: {
      cache: [
        { name: 'testdynamic', id: '999999999999999999', toString: () => '<:testdynamic:999999999999999999>' },
      ],
    },
  };
  assert.equal(getEmoji('pvc_btn_testdynamic'), '<:testdynamic:999999999999999999>');
  (globalThis as any).hawkClient = originalHawkClient;
});

