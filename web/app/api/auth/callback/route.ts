import { NextRequest, NextResponse } from 'next/server';
import { exchangeOAuthCode, fetchUserProfile } from '@/lib/discord';
import { createToken, isBotAdmin, isBotOwner, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = req.cookies.get('discord_oauth_state')?.value;

  const origin = req.nextUrl.origin;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${origin}/api/auth/callback`;

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=Missing authorization code`);
  }

  // Verify state protection if cookie was set
  if (savedState && state !== savedState) {
    return NextResponse.redirect(`${origin}/?error=Invalid OAuth state parameter`);
  }

  const tokenData = await exchangeOAuthCode(code, redirectUri);
  if (!tokenData?.access_token) {
    return NextResponse.redirect(`${origin}/?error=Failed to exchange code with Discord`);
  }

  const profile = await fetchUserProfile(tokenData.access_token);
  if (!profile?.id) {
    return NextResponse.redirect(`${origin}/?error=Failed to retrieve Discord profile`);
  }

  const userSession = {
    id: profile.id,
    username: profile.username,
    discriminator: profile.discriminator || '0',
    avatar: profile.avatar,
    isBotOwner: isBotOwner(profile.id),
    isBotAdmin: isBotAdmin(profile.id),
  };

  const sessionToken = createToken(userSession);

  const res = NextResponse.redirect(`${origin}/dashboard`);
  const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  // Clear OAuth state cookie
  res.cookies.delete('discord_oauth_state');

  return res;
}
