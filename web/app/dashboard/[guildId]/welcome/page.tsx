'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function WelcomeEmbedRedirectPage() {
  const router = useRouter();
  const { guildId } = useParams() as { guildId: string };

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(`/dashboard/${guildId}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [guildId, router]);

  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-4">
      <div className="w-12 h-12 rounded-lg bg-[#121417] border border-[#24272b] flex items-center justify-center mx-auto text-[#f1f2f3]">
        <MessageSquare className="w-6 h-6" />
      </div>
      <h2 className="text-sm font-semibold text-[#f1f2f3]">Welcome Greetings are Managed via Bot Commands</h2>
      <p className="text-xs text-[#a9adb2] leading-relaxed">
        Welcome and leave greetings are configured directly inside Discord using the <code className="text-[#f1f2f3] font-mono bg-[#17191c] px-1.5 py-0.5 rounded">!welcome</code> and <code className="text-[#f1f2f3] font-mono bg-[#17191c] px-1.5 py-0.5 rounded">!greet</code> commands.
      </p>
      <div className="pt-2">
        <Link
          href={`/dashboard/${guildId}`}
          className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-xs"
        >
          <span>Return to Server Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}