import { NextResponse } from 'next/server';

export async function GET() {
  const hawkClient = (globalThis as any).hawkClient;
  const botReady = Boolean(hawkClient?.isReady?.());

  return NextResponse.json({
    status: 'ok',
    service: 'Hawk Unified Bot & Dashboard',
    botReady,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
