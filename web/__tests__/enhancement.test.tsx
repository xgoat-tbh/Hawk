import React from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessPreviewer } from '@/components/Permissions/AccessPreviewer';
import FlowCanvas from '@/components/Commands/FlowCanvas';

const request = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useParams: () => ({ guildId: 'guild' }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', async importOriginal => ({ ...(await importOriginal<object>()), apiFetch: request }));
vi.mock('@xyflow/react', () => ({ ReactFlow: ({ nodes, onNodeClick, children }: any) => <div>{nodes.map((node: any) => <button key={node.id} onClick={() => onNodeClick({}, node)}>{node.data.action}</button>)}{children}</div>, Controls: () => null, Background: () => null, Handle: () => null, Position: {}, MarkerType: {}, applyNodeChanges: vi.fn(), applyEdgeChanges: vi.fn(), addEdge: vi.fn() }));
const role = { id: '123456789012345678', name: 'Moderator', color: 0, position: 1, managed: false, permissions: '0' };
const channel = { id: '234567890123456789', name: 'announcements', type: 0, position: 1 };
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

test('access simulator starts after asynchronous roles arrive', async () => {
 request.mockResolvedValue({ ok: true, json: async () => ({ commands: [], modules: [], summary: { allowed: 0, denied: 0, overridden: 0 } }) });
 const props = { profiles: [], rolePolicies: [], userOverrides: [] };
 const view = render(<AccessPreviewer {...props} roles={[]}/>);
 view.rerender(<AccessPreviewer {...props} roles={[role]}/>);
 await waitFor(() => expect(request).toHaveBeenCalledWith(expect.stringContaining(`targetId=${role.id}`), expect.anything()));
});

test('flow inspector offers named role/channel choices instead of typing IDs', async () => {
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 const change = vi.fn(); const user = userEvent.setup();
 const flow: any = { nodes: [{ id: 'r', position: { x: 0, y: 0 }, data: { action: 'hasRole', args: {} } }, { id: 'c', position: { x: 200, y: 0 }, data: { action: 'send', args: {} } }], edges: [] };
 render(<FlowCanvas flow={flow} onChange={change} roles={[role]} channels={[channel]}/>);
 await user.click(screen.getByRole('button', { name: 'hasRole' }));
 await user.click(screen.getByRole('button', { name: 'hasRole role' }));
 await user.click(screen.getByRole('option', { name: /Moderator/ }));
 expect(change.mock.calls.at(-1)?.[0].nodes[0].data.args.roleId).toBe(role.id);
 await user.click(screen.getByRole('button', { name: 'send' }));
 await user.click(screen.getByRole('button', { name: 'send channel' }));
 await user.click(screen.getByRole('option', { name: /announcements/ }));
 expect(change.mock.calls.at(-1)?.[0].nodes[1].data.args.channelId).toBe(channel.id);
});

test('protected 401 returns to login but invalid OTP stays on the login flow', async () => {
 const actualApi = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
 const redirect = vi.fn();
 vi.stubGlobal('window', { location: { href: 'http://localhost:3000/dashboard/guild', origin: 'http://localhost:3000', pathname: '/dashboard/guild', replace: redirect } });
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
 await actualApi.apiFetch('/api/auth/otp/verify'); expect(redirect).not.toHaveBeenCalled();
 await actualApi.apiFetch('/api/guilds/guild'); expect(redirect).toHaveBeenCalledWith('/?session=expired');
});
