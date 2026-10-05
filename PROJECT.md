# Project: Amo Bot Revamp & Terminal Console Operating System

## Architecture
Amo Bot is a hybrid Discord bot and Next.js 15 administrative console built on TypeScript, PostgreSQL, and Discord.js v14.
- **Frontend (`web/`)**: Next.js 15 App Router with React 19, TypeScript, Tailwind CSS, Iron-session OTP auth, and persistent forms via `useFormDraft`.
- **Backend Bot (`src/`)**: Discord.js v14 client, `TTLCache` repositories, PostgreSQL connection pool (`postgres.js`), modular command executors, and embedded HTTP endpoints.
- **Database (`postgres`)**: PostgreSQL schemas tracking configurations, economy balances, transactions, items, permissions, stickies, and PVC sessions.
- **IPC / Cache Invalidation**: PostgreSQL `LISTEN`/`NOTIFY` real-time invalidation bus connecting Next.js API mutations to bot `TTLCache` repos.

---

## Feature Inventory
Every feature identified during Survey is assigned to a milestone.

| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Dark Terminal Foundation | Near-black theme (`#08090a` / `#0b0f12`), dark surfaces, geometric borders | M1 | Survey 1, R1 |
| 2 | Monospace Numbered Nav | Sidebar with 13 routes, numbered tags `[01] Console` .. `[13] Developers` | M1 | Survey 1, R1 |
| 3 | Tactical UI Primitives | Mechanical buttons (80-160ms), 1px borders, restrained emerald status accents | M1 | Survey 1, R1 |
| 4 | Technical Console Navbar | Gateway ping indicator, guild status badge, monospace breadcrumb | M1 | Survey 1, R1 |
| 5 | Real-time Cache Invalidation | PostgreSQL `LISTEN`/`NOTIFY` bus syncing web mutations to bot `TTLCache` | M2 | Survey 2, R2 |
| 6 | Telemetry Migration & Logging | Create `030_command_telemetry.sql`, record command metrics in `CommandExecutor` | M2 | Survey 2, R2 |
| 7 | Store Schema Synchronization | Ensure all 16 `store_items` columns exist in `web/lib/db.ts` `ensureDatabaseSchema` | M2 | Survey 1, Survey 2 |
| 8 | PVC Discord REST Termination | Call Discord REST to delete voice channel on dashboard PVC room terminate | M2 | Survey 1, Survey 2 |
| 9 | Root ESLint Cleanup | Fix 7 `prefer-const` and empty block ESLint errors in `src/` | M2 | Survey 3 |
| 10 | Console Overview (`/`) | Terminal console layout, live metrics, activity sparkline, zero mock data | M3 | Survey 1, R1 |
| 11 | Developers & Telemetry (`/developers`) | Live CPU, memory, shard ping, uptime, cache flush, and bot maintenance actions | M3 | Survey 1, R1 |
| 12 | General Settings (`/general`) | Prefix, log channel, audit channel, commander role in terminal styling | M3 | Survey 1, R1 |
| 13 | Economy Dashboard (`/economy`) | Currency symbol, bank limits, user balances, transactions, audit logs | M4 | Survey 1, R1 |
| 14 | Store Catalog (`/store`) | 16-field items (stock, inventory, roles, replies, icons) in terminal console | M4 | Survey 1, R1 |
| 15 | Role Salaries & Intervals (`/income`) | Role salaries + payout interval/cadence config with real DB mutations | M4 | Survey 1, R1 |
| 16 | Minigames & Wagers (`/games`) | Cooldowns + min/max bets, multipliers, and game enable toggles | M4 | Survey 1, R1 |
| 17 | Welcome Greetings (`/welcome`) | Welcome text, embed builder, live test message to Discord channel | M5 | Survey 1, R1 |
| 18 | Community Feedback (`/community`) | Feedback, suggestion channel, confessions, voting rules | M5 | Survey 1, R1 |
| 19 | Private Voice Channels (`/pvc`) | PVC master hub, user defaults, live room inspection with instant termination | M5 | Survey 1, R1 |
| 20 | Gaming LFG & Matchmaking (`/gaming`) | Voice ping notifications and gaming lobby matchmaking controls | M5 | Survey 1, R1 |
| 21 | Sticky Notices (`/sticky`) | Channel assignments, dynamic variable tags, live bot update | M5 | Survey 1, R1 |
| 22 | Permissions & ACLs (`/permissions`) | Preset profiles, role policies, user overrides, command ACL drawers | M5 | Survey 1, R1 |
| 23 | E2E Testing Suite (Tiers 1-4) | Requirement-driven opaque-box tests covering all 12 modules | M6 Phase 1 | Survey 3, Dual Track |
| 24 | Adversarial Hardening (Tier 5) | White-box stress testing, edge-case probing, concurrency validation | M6 Phase 2 | Project Pattern |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Core Design System & Navigation | `ThemeContext.tsx`, `globals.css`, `Sidebar.tsx`, `Navbar.tsx`, UI components | none | PLANNED |
| M2 | Cache Invalidation & Backend Hardening | `dispatcher.ts`, `guildConfigRepo.ts`, `030_command_telemetry.sql`, `lib/db.ts`, `pvc/manage` | none | PLANNED |
| M3 | Console Overview & Telemetry / Developers | `/dashboard/[guildId]`, `/developers`, `/general` | M1, M2 | PLANNED |
| M4 | Economy, Store, Income & Games | `/economy`, `/store`, `/income`, `/games` | M1, M2 | PLANNED |
| M5 | Community, Welcome, PVC, Gaming, Sticky, Perms | `/welcome`, `/community`, `/pvc`, `/gaming`, `/sticky`, `/permissions` | M1, M2 | PLANNED |
| M6 | E2E Testing Pass & Adversarial Hardening | Tier 1-4 validation + Tier 5 white-box challenger loop | M1-M5, TEST_READY | PLANNED |

