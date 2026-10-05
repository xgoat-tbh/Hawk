import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '@/components/ui/Toggle';
import { DataTable } from '@/components/ui/DataTable';
test('switch is keyboard operable and exposes the checked state', async () => { const change = vi.fn(); const user = userEvent.setup(); render(<Toggle label="Enable welcome" checked={false} onChange={change}/>); const control = screen.getByRole('switch'); control.focus(); await user.keyboard(' '); expect(change).toHaveBeenCalledWith(true); expect(control.getAttribute('aria-checked')).toBe('false'); });
test('table paginates and offers the same fields as mobile cards', () => { render(<DataTable columns={[{ key: 'name', header: 'Name' },{ key: 'value', header: 'Balance' }]} data={[{ name: 'One', value: 100 },{ name: 'Two', value: 200 }]} rowKey={r => r.name} pageSize={1}/>); expect(screen.getAllByText('One')).toHaveLength(2); expect(screen.queryByText('Two')).toBeNull(); expect(screen.getByRole('columnheader', { name: 'Balance' })).toBeTruthy(); });
