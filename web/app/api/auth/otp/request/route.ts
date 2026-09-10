import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import '@/lib/env';
import { db } from '@/lib/db';
import { isAuthorizedUser, ensureAuthTables } from '@/lib/auth';
import { sendDirectMessage } from '@/lib/discord';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid Discord User ID.' }, { status: 400 });
    }

    const cleanId = userId.trim().replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(cleanId)) {
      return NextResponse.json({ error: 'Invalid User ID format. Discord Snowflake IDs are 17-20 digits.' }, { status: 400 });
    }

    // Pre-check authorization: Only Bot Owners, Bot Admins, or users in dashboard_access can receive an OTP
    const authorized = await isAuthorizedUser(cleanId);
    if (!authorized) {
      return NextResponse.json(
        {
          error: 'Access Denied: Your Discord account is not authorized to access the Hawk Dashboard. Please contact the bot owner.',
        },
        { status: 403 }
      );
    }

    await ensureAuthTables();

    // Check existing OTP record for lockouts and cooldowns
    const existing = await db`
      SELECT attempts, created_at, locked_until FROM dashboard_otps
      WHERE user_id = ${cleanId}
      LIMIT 1
    `;

    const now = new Date();
    if (existing.length > 0) {
      const record = existing[0];

      // 1. Lockout check
      if (record.locked_until && new Date(record.locked_until) > now) {
        const remainingSec = Math.ceil((new Date(record.locked_until).getTime() - now.getTime()) / 1000);
        const remainingMin = Math.ceil(remainingSec / 60);
        return NextResponse.json(
          { error: `Too many failed attempts. Account temporarily locked for ${remainingMin} minute(s).` },
          { status: 429 }
        );
      }

      // 2. 30-second resend cooldown check
      const lastCreated = new Date(record.created_at).getTime();
      const elapsedSec = Math.floor((now.getTime() - lastCreated) / 1000);
      if (elapsedSec < 30) {
        const waitTime = 30 - elapsedSec;
        return NextResponse.json(
          { error: `Please wait ${waitTime}s before requesting a new verification code.` },
          { status: 429 }
        );
      }
    }

    // Generate cryptographically secure 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes expiry

    // Upsert into database
    await db`
      INSERT INTO dashboard_otps (user_id, otp_code, attempts, created_at, expires_at, locked_until)
      VALUES (${cleanId}, ${otpCode}, 0, NOW(), ${expiresAt}, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        otp_code = ${otpCode},
        attempts = 0,
        created_at = NOW(),
        expires_at = ${expiresAt},
        locked_until = NULL
    `;

    // Deliver plain text DM with bold numbers to user
    const dmText = `Your Hawk Dashboard verification code is: **${otpCode}**\nThis code will expire in 2 minutes. Do not share this code with anyone.`;
    const dmResult = await sendDirectMessage(cleanId, dmText);

    if (!dmResult.success) {
      return NextResponse.json(
        {
          error:
            dmResult.error ||
            'Could not deliver DM to your Discord account. Please ensure your Direct Messages from server members are allowed.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your Discord DMs.',
      expiresInSeconds: 120,
    });
  } catch (error) {
    console.error('Error requesting login OTP:', error);
    return NextResponse.json({ error: 'Internal server error while generating verification code.' }, { status: 500 });
  }
}
