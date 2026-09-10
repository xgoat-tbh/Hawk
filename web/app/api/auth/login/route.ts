import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Static passcode authentication has been retired for security. Please authenticate via the Discord Bot OTP flow.',
    },
    { status: 410 }
  );
}