---

## Interface Contracts

### Cache Invalidation Bus: Web ↔ Bot Client
- **Channel**: PostgreSQL `LISTEN hawk_cache_invalidation` / `NOTIFY hawk_cache_invalidation, '<payload>'`
- **Payload Schema**:
  ```json
  {
    "type": "prefix" | "permissions" | "economy" | "pvc" | "maintenance" | "store",
    "guildId": "string",
    "timestamp": 1726320000000
  }
  ```
- **Handler in Bot**: `src/core/database/repositories/cacheInvalidator.ts` listens on connection and clears target entries in `TTLCache`.
- **Publisher in Web**: `web/app/api/guilds/[id]/config/dispatcher.ts` notifies on successful DB write.

### PVC Termination: Web ↔ Discord REST API
- **Endpoint**: `POST /api/guilds/[id]/pvc/manage`
- **Contract**:
  1. Verify caller has admin/manage guild authority.
  2. Execute `DELETE FROM pvc_sessions WHERE channel_id = $1`.
  3. Call `DELETE https://discord.com/api/v10/channels/{channel_id}` via `web/lib/discord.ts` using bot token.
  4. Emit cache invalidation event.

### Developers Telemetry & Maintenance Contract
- **Endpoint**: `GET /api/guilds/[id]/telemetry`
- **Response**:
  ```json
  {
    "cpuUsage": 1.4,
    "memoryUsageMb": 142.5,
    "heapUsedMb": 98.2,
    "uptimeSeconds": 86400,
    "gatewayLatencyMs": 32,
    "shardCount": 1,
    "guildCount": 12,
    "cachedMembers": 450,
    "activePvcRooms": 3
  }
  ```
- **Maintenance Actions**: `POST /api/guilds/[id]/maintenance` with `{ action: 'flush_cache' | 'restart_shard' | 'force_resync' }`.

---

## Code Layout

```
d:\Hawk\
├── src/
│   ├── client/ (BotClient.ts)
│   ├── commands/
│   ├── core/
│   │   ├── database/ (pool.ts, migrations/, repositories/)
│   │   ├── server/ (HealthServer.ts)
│   │   └── web/ (startWeb.ts)
│   └── modules/ (economy, pvc, voice, moderation, community)
├── web/
│   ├── app/
│   │   ├── api/guilds/[id]/ (activity, audit, config, economy, games, permissions, pvc, stats, store, telemetry)
│   │   └── dashboard/[guildId]/ (overview, welcome, community, economy, store, income, games, pvc, gaming, sticky, permissions, general, developers)
│   ├── components/ (Sidebar.tsx, Navbar.tsx, SaveBar.tsx, ui/)
│   ├── context/ (GuildContext.tsx, ThemeContext.tsx)
│   ├── hooks/ (useFormDraft.ts, usePolling.ts)
│   ├── lib/ (db.ts, discord.ts, auth.ts, permissions.ts)
│   └── styles/ (globals.css)
└── tests/
    ├── api/
    ├── e2e/
    └── unit/
```
