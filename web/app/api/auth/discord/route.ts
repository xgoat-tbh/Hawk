import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Discord OAuth2 is not configured on this server (missing DISCORD_CLIENT_ID).' },
      { status: 500 }
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${origin}/api/auth/callback`;

  // Generate a random state for CSRF mitigation
  const state = Math.random().toString(36).substring(2, 15);

  const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
  discordAuthUrl.searchParams.set('client_id', clientId);
  discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
  discordAuthUrl.searchParams.set('response_type', 'code');
  discordAuthUrl.searchParams.set('scope', 'identify guilds');
  discordAuthUrl.searchParams.set('state', state);
  discordAuthUrl.searchParams.set('prompt', 'consent');

  const res = NextResponse.redirect(discordAuthUrl.toString());
  res.cookies.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  });

  return res;
}
