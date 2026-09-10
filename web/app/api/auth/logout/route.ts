import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(token).catch(() => {});
  }
  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.delete(COOKIE_NAME);
  return res;
}

