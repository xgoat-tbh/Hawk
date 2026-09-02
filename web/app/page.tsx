import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { getSession } from '@/lib/auth';
import { Shield, Sparkles, Radio, Coins, ArrowRight, Zap, CheckCircle2, Lock, Terminal, Cpu } from 'lucide-react';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#5865F2] selection:text-white">
      <Navbar user={session} />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Glow ambient background circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#5865F2]/10 blur-[150px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-[#232733] bg-[#10131a] text-xs font-bold uppercase tracking-wider text-[#5865F2] mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Hawk SaaS Control Engine 2.0</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl leading-[1.08] uppercase">
          Precision Discord <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] via-indigo-400 to-cyan-400">Management Cloud.</span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-muted max-w-2xl leading-relaxed font-normal">
          Wick & Dyno-grade configuration suite. Manage economy streaks, temporary private voice rooms with FASTag auto-pay, live welcome simulators, and community tools.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/api/auth/login"
            className="btn-box-primary text-sm px-7 py-3 flex items-center gap-2.5"
          >
            <span>Launch Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1533448303944007800&permissions=8&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="btn-box-secondary text-sm px-7 py-3 flex items-center gap-2"
          >
            <Cpu className="w-4 h-4 text-muted" />
            <span>Add Hawk to Server</span>
          </a>
        </div>

        {/* Live Embed Simulator Showcase */}
        <section className="mt-20 w-full max-w-4xl flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted mb-4">
            <Terminal className="w-4 h-4 text-[#5865F2]" />
            <span>Live Interactive Discord Simulator</span>
          </div>
          <div className="p-1 rounded-2xl bg-gradient-to-b from-[#1f222a] to-transparent shadow-2xl">
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
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-28 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="box-card p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 border-b-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white uppercase tracking-wide">Economy & Daily Streaks</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Custom currency symbols, daily claim streaks with scaling bonus multipliers, passive chat earnings, and buyable Discord role store.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1b1f2b] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <span>Automated Payouts</span>
              <span>⚡ Active</span>
            </div>
          </div>

          <div className="box-card p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 border-b-2 border-violet-500/40 flex items-center justify-center text-violet-400 mb-5 group-hover:scale-105 transition-transform">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white uppercase tracking-wide">Private Voice (PVC)</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Join-to-Create temporary voice rooms with hourly currency rentals, FASTag auto-renew, and interactive control panels.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1b1f2b] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-violet-400">
              <span>FASTag Rental</span>
              <span>⚡ Active</span>
            </div>
          </div>

          <div className="box-card p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 border-b-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white uppercase tracking-wide">Instant DB Sync</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Changes saved in the web dashboard update PostgreSQL atomically and reflect in Discord commands immediately with zero lag.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1b1f2b] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span>Atomic Writes</span>
              <span>⚡ Active</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1b1f2b] py-8 px-6 text-center text-xs text-muted">
        <p>© 2026 Hawk SaaS Dashboard. Engineered for Discord Communities.</p>
      </footer>
    </div>
  );
}
