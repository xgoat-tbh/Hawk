import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { getSession } from '@/lib/auth';
import { Shield, Sparkles, Radio, Coins, ArrowRight, Zap, CheckCircle2, Lock } from 'lucide-react';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session} />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Glow background circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/15 blur-[140px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface/80 text-xs font-semibold text-accent mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Discord Bot & Web Dashboard</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Control your Discord Server with <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-violet-400">Precision.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          Configure economy, private voice channels with FASTag, real-time live welcome embed simulators, and community moderation tools through our sleek SaaS dashboard.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/api/auth/login"
            className="px-6 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span>Open Web Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1345431607519121469&permissions=8&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-surface hover:bg-surfaceHover border border-border text-white font-semibold text-sm transition-all"
          >
            <span>Invite Hawk Bot</span>
          </a>
        </div>

        {/* Live Embed Simulator Showcase */}
        <section className="mt-20 w-full max-w-4xl flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
            Live Discord Simulator Preview
          </div>
          <DiscordEmbedSimulator
            title="Welcome to Hawk Community!"
            description="Hey {user}, welcome! Check out our server channels and start earning daily streak currency with `!daily`."
            color="#5865F2"
            imageUrl="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
            thumbnailUrl="{user.avatar}"
            footerText="Member #{server.count} • Hawk 2026"
            serverName="Hawk Community"
            memberCount={1250}
          />
        </section>

        {/* Feature Grid */}
        <section className="mt-28 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-3xl bg-surface/60 border border-border hover:border-accent/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-5">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Economy & Daily Streaks</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Custom currency symbols, daily claim streaks with scaling bonus multipliers, passive chat earnings, and buyable Discord role store.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface/60 border border-border hover:border-accent/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-5">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Private Voice (PVC)</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Join-to-Create temporary voice rooms with hourly currency rentals, FASTag auto-renew, and interactive control panels.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface/60 border border-border hover:border-accent/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Instant DB Sync</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Changes saved in the web dashboard update PostgreSQL atomically and reflect in Discord commands immediately with zero lag.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted">
        <p>© 2026 Hawk Discord Bot & Dashboard. Built for high-performance Discord communities.</p>
      </footer>
    </div>
  );
}
