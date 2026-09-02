import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedUser, createToken } from '@/lib/auth';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid Discord User ID.' }, { status: 400 });
    }

    const cleanId = userId.trim().replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(cleanId)) {
      return NextResponse.json({ error: 'Invalid User ID format. Discord Snowflake IDs are 17-20 digits.' }, { status: 400 });
    }

    const authorized = await isAuthorizedUser(cleanId);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Access Denied: Your Discord User ID is not authorized to access this private dashboard.' },
        { status: 403 }
      );
    }

    // Fetch user details from Discord API using bot token
    let username = `User ${cleanId}`;
    let discriminator = '0';
    let avatar: string | null = null;

    if (BOT_TOKEN) {
      try {
        const discordRes = await fetch(`https://discord.com/api/v10/users/${cleanId}`, {
          headers: { Authorization: `Bot ${BOT_TOKEN}` },
        });
        if (discordRes.ok) {
          const u = await discordRes.json();
          username = u.username;
          discriminator = u.discriminator || '0';
          avatar = u.avatar;
        }
      } catch (err) {
        console.warn('Could not fetch Discord user details for', cleanId, err);
      }
    }

    const token = createToken({
      id: cleanId,
      username,
      discriminator,
      avatar,
    });

    const res = NextResponse.json({
      success: true,
      user: { id: cleanId, username, discriminator, avatar },
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    res.cookies.set('hawk_session', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error during authentication.' }, { status: 500 });
  }
}
