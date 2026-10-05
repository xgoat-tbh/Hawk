import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerCard } from '@/components/ServerCard';
import { PermissionMatrix } from '@/components/Permissions/PermissionMatrix';
import { MODULE_DEFINITIONS } from '@/lib/permissions';
test('server card links to the actual guild and never invents missing member counts', () => { render(<ServerCard testServer guild={{ id: '1493322410567401722', name: 'YOLO', owner: false, icon: null }}/>); expect(screen.getByText('Yolo (Test)')).toBeTruthy(); expect(screen.getByText('Member count unavailable')).toBeTruthy(); expect(screen.getByRole('link').getAttribute('href')).toBe('/dashboard/1493322410567401722'); });
test('permission matrix exposes toggle names and prevents edits in disabled mode', async () => { const change=vi.fn(); const user=userEvent.setup(); const module=MODULE_DEFINITIONS.find(m => m.actions.manage)!; render(<PermissionMatrix profile={{ id: 'test', name: 'Test', description: '', isPreset: false, permissions: {} }} onChange={change} disabled/>); await user.click(screen.getByLabelText(`${module.label}: manage`)); expect(change).not.toHaveBeenCalled(); });
