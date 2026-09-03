import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createToken, isBotOwner, isBotAdmin, COOKIE_NAME } from '@/lib/auth';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
const ADMIN_PASSCODE = process.env.DASHBOARD_PASSCODE || process.env.ADMIN_KEY || '';

// In-memory rate limiting map for login attempts: ip -> { count, lastAttempt }
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();

  const attemptInfo = loginAttempts.get(ip);
  if (attemptInfo && attemptInfo.lockUntil > now) {
    const remainingSec = Math.ceil((attemptInfo.lockUntil - now) / 1000);
    return NextResponse.json(
      { error: `Too many failed login attempts. Please wait ${remainingSec} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { userId, passcode } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid Discord User ID.' }, { status: 400 });
    }

    const cleanId = userId.trim().replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(cleanId)) {
      return NextResponse.json({ error: 'Invalid User ID format. Discord Snowflake IDs are 17-20 digits.' }, { status: 400 });
    }

    // Require passcode to be configured in environment
    if (!ADMIN_PASSCODE) {
      return NextResponse.json(
        { error: 'Developer passcode login is disabled because DASHBOARD_PASSCODE is not configured. Please use Discord OAuth2.' },
        { status: 403 }
      );
    }

    // Verify passcode with timing-safe comparison to prevent timing attacks
    const userBuffer = Buffer.from(String(passcode || ''));
    const expectedBuffer = Buffer.from(ADMIN_PASSCODE);
    const isPasscodeValid =
      userBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedBuffer);

    if (!isPasscodeValid) {
      const count = (attemptInfo?.count || 0) + 1;
      const lockUntil = count >= 5 ? now + 60_000 : 0; // Lock for 60s after 5 failed attempts
      loginAttempts.set(ip, { count, lockUntil });

      return NextResponse.json(
        { error: 'Invalid authentication key / developer passcode.' },
        { status: 401 }
      );
    }

    // Reset failed attempts upon successful authentication
    loginAttempts.delete(ip);

    // Fetch live user details from Discord API using bot token
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
      isBotOwner: isBotOwner(cleanId),
      isBotAdmin: isBotAdmin(cleanId),
    });

    const res = NextResponse.json({
      success: true,
      user: { id: cleanId, username, discriminator, avatar },
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    res.cookies.set(COOKIE_NAME, token, {
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
