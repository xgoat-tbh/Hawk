'use client';
// Every mutation supplies the session's double-submit token, including OTP and logout.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let token = document.cookie.split('; ').find(v => v.startsWith('hawk_csrf='))?.slice(10);
    if (!token) {
      const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Could not establish a secure request');
      token = (await response.json()).token;
    }
    const headers = new Headers(init.headers);
    headers.set('x-csrf-token', token || '');
    init = { ...init, headers };
  }
  return fetch(input, { credentials: 'same-origin', ...init });
}
