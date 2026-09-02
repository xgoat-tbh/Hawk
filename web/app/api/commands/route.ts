import { NextResponse } from 'next/server';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';

export async function GET() {
  return NextResponse.json({ commands: BOT_COMMAND_CATALOG });
}
