import { NextRequest, NextResponse } from 'next/server';
import { exchangeOAuthCode, fetchDiscordUser } from '@/lib/discord';
import { createToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url));
  }

  try {
    const accessToken = await exchangeOAuthCode(code);
    const user = await fetchDiscordUser(accessToken);

    const token = createToken({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      accessToken,
    });

    const res = NextResponse.redirect(new URL('/dashboard', req.url));
    res.cookies.set('hawk_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  }
}
