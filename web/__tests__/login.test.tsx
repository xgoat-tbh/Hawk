import React from 'react';
import { test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/page';
import { ThemeProvider } from '@/context/ThemeContext';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch: api }));
test('requests a DM code and allows pasting all six digits into the OTP boxes', async () => {
  api.mockImplementation(async (path: string) => ({ ok: true, json: async () => path.endsWith('/me') ? { authenticated: false } : { expiresInSeconds: 120 } }));
  const user = userEvent.setup(); render(<ThemeProvider><LoginPage/></ThemeProvider>);
  await user.type(screen.getByLabelText('Discord User ID'), '123456789012345678');
  await user.click(screen.getByRole('button', { name: 'Send a code to my DMs' }));
  const first = await screen.findByLabelText('Verification digit 1'); await user.click(first); await user.paste('123456');
  await waitFor(() => expect((screen.getByLabelText('Verification digit 6') as HTMLInputElement).value).toBe('6'));
  expect((screen.getByRole('button', { name: 'Open dashboard' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: /Resend in/ }) as HTMLButtonElement).disabled).toBe(true);
});
