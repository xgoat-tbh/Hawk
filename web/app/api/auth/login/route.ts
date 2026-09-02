import { NextResponse } from 'next/server';
import { getDiscordOAuthUrl } from '@/lib/discord';

export async function GET() {
  const url = getDiscordOAuthUrl();
  return NextResponse.redirect(url);
}
