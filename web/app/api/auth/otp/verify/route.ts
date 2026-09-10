import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env';
import { db } from '@/lib/db';
import {
  createSession,
  isAuthorizedUser,
  isBotOwner,
  isBotAdmin,
  ensureAuthTables,
  COOKIE_NAME,
} from '@/lib/auth';
import { fetchDiscordUser } from '@/lib/discord';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, otp } = body;

    if (!userId || typeof userId !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Please provide both User ID and the 6-digit verification code.' }, { status: 400 });
    }

    const cleanId = userId.trim().replace(/[<@!>]/g, '');
    const cleanOtp = otp.trim();

    if (!/^\d{17,20}$/.test(cleanId)) {
      return NextResponse.json({ error: 'Invalid User ID format.' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json({ error: 'Verification code must be 6 digits.' }, { status: 400 });
    }

    // Verify user authorization
    const authorized = await isAuthorizedUser(cleanId);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Access Denied: Your account is not authorized to access the Hawk Dashboard.' },
        { status: 403 }
      );
    }

    await ensureAuthTables();

    // Fetch active OTP record
    const rows = await db`
      SELECT otp_code, attempts, expires_at, locked_until FROM dashboard_otps
      WHERE user_id = ${cleanId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No active verification code found for this account. Please request a new code.' },
        { status: 400 }
      );
    }

    const record = rows[0];
    const now = new Date();

    // Check active lockout
    if (record.locked_until && new Date(record.locked_until) > now) {
      const remainingSec = Math.ceil((new Date(record.locked_until).getTime() - now.getTime()) / 1000);
      const remainingMin = Math.ceil(remainingSec / 60);
      return NextResponse.json(
        { error: `Account locked due to multiple failed attempts. Please wait ${remainingMin} minute(s).` },
        { status: 429 }
      );
    }

    // Check expiration (2 minutes)
    if (new Date(record.expires_at) < now) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Timing-safe comparison to prevent timing attacks
    const userBuffer = Buffer.from(cleanOtp);
    const expectedBuffer = Buffer.from(record.otp_code);
    const isValid =
      userBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(userBuffer, expectedBuffer);

    if (!isValid) {
      const currentAttempts = (record.attempts || 0) + 1;

      if (currentAttempts >= 3) {
        const lockoutTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes lockout
        await db`
          UPDATE dashboard_otps
          SET attempts = ${currentAttempts}, locked_until = ${lockoutTime}
          WHERE user_id = ${cleanId}
        `;
        return NextResponse.json(
          { error: 'Maximum failed attempts exceeded (3/3). Account temporarily locked for 5 minutes.' },
          { status: 429 }
        );
      }

      await db`
        UPDATE dashboard_otps
        SET attempts = ${currentAttempts}
        WHERE user_id = ${cleanId}
      `;

      const attemptsRemaining = 3 - currentAttempts;
      return NextResponse.json(
        { error: `Invalid verification code. ${attemptsRemaining} attempt(s) remaining.` },
        { status: 401 }
      );
    }

    // Correct OTP: Clear OTP record immediately
    await db`DELETE FROM dashboard_otps WHERE user_id = ${cleanId}`;

    // Fetch live user identity from Discord
    const discordUser = await fetchDiscordUser(cleanId);
    const username = discordUser?.username || `User ${cleanId}`;
    const avatar = discordUser?.avatar || null;

    // Create 24-hour server-side session in PostgreSQL
    const sessionToken = await createSession(
      {
        id: cleanId,
        username,
        discriminator: '0',
        avatar,
        isBotOwner: isBotOwner(cleanId),
        isBotAdmin: isBotAdmin(cleanId),
      },
      24
    );

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const res = NextResponse.json({
      success: true,
      user: {
        id: cleanId,
        username,
        avatar,
      },
    });

    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Error verifying login OTP:', error);
    return NextResponse.json({ error: 'Internal server error while verifying code.' }, { status: 500 });
  }
}
