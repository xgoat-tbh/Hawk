# Hawk Dashboard & Bot: Complete Rebuild Implementation Plan

## Goal
Full rebuild of the Hawk Discord bot web dashboard from login to every page, plus security hardening, code audit fixes, UX/accessibility overhaul, and a new custom command flow builder feature. Single-phase execution with strict review.

**Priority Split**: 40% UI/UX · 40% Feature & Security · 20% Performance

---

## User Review Required

> [!IMPORTANT]
> **Feature Removal**: Media-only channels feature will be **removed** from both dashboard and consideration. Casino minigames **kept** per your confirmation.

> [!IMPORTANT]
> **Framework Decision**: Keeping Next.js 15 App Router (not migrating to Vite). React + Tailwind + shadcn/ui hybrid with existing custom components stays.

> [!IMPORTANT]
> **Animation Migration**: Anime.js v4 beta → Framer Motion. Every animation in the codebase will be rewritten.

> [!IMPORTANT]
> **New Feature**: Custom Prefix Command Flow Builder (hybrid visual + scripting) — this is a significant new page with no existing code. Estimated as ~15% of total effort.

> [!WARNING]
> **Critical Security Fix**: `/api/auth/dev-login` route grants **unauthenticated 48-hour Bot Owner sessions in production**. This will be deleted immediately as Step 0.

> [!WARNING]
> **Hardcoded Credentials Found**:
> - `scripts/transfer_db.ts` — plaintext Postgres password
> - `scripts/test_ui_e2e.mjs` — hardcoded session token + machine paths
> - `web/lib/db.ts` — fallback DB connection string

> [!CAUTION]
> **Access Model Change**: Discord server admins can **view** dashboard, only whitelisted users can **modify**. This requires reworking the `canManageGuild` function to return a permission level (viewer/editor/owner) instead of boolean.

---

## Open Questions

> [!IMPORTANT]
> **Q1**: For the command flow builder, should flows be stored in PostgreSQL (new `custom_commands` table) or as JSON files on disk? PostgreSQL recommended for dashboard CRUD.

> [!IMPORTANT]
> **Q2**: IP allowlisting — should this be configurable via the dashboard UI, or hardcoded in environment variables? Dashboard UI recommended but adds complexity.

> [!IMPORTANT]
> **Q3**: Session timeout duration — you want configurable. Default 24h currently. Should it be per-user or global? Global recommended.

---

## Audit Findings Summary

### 🔴 Critical (Fix Immediately)
| # | Finding | Location | Impact |
|---|---------|----------|--------|
| C1 | Dev login route — no env check | `web/app/api/auth/dev-login/route.ts` | Full account takeover in production |
| C2 | Hardcoded DB credentials in transfer script | `scripts/transfer_db.ts` L~50 | Credential leak if repo exposed |
| C3 | Hardcoded session token in E2E script | `scripts/test_ui_e2e.mjs` L~30 | Session hijack if leaked |
| C4 | **`reset-economy.ts` missing `return`** — guild name mismatch check falls through, wipes economy unconditionally | `src/modules/economy/reset-economy.ts` L17-20 | **Total economy wipe on typo** |
| C5 | **`reset-money.ts` missing `return`** — permission check falls through, any user can wipe another's balance | `src/modules/economy/reset-money.ts` L20-24 | **Unauthorized balance wipe** |
| C6 | **Store role bypass** — `buyItem()` called without `ctx.member`, `roleRequired` check evaluates falsy, any user buys restricted items | `src/modules/store/buy-item.ts` L44 + `storeService.ts` L209 | **Access control bypass** |
| C7 | **Table name mismatch** — queries `economy_audit_logs` (plural) but table is `economy_audit_log` (singular) | `src/modules/economy/money-audit-log.ts` L20 | **Postgres 42P01 crash** |

### 🟠 High (Fix in Rebuild)
| # | Finding | Location | Impact |
|---|---------|----------|--------|
| H1 | Fallback DB URL with default password | `web/lib/db.ts` | Silent auth bypass if env missing |
| H2 | Community handler can't set channel to null | `handlers/community.ts` | Orphaned config rows |
| H3 | No CSRF protection on POST routes | All `/api/` POST routes | Cross-site request forgery |
| H4 | No rate limiting on API endpoints | All `/api/` routes | DoS/brute-force |
| H5 | No CSP headers | `next.config.mjs` | XSS vulnerability surface |
| H6 | "Amo Bot" branding artifact | `sticky/page.tsx` L456 | Branding inconsistency |
| H7 | Stale TSC error logs in repo | `tsc_errors.log`, `tsc_errors2.log` | Confusion/noise |
| H8 | ThemeContext forces dark-only | `context/ThemeContext.tsx` | No light mode toggle |
| H9 | **`set-income-reset.ts` bad field key** — `passiveCooldown` not in `ALLOWED_FIELDS`, silently fails | `src/modules/economy/set-income-reset.ts` L21 | Config change silently ignored |
| H10 | **Income role parsing fragility** — uses naive regex instead of `RoleResolver` | `src/modules/income/*.ts` | Fails on role IDs/names |
| H11 | **Hardcoded `$` currency symbol** in games/income | `src/modules/games/mines.ts`, `income/update-income.ts` | Ignores configured symbol |
| H12 | **Aggressive message deletion** — `ResponseBuilder` force-deletes user messages without ManageMessages check | `src/core/responses/ResponseBuilder.ts` L38,90,104 | DiscordAPIError 50013 crash |
| H13 | **Unawaited promises** in PVC commands | `src/modules/pvc/au.ts` L18,24 | Unhandled rejections |
| H14 | **Owner access/restrict case-sensitivity** — inconsistent module name normalization | `src/modules/owner/access.ts`, `restrict.ts` | Bypass via casing tricks |

### 🟡 Medium (Fix for Quality)
| # | Finding | Location | Impact |
|---|---------|----------|--------|
| M1 | E2E Tier 2 test assertion mismatch | `tests/e2e/tier2` subtest 6 | False test failure |
| M2 | Adversarial test uses stale markup regex | `tests/adversarial_theme_layout.test.ts` | Broken test suite |
| M3 | Missing aria-labels on icon buttons | Multiple components | WCAG AA violation |
| M4 | Text contrast `#555a62` on `#0b0d10` = 2.8:1 | `globals.css` `text-muted` | WCAG AA violation (needs 4.5:1) |
| M5 | Tables lack mobile card views | `economy/page.tsx`, `store/page.tsx` | Broken mobile UX |
| M6 | `npm test` fails due to adversarial test | `package.json` test script | CI blocker |
| M7 | No React component unit tests | `web/components/` | Zero UI test coverage |
| M8 | No API route integration tests | `web/app/api/` | Zero API test coverage |

### 🟢 Low (Polish)
| # | Finding | Location | Impact |
|---|---------|----------|--------|
| L1 | dotenv redundant in web package | `web/package.json` | Extra dependency |
| L2 | Anime.js uses beta API | `web/package.json` | API instability risk |
| L3 | Stale dist artifacts | `dist/` | Build pollution |
| L4 | No CI/CD pipeline | Root | Manual deploy process |

---

## Proposed Changes

### Component 0: Security Emergency Fixes
*Must happen before any other work.*

---

#### [DELETE] `web/app/api/auth/dev-login/route.ts`
**Why**: Unauthenticated endpoint grants 48h bot-owner sessions. No environment guard. Delete entirely — use OTP flow even in development.

#### [MODIFY] `scripts/transfer_db.ts`
- Remove hardcoded `postgresql://amoindia:mypsswrd@103.118.182.43:5432/...` fallback
- Read target URL from `TARGET_DATABASE_URL` env var only
- Add confirmation prompt before `TRUNCATE CASCADE`

#### [MODIFY] `scripts/test_ui_e2e.mjs`
- Remove hardcoded session token and user ID
- Read from env vars `TEST_SESSION_TOKEN`, `TEST_USER_ID`, `TEST_GUILD_ID`
- Remove hardcoded `C:/Users/Outcast/` path

#### [MODIFY] `web/lib/db.ts`
- Remove `|| 'postgresql://postgres:postgres@localhost:5432/hawk'` fallback
- Throw startup error if `DATABASE_URL` is not set

#### [DELETE] `tsc_errors.log`, `tsc_errors2.log`
Add to `.gitignore`.

---

### Component 1: Design System & Theme Overhaul (40% UI)
*New dark navy/charcoal palette with blue-purple accents. Full light/dark toggle.*

---

#### [MODIFY] `web/tailwind.config.mjs`
Complete redesign of the color system:

```js
// FROM: Terminal black (#0b0d10 base)
// TO: Dark navy/charcoal with blue-purple accents

colors: {
  // Surface layers (dark mode)
  surface: {
    0: '#0f1117',  // App background — dark navy
    1: '#151821',  // Cards, sidebar
    2: '#1a1e2a',  // Elevated cards
    3: '#1f2433',  // Dropdowns, popovers
    4: '#252a3c',  // Hover states
    5: '#2b3145',  // Active/selected
  },
  // Light mode surfaces (NEW)
  'surface-light': {
    0: '#f8f9fc',
    1: '#ffffff',
    2: '#f1f3f9',
    3: '#e8ebf2',
    4: '#dfe3ed',
    5: '#d5d9e6',
  },
  // Accent: Blue-purple spectrum
  accent: {
    DEFAULT: '#6366f1', // Indigo-500
    light: '#818cf8',
    dark: '#4f46e5',
    muted: '#6366f11a',
  },
  // Text (WCAG AA compliant)
  text: {
    primary: '#e2e8f0',    // slate-200 — 12.6:1 on surface-0
    secondary: '#94a3b8',  // slate-400 — 5.7:1 on surface-0
    muted: '#64748b',      // slate-500 — 4.6:1 on surface-0 ✅ AA
    inverse: '#0f172a',    // For light mode
  },
  // Status (unchanged, proven)
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
    info: '#3b82f6',
  },
  discord: {
    blurple: '#5865f2',
  },
}
```

#### [MODIFY] `web/context/ThemeContext.tsx`
**From**: Dark-only forced theme
**To**: Full dark/light toggle with system preference detection

```tsx
// New ThemeProvider with persistence
type Theme = 'dark' | 'light' | 'system';
// - Read from localStorage on mount
// - Respect prefers-color-scheme when 'system'
// - Toggle button in Navbar
// - CSS variables swap via class='dark' | class='light' on <html>
```

#### [MODIFY] `web/styles/globals.css`
- Rewrite all hardcoded dark colors to use CSS variables
- Add light-mode variable layer
- Fix `text-muted` contrast: `#64748b` minimum (4.6:1 ratio)
- Replace custom scrollbar with cross-browser solution
- Add `@layer` organization: base, components, utilities
- Add focus-visible ring styles for all interactive elements

#### [NEW] `web/lib/design-tokens.ts`
Centralized design token constants for spacing, radius, shadows, z-index:
```ts
export const tokens = {
  radius: { sm: '6px', md: '8px', lg: '12px', xl: '16px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.3)',
    lg: '0 10px 15px rgba(0,0,0,0.3)',
    glow: '0 0 20px rgba(99,102,241,0.15)',
  },
  spacing: { page: '24px', section: '20px', card: '16px' },
  transition: { fast: '150ms', normal: '200ms', slow: '300ms' },
};
```

---

### Component 2: Animation System Migration

---

#### [MODIFY] `web/package.json`
```diff
- "@animejs/core": "4.0.0-beta.96",
+ "framer-motion": "^11.15.0",
```

#### [DELETE] `web/lib/animations.ts`
Replace Anime.js wrapper entirely.

#### [NEW] `web/lib/motion.ts`
Framer Motion variants and shared animation configs:
```ts
import { type Variants } from 'framer-motion';

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const modalVariants: Variants = { /* scale + opacity */ };
export const drawerVariants: Variants = { /* slide from right */ };
export const saveBarVariants: Variants = { /* slide from bottom */ };
export const staggerContainer: Variants = { /* stagger children */ };
export const staggerItem: Variants = { /* fade + slide up */ };

// Respect prefers-reduced-motion
export const reducedMotion = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};
```

#### [MODIFY] Every animated component:
- `AnimatedDrawer.tsx` → Framer Motion `AnimatePresence` + `motion.div`
- `AnimatedModal.tsx` → Framer Motion portal with backdrop
- `SaveBar.tsx` → `motion.div` with `saveBarVariants`
- `PageTransition.tsx` → `AnimatePresence` with `pageVariants`
- `useAnimation.ts` → Replaced by `motion.div` with `staggerContainer`

---

### Component 3: shadcn/ui Integration + Component Overhaul

---

#### [NEW] Install shadcn/ui dependencies
```bash
npx shadcn@latest init
# Components to install:
npx shadcn@latest add button dialog dropdown-menu input label \
  select sheet table tabs toast tooltip separator scroll-area \
  command popover switch badge avatar card skeleton alert
```

#### Components migration matrix:

| Current Custom Component | Action | New Implementation |
|---|---|---|
| `HawkSelect.tsx` | **Replace** with shadcn `Select` | Radix primitive + Tailwind |
| `AnimatedModal.tsx` | **Replace** with shadcn `Dialog` + Framer Motion | Radix Dialog + motion wrapper |
| `AnimatedDrawer.tsx` | **Replace** with shadcn `Sheet` + Framer Motion | Radix Sheet + motion wrapper |
| `DataTable.tsx` | **Replace** with shadcn `Table` + custom pagination | TanStack Table optional |
| `ConfirmModal.tsx` | **Replace** with shadcn `AlertDialog` | Radix AlertDialog |
| `Toast.tsx` | **Replace** with shadcn `Toast` (sonner) | Sonner toast |
| `Toggle.tsx` | **Replace** with shadcn `Switch` | Radix Switch |
| `CommandPalette.tsx` | **Replace** with shadcn `Command` | cmdk-based palette |
| `HawkScrollArea.tsx` | **Keep** (custom brand scrollbar) | Polish only |
| `ChannelPicker.tsx` | **Keep** (Discord-specific) | Add aria-labels |
| `RolePicker.tsx` | **Keep** (Discord-specific) | Add aria-labels |
| `UserPicker.tsx` | **Keep** (Discord-specific) | Add aria-labels |
| `StatCard.tsx` | **Keep** | Polish + responsive |
| `StatusBadge.tsx` | **Keep** | Map to shadcn `Badge` variants |
| `SettingRow.tsx` | **Keep** | Add responsive stacking |
| `PageHeader.tsx` | **Keep** | Polish |
| `SectionHeader.tsx` | **Keep** | Polish |
| `RangeSlider.tsx` | **Keep** | Add aria attrs |
| `DiscordEmbedSimulator.tsx` | **Keep** | Polish colors for new palette |
| `CommandPicker.tsx` | **Keep** | Add keyboard nav |

---

### Component 4: Login Page Rebuild

---

#### [MODIFY] `web/app/page.tsx`
Complete redesign of the OTP login flow:

**Current**: Basic form with Snowflake ID input → OTP input
**New Design**:
```
┌─────────────────────────────────────────────┐
│                                             │
│        🦅 Hawk Dashboard                    │
│        ──────────────────                   │
│                                             │
│   ┌─────────────────────────────────┐       │
│   │  Step 1: Enter your Discord ID  │       │
│   │                                 │       │
│   │  [___________________] [→]      │       │
│   │                                 │       │
│   │  ℹ️ Right-click your profile    │       │
│   │    → Copy User ID              │       │
│   └─────────────────────────────────┘       │
│                                             │
│   ┌─────────────────────────────────┐       │
│   │  Step 2: Check your DMs        │       │
│   │                                 │       │
│   │  [_] [_] [_] [_] [_] [_]       │       │
│   │                                 │       │
│   │  Code expires in 1:47           │       │
│   │  [Resend Code]                  │       │
│   └─────────────────────────────────┘       │
│                                             │
│   Dark/Light toggle    v1.0.0               │
└─────────────────────────────────────────────┘
```

Key improvements:
- Individual digit OTP input fields (6 boxes, auto-advance)
- Countdown timer showing OTP expiry (2 min)
- Resend button with 30s cooldown
- Better error states (invalid ID, locked out, DM failed)
- Framer Motion step transitions
- Mobile-responsive centered card layout
- Accessible: keyboard-navigable, screen reader labels
- Helper text explaining how to find Discord User ID

---

### Component 5: Server Selection Screen Rebuild

---

#### [MODIFY] `web/app/dashboard/page.tsx`
**Current**: Grid of guild cards
**New Design**: Since there are only 2 servers (main + Yolo test), optimize for that:

```
┌─────────────────────────────────────────────┐
│  Hawk Dashboard  ·  Select Server           │
│                                             │
│  ┌───────────────────┐  ┌─────────────────┐ │
│  │  🏠 Main Server   │  │  🧪 Yolo (Test) │ │
│  │  ───────────────  │  │  ─────────────  │ │
│  │  👥 1,234 members │  │  👥 12 members  │ │
│  │  ✅ Bot Online    │  │  ✅ Bot Online  │ │
│  │                   │  │                 │ │
│  │  [Manage →]       │  │  [Manage →]     │ │
│  └───────────────────┘  └─────────────────┘ │
│                                             │
│  ┌─ Quick Status ─────────────────────────┐ │
│  │  Bot Uptime: 14d 3h  ·  Ping: 32ms    │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Visual distinction: main server gets primary accent, test server gets muted/dimmed
- Bot status indicator per server
- Quick stats summary
- Last login timestamp
- Responsive: stacks vertically on mobile

---

### Component 6: Sidebar + Navbar Rebuild

---

#### [MODIFY] `web/components/Sidebar.tsx`
Redesigned navigation with:
- Collapsible rail mode (icon-only) with tooltip labels
- Section headers: **Overview**, **Configuration**, **Economy**, **Access Control**
- Active route indicator: left accent bar + background highlight
- Responsive: drawer on mobile (triggered by hamburger in Navbar)
- Server mini-profile at top (icon + name + online badge)
- Theme toggle at bottom
- Logout button at bottom

**Navigation structure (revised)**:
```
[Overview]
  📊 Dashboard
  ⚙️ General Settings

[Configuration]
  👋 Welcome
  💬 Community (Suggestions + Confessions)
  📌 Sticky Notices
  🎮 Gaming LFG
  🔊 Private Voice (PVC)

[Economy]
  💰 Economy
  💼 Role Income
  🏪 Store
  🎲 Minigames

[Access Control]
  🔒 Permissions
  🛡️ Custom Commands (NEW)

[System]
  🔧 Developers
```

#### [MODIFY] `web/components/Navbar.tsx`
- Breadcrumb: `Hawk > Server Name > Current Page`
- Quick actions: Send Message, Add Reward (keep)
- System Health button (keep)
- Command Palette trigger `Ctrl+K` (upgrade to shadcn `Command`)
- User avatar + dropdown (logout, theme toggle)
- Mobile: hamburger menu for sidebar drawer

#### [MODIFY] `web/components/GuildDashboardShell.tsx`
- Integrate responsive sidebar drawer
- Add `AnimatePresence` for page transitions
- Skeleton loading state while GuildProvider loads

---

### Component 7: Dashboard Overview Rebuild

---

#### [MODIFY] `web/app/dashboard/[guildId]/page.tsx`
**New layout**:
```
┌─────────────────────────────────────────────────┐
│  Dashboard Overview                             │
│                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │Members │ │Messages│ │ Uptime │ │  Ping    │ │
│  │ 1,234  │ │ 42/hr  │ │ 14d 3h │ │  32ms   │ │
│  └────────┘ └────────┘ └────────┘ └──────────┘ │
│                                                 │
│  ┌─ Activity Chart (24h) ─────────────────────┐ │
│  │  [Lightweight SVG sparkline / Chart.js]    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─ Quick Actions ──┐ ┌─ Recent Activity ─────┐ │
│  │ 💬 Send Message  │ │ [10:32] User joined   │ │
│  │ 🎁 Add Reward    │ │ [10:30] /bal command  │ │
│  │ 🔊 Create Voice  │ │ [10:28] Config saved  │ │
│  └──────────────────┘ └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- Replace Recharts with lightweight Chart.js (canvas) or custom SVG sparkline
- Real-time stats via WebSocket (Socket.IO) instead of polling
- Skeleton loading states
- Responsive: 2-col on tablet, 1-col on mobile

---

### Component 8: All Configuration Pages Rebuild

Each page follows the same pattern:
1. `PageHeader` with title + description
2. `SectionHeader` groups
3. `SettingRow` items with appropriate controls
4. Auto-save via `useFormDraft` + toast notifications
5. Framer Motion stagger entrance
6. Mobile-responsive stacked layout

---

#### [MODIFY] `general/page.tsx`
- Prefix input with live validation (1-5 chars, no spaces)
- Commander role picker (shadcn Select)
- Log channel picker
- Audit channel picker
- All inputs wired to auto-save

#### [MODIFY] `welcome/page.tsx`
- Enable/disable toggle
- Channel picker for welcome channel
- Embed builder with live Discord preview
- Variable inserter buttons (`{user}`, `{server}`, `{membercount}`)
- Test message button with 5s cooldown indicator
- Color picker for embed accent

#### [MODIFY] `community/page.tsx`
- Suggestions toggle + channel picker
- Confessions toggle + channel picker + log channel
- **Bug fix**: Handler must properly set channel to NULL when disabled (fix H2)

#### [MODIFY] `sticky/page.tsx`
- Fix "Amo Bot" → "Hawk" branding (H6)
- Sticky message list with inline edit
- Channel binding selector
- Message content editor with preview

#### [MODIFY] `gaming/page.tsx`
- LFG voice triggers list
- Role ping selector per game
- Test channel configuration

#### [MODIFY] `pvc/page.tsx`
- Setup wizard (one-click category + JTC channel creation)
- Hourly rental rate slider
- Live active sessions list with terminate action
- User defaults management

#### [MODIFY] `economy/page.tsx`
- Currency symbol input
- Starting balance slider
- Daily reward + streak bonus config
- Passive income toggle + amount
- Top balances table → mobile card view (fix M5)
- Transaction log → mobile card view

#### [MODIFY] `income/page.tsx`
- Role salary list with add/edit/delete
- Payout interval configuration
- Role picker for salary assignment

#### [MODIFY] `store/page.tsx`
- Item catalog grid/list toggle
- Item creation modal (shadcn Dialog)
- All 16 fields properly exposed
- Stock management
- Mobile card view (fix M5)

#### [MODIFY] `games/page.tsx`
- Cooldown sliders for each minigame
- Enable/disable toggles per game
- Min/max bet configuration

#### [MODIFY] `permissions/page.tsx`
- 6 sub-tabs stay (Profiles, Role Policies, User Overrides, Command ACLs, Simulator, Audit)
- Upgrade to shadcn `Tabs`
- Permission matrix → responsive layout
- Simulator with better UX feedback

#### [MODIFY] `developers/page.tsx`
- System metrics dashboard
- Process memory + CPU gauges
- Gateway latency
- Cache flush action
- Command catalog browser

---

### Component 9: New Feature — Custom Command Flow Builder

---

#### [NEW] `web/app/dashboard/[guildId]/commands/page.tsx`
Hybrid visual flow builder + script editor for custom prefix commands.

**Design**:
```
┌────────────────────────────────────────────────────┐
│  Custom Commands                    [+ New Command] │
│                                                    │
│  ┌─ Command List ──────────────────────────────┐   │
│  │  !welcome  ·  Sends welcome embed  ·  ✅   │   │
│  │  !rules    ·  Posts server rules   ·  ✅   │   │
│  │  !ticket   ·  Opens ticket flow    ·  ⚠️   │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  ┌─ Flow Editor ───────────────────────────────┐   │
│  │  Trigger: !welcome {user?}                  │   │
│  │                                             │   │
│  │  ┌─[Condition]──┐    ┌─[Action]─────────┐  │   │
│  │  │ Has Role?    │───→│ Send Embed      │  │   │
│  │  │ @Member      │    │ #{welcome-ch}   │  │   │
│  │  └──────────────┘    └─────────────────┘  │   │
│  │        │ No                                │   │
│  │  ┌─[Action]─────┐                         │   │
│  │  │ Reply Error  │                         │   │
│  │  │ "No perms"   │                         │   │
│  │  └──────────────┘                         │   │
│  │                                             │   │
│  │  [Switch to Script Editor]                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  ┌─ Script Editor (Advanced) ──────────────────┐   │
│  │  ```                                        │   │
│  │  trigger "!welcome" {                       │   │
│  │    args: [user?: mention]                   │   │
│  │    if (user.hasRole("@Member")) {           │   │
│  │      send(#welcome-ch, embed({              │   │
│  │        title: "Welcome!",                   │   │
│  │        description: "{user} joined!"        │   │
│  │      }))                                    │   │
│  │    } else {                                 │   │
│  │      reply("You need @Member role")         │   │
│  │    }                                        │   │
│  │  }                                          │   │
│  │  ```                                        │   │
│  │  [Autocomplete: send, reply, embed,         │   │
│  │   addRole, removeRole, wait, react, etc.]   │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Implementation details**:

#### [NEW] Database schema: `030_custom_commands.sql`
```sql
CREATE TABLE IF NOT EXISTS custom_commands (
  id          SERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  trigger     TEXT NOT NULL,
  flow_json   JSONB NOT NULL,    -- Visual flow graph
  script_text TEXT,               -- Script equivalent
  enabled     BOOLEAN DEFAULT true,
  cooldown_ms INTEGER DEFAULT 0,
  required_roles TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, name)
);
```

#### [NEW] `web/app/api/guilds/[id]/commands/route.ts`
CRUD API for custom commands.

#### [NEW] `web/components/Commands/FlowCanvas.tsx`
Visual node-based editor using `@xyflow/react` (React Flow):
- Trigger node (command name + args)
- Condition nodes (has role, has permission, channel check)
- Action nodes (send message, send embed, add/remove role, reply, react, wait)
- Drag-to-connect edges
- Validation before save

#### [NEW] `web/components/Commands/ScriptEditor.tsx`
Monaco-based code editor with:
- Custom language definition for command DSL
- Autocomplete for actions, variables, channel/role references
- Syntax highlighting
- Bidirectional sync with flow canvas (edit one, updates the other)

#### [NEW] `src/core/commands/CustomCommandExecutor.ts`
Bot-side executor that:
- Loads custom commands from DB on startup
- Listens for cache invalidation on changes
- Parses flow_json at runtime
- Executes action nodes sequentially
- Sandboxed (no eval, predefined action set only)

---

### Component 10: Security Hardening

---

#### [NEW] `web/middleware.ts`
Next.js middleware for:

```ts
// 1. CSRF Protection
// Generate CSRF token per session, validate on all POST/PUT/DELETE
// Double-submit cookie pattern

// 2. Rate Limiting
// In-memory sliding window rate limiter
// - Auth endpoints: 5 req/min per IP
// - Config endpoints: 30 req/min per session
// - Read endpoints: 60 req/min per session

// 3. Session Validation
// Check session cookie on all /api/guilds/* and /dashboard/* routes
// Redirect to login if expired

// 4. IP Allowlisting (optional)
// If ALLOWED_IPS env var is set, reject non-matching IPs
```

#### [MODIFY] `next.config.mjs`
Add security headers:
```js
headers: [
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-XSS-Protection', value: '0' }, // Modern CSP preferred
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.discordapp.com data:; connect-src 'self' wss:; font-src 'self';"
      },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    ],
  },
],
```

#### [MODIFY] `web/lib/auth.ts`
**Access model change**: `canManageGuild` returns permission level instead of boolean:
```ts
type AccessLevel = 'owner' | 'admin' | 'editor' | 'viewer' | 'none';

export async function getAccessLevel(userId: string, guildId: string): Promise<AccessLevel> {
  // Owner bypass
  if (isBotOwner(userId)) return 'owner';
  if (isBotAdmin(userId)) return 'admin';
  
  // Check dashboard_access for explicit whitelist → 'editor'
  // Check Discord permissions (admin/manage_guild) → 'viewer'
  // Default → 'none'
}
```

All POST/PUT/DELETE handlers check `level !== 'viewer'` before mutations.

#### [NEW] `web/lib/csrf.ts`
CSRF token generation and validation utilities.

#### [NEW] `web/lib/rateLimit.ts`
Sliding window rate limiter with configurable tiers.

#### [MODIFY] `web/app/api/guilds/[id]/config/helpers.ts`
Harden input sanitization:
- Add `cleanSnowflakeArray` for multi-ID inputs
- Add `cleanJSON` for embed/flow data with depth limits
- Add `cleanUrl` with SSRF protection (block private IPs, metadata endpoints)
- Max length enforcement on all string inputs

#### [NEW] `web/lib/auditLogger.ts`
Unified audit log for all dashboard admin actions:
```ts
export async function logDashboardAction(params: {
  userId: string;
  guildId: string;
  action: string;
  module: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) { /* dual-write to activity_log + in-memory buffer */ }
```

---

### Component 11: WebSocket Real-time Layer

---

#### [NEW] `web/lib/socket.ts`
Socket.IO client setup:
```ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/api/socketio', transports: ['websocket'] });
  }
  return socket;
}
```

#### [NEW] `src/core/web/socketHandler.ts`
Server-side Socket.IO handler integrated with the bot process:
```ts
// Events emitted to dashboard:
// - 'stats:update' — member count, message rate, voice users
// - 'activity:new' — new activity log entry
// - 'config:changed' — config was changed (by bot command or another admin)
// - 'pvc:update' — PVC session created/destroyed
// - 'economy:transaction' — new economy event
```

#### [MODIFY] `web/hooks/usePolling.ts`
Add WebSocket mode: prefer WS, fallback to polling if WS unavailable.

---

### Component 12: Accessibility Hardening (WCAG 2.1 AA)

---

**Global fixes across all components:**

1. **Focus management**:
   - Visible focus rings on all interactive elements (2px accent outline)
   - Focus trap in all modals/drawers (already exists via `useDialog`)
   - Skip-to-content link on main layout
   - Logical tab order

2. **ARIA attributes**:
   - `aria-label` on all icon-only buttons (Navbar actions, table row actions)
   - `aria-describedby` on form inputs with help text
   - `aria-live="polite"` on toast container and save bar
   - `role="status"` on stat cards
   - `aria-current="page"` on active sidebar link

3. **Color contrast** (all WCAG AA 4.5:1 minimum):
   - `text-muted`: `#64748b` (4.6:1) ← was `#555a62` (2.8:1)
   - `text-secondary`: `#94a3b8` (5.7:1)
   - All status colors tested against both surface layers

4. **Keyboard navigation**:
   - `Escape` closes modals/drawers (exists)
   - Arrow keys in dropdowns/pickers
   - `Enter`/`Space` activates buttons and toggles
   - `Tab` cycles through form fields logically

5. **Screen reader support**:
   - Semantic HTML (`<nav>`, `<main>`, `<aside>`, `<header>`)
   - Heading hierarchy (h1 → h2 → h3, no skips)
   - Table headers with `scope="col"`

6. **Motion**:
   - Respect `prefers-reduced-motion: reduce` (already via Anime.js, carry to Framer Motion)
   - `motion.div` variants detect and skip animations

---

### Component 13: Mobile Responsiveness

---

**Breakpoint strategy** (mobile-first):
```
sm: 640px   — Small tablets
md: 768px   — Tablets
lg: 1024px  — Laptops
xl: 1280px  — Desktops
```

**Key responsive behaviors:**

| Component | Mobile (< 640px) | Tablet (640-1024px) | Desktop (> 1024px) |
|---|---|---|---|
| Sidebar | Hidden, hamburger drawer | Collapsed rail (icons) | Full sidebar (240px) |
| Navbar | Compact, menu icon | Full with actions | Full with actions |
| Stat cards | 1 column, full width | 2 columns | 4 columns |
| Data tables | Card view (stacked) | Horizontal scroll | Full table |
| Settings rows | Stacked (label above input) | Side-by-side | Side-by-side |
| Modals | Full-screen bottom sheet | Centered overlay | Centered overlay |
| Flow builder | Script-only mode | Side panel | Full canvas + panel |

#### [NEW] `web/components/ui/ResponsiveTable.tsx`
Wrapper that auto-switches between table view (desktop) and card view (mobile):
```tsx
// Detects viewport, renders <table> on desktop, stacked cards on mobile
// Configurable breakpoint threshold
// Cards show: primary field as title, secondary fields as label:value pairs
```

---

### Component 14: Performance Optimization (20%)

---

1. **Bundle size reduction**:
   - Remove `@animejs/core` (→ Framer Motion, tree-shakeable)
   - Remove `dotenv` from web package (redundant with Next.js)
   - Replace Recharts with Chart.js or lightweight custom SVG
   - Dynamic imports for heavy components (FlowCanvas, ScriptEditor)

2. **Rendering optimization**:
   - `React.memo` on pure display components (StatCard, StatusBadge, SettingRow)
   - `useMemo` for derived data in permission matrix and command catalog
   - `useCallback` for stable handler references in lists
   - Virtual scrolling for long lists (economy leaderboard, transactions)

3. **Network optimization**:
   - WebSocket for real-time data (replace polling)
   - `stale-while-revalidate` pattern for guild data
   - Request deduplication in GuildContext
   - Compress API responses (gzip via Next.js config)
   - Discord API cache TTL tuning (current 30-60s is good)

4. **Database optimization**:
   - Add indexes on frequently queried columns:
     ```sql
     CREATE INDEX idx_activity_log_guild_created ON activity_log(guild_id, created_at DESC);
     CREATE INDEX idx_economy_balances_guild_net ON economy_balances(guild_id, (cash + bank) DESC);
     CREATE INDEX idx_economy_transactions_guild ON economy_transactions(guild_id, created_at DESC);
     CREATE INDEX idx_dashboard_sessions_token ON dashboard_sessions(token);
     CREATE INDEX idx_custom_commands_guild ON custom_commands(guild_id, enabled);
     ```

5. **Code splitting**:
   - Each dashboard page is already a separate Next.js page (good)
   - Lazy load modal contents (FlowCanvas, permission matrix)
   - Lazy load Chart.js only on overview page

---

### Component 15: Test Infrastructure Fixes

---

#### [MODIFY] `tests/e2e/tier2_boundary_corner.test.ts`
Fix subtest 6: Align assertion with `useFormDraft.ts` behavior (whitespace preserved intentionally).

#### [MODIFY] `tests/adversarial_theme_layout.test.ts`
Update regex patterns to match current sidebar markup (`w-[240px]`, `<HawkScrollArea>`).

#### [MODIFY] `package.json` test script
Exclude broken tests or fix them so `npm test` passes:
```json
"test": "tsx --test tests/unit/**/*.test.ts tests/e2e/**/*.test.ts"
```

#### [NEW] `web/__tests__/` directory structure
Add React component tests with Vitest + React Testing Library:
- Login page flow test
- Server selector test
- Config save/discard test
- Permission matrix test

---

### Component 16: Bot-Side Fixes

---

#### [MODIFY] `web/app/api/guilds/[id]/config/handlers/community.ts`
Fix null channel bug:
```ts
// FROM: if (sugChannel) { update... }
// TO: Always update, set to NULL if empty/disabled
if (data.suggestions_enabled === false || !sugChannel) {
  await db`UPDATE suggestion_configs SET channel_id = NULL WHERE guild_id = ${guildId}`;
} else {
  await db`INSERT INTO suggestion_configs ...`;
}
```

#### [MODIFY] `web/app/dashboard/[guildId]/sticky/page.tsx`
Fix branding: "Amo Bot" → "Hawk" on line 456.

---

### Component 17: Bot Core Critical Bug Fixes

---

#### [MODIFY] `src/modules/economy/reset-economy.ts`
**C4 — Missing return statement after guild name mismatch:**
```diff
  if (name !== ctx.guild.name) {
    await respond.error(`Confirmation name mismatched...`);
+   return;
  }
  await resetEconomy(ctx.guild.id);
```

#### [MODIFY] `src/modules/economy/reset-money.ts`
**C5 — Missing return statement after permission check:**
```diff
  if (!ctx.member.permissions.has('ManageGuild')) {
    await respond.error('You do not have permission to reset user balances.');
+   return;
  }
  await resetBalance(ctx.guild.id, targetUser.id);
```

#### [MODIFY] `src/modules/store/buy-item.ts`
**C6 — Pass `ctx.member` to `buyItem()` so role requirement check works:**
```diff
- await buyItem(ctx.guild.id, ctx.message.author.id, item.itemId, quantity);
+ await buyItem(ctx.guild.id, ctx.message.author.id, item.itemId, quantity, ctx.member);
```

#### [MODIFY] `src/modules/economy/money-audit-log.ts`
**C7 — Fix table name from plural to singular:**
```diff
- FROM economy_audit_logs
+ FROM economy_audit_log
```

#### [MODIFY] `src/modules/economy/set-income-reset.ts`
**H9 — Fix field key from `passiveCooldown` to `incomeReset`:**
```diff
- await setEconomyConfigField(ctx.guild.id, 'passiveCooldown', duration);
+ await setEconomyConfigField(ctx.guild.id, 'incomeReset', duration);
```
Remove `.catch(() => {})` — let errors propagate so users see real failures.

#### [MODIFY] `src/modules/income/add-income-role.ts`, `remove-income-role.ts`, `update-income-role.ts`
**H10 — Replace naive regex with `RoleResolver`:**
```diff
- const match = args[0]?.match(/<@&(\d+)>/);
- if (!match) return respond.error('Please mention a role');
- const roleId = match[1];
+ const role = await RoleResolver.resolve(ctx, args[0]);
+ if (!role) return respond.error('Could not find that role');
+ const roleId = role.id;
```

#### [MODIFY] `src/modules/games/mines.ts`, `src/modules/income/update-income.ts`
**H11 — Use configured currency symbol instead of hardcoded `$`:**
```diff
- const symbol = '$';
+ const config = await getEconomyConfig(ctx.guild.id);
+ const symbol = config?.currencySymbol ?? '$';
```

#### [MODIFY] `src/core/responses/ResponseBuilder.ts`
**H12 — Guard message deletion with permission check:**
```diff
  if (forceClean) {
-   this.message.delete().catch(() => {});
+   if (this.message.guild?.members.me?.permissionsIn(this.message.channel).has('ManageMessages')) {
+     this.message.delete().catch(() => {});
+   }
  }
```

#### [MODIFY] `src/modules/pvc/au.ts`
**H13 — Add missing `await` on response calls:**
```diff
- ctx.respond.error('You are not in a voice channel');
+ await ctx.respond.error('You are not in a voice channel');
```

#### [MODIFY] `src/modules/owner/access.ts`, `src/modules/owner/restrict.ts`
**H14 — Normalize module names to lowercase for consistent matching:**
```diff
+ const moduleName = args[1]?.toLowerCase();
- if (args[1] === 'owner') return respond.error('Cannot modify owner module');
+ if (moduleName === 'owner') return respond.error('Cannot modify owner module');
```

## File Change Summary

| Action | Count | Files |
|--------|-------|-------|
| **DELETE** | 4 | `dev-login/route.ts`, `tsc_errors.log`, `tsc_errors2.log`, `animations.ts` |
| **NEW** | ~15 | `design-tokens.ts`, `motion.ts`, `csrf.ts`, `rateLimit.ts`, `middleware.ts`, `socket.ts`, `socketHandler.ts`, `ResponsiveTable.tsx`, `FlowCanvas.tsx`, `ScriptEditor.tsx`, `CustomCommandExecutor.ts`, `030_custom_commands.sql`, `commands/route.ts`, `commands/page.tsx`, `auditLogger.ts` |
| **MODIFY** | ~45 | All existing pages, components, API routes, configs |
| **REPLACE** | ~10 | Custom components → shadcn/ui equivalents |

**Estimated total files touched**: ~70

---

## Dependency Changes

```diff
# web/package.json
- "@animejs/core": "4.0.0-beta.96"
- "recharts": "3.10.1"
- "dotenv": "^16.5.0"
+ "framer-motion": "^11.15.0"
+ "chart.js": "^4.4.0"
+ "react-chartjs-2": "^5.2.0"
+ "@xyflow/react": "^12.0.0"      # Flow builder canvas
+ "monaco-editor": "^0.50.0"       # Script editor
+ "@monaco-editor/react": "^4.6.0"
+ "socket.io-client": "^4.8.0"

# Root package.json
+ "socket.io": "^4.8.0"

# shadcn/ui (auto-installed via CLI)
+ "@radix-ui/react-dialog"
+ "@radix-ui/react-dropdown-menu"
+ "@radix-ui/react-select"
+ "@radix-ui/react-switch"
+ "@radix-ui/react-tabs"
+ "@radix-ui/react-tooltip"
+ "@radix-ui/react-scroll-area"
+ "@radix-ui/react-alert-dialog"
+ "@radix-ui/react-popover"
+ "cmdk"
+ "sonner"
+ "class-variance-authority"
+ "tailwind-merge" (already present)
+ "clsx" (already present)
```

---

## Verification Plan

### Automated Tests
```bash
# TypeScript compilation
npx tsc --noEmit
npx tsc --noEmit -p web

# Existing test suite (should pass after fixes)
npm test

# Lint
npm run lint

# Build
npm run build
```

### Manual Verification

1. **Login Flow**: 
   - Enter valid Snowflake → receive DM → enter OTP → redirected to dashboard
   - Enter invalid ID → clear error message
   - Enter wrong OTP 3 times → lockout message
   - Try `/api/auth/dev-login` → should 404

2. **Server Selection**:
   - Both servers visible with correct stats
   - Click main server → loads dashboard
   - Mobile view → cards stack vertically

3. **Dashboard Overview**:
   - Stats populate with real data (no mocks)
   - Activity chart renders
   - Quick actions work

4. **Every Config Page**:
   - Change a setting → toast shows "Saved"
   - Change setting → navigate away → beforeunload warning
   - Discard → reverts to original
   - Mobile responsive layout

5. **Security**:
   - Open browser devtools → verify CSP headers present
   - Verify `hawk_session` cookie is HttpOnly, Secure, SameSite=Lax
   - Try CSRF attack → should be blocked
   - Hit rate limits → should get 429

6. **Accessibility**:
   - Tab through entire login flow with keyboard only
   - Run Lighthouse accessibility audit → target 90+
   - Screen reader test on key flows

7. **Theme Toggle**:
   - Switch dark → light → verify all text readable
   - Switch to system → verify follows OS preference
   - Refresh → preference persists

8. **Custom Commands** (if in scope):
   - Create flow visually → save → verify in DB
   - Switch to script editor → verify sync
   - Test command in Discord → verify execution

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Browser (React + Next.js)"]
        LP["Login Page<br/>OTP Flow"]
        SS["Server Selector"]
        DB["Dashboard Shell"]
        SP["Config Pages"]
        FB["Flow Builder"]
    end

    subgraph Server["Node.js Process"]
        NX["Next.js API Routes"]
        MW["Middleware<br/>CSRF + Rate Limit + Auth"]
        SIO["Socket.IO Server"]
        BOT["Discord.js Bot Client"]
        CE["Custom Command Executor"]
    end

    subgraph Data["PostgreSQL"]
        PG["guild_config<br/>economy_*<br/>welcome_*<br/>permissions<br/>custom_commands<br/>dashboard_sessions"]
    end

    subgraph Discord["Discord API"]
        GW["Gateway WebSocket"]
        REST["REST API v10"]
    end

    LP -->|OTP Verify| MW
    SS -->|GET /api/guilds| NX
    SP -->|POST config| MW --> NX
    FB -->|CRUD commands| NX
    DB -->|WebSocket| SIO

    NX -->|Read/Write| PG
    NX -->|NOTIFY| PG
    PG -->|LISTEN| BOT
    BOT -->|Cache Invalidate| BOT

    SIO -->|Stats, Activity| Client
    BOT <-->|Gateway| GW
    NX -->|REST calls| REST
    BOT -->|Send DM| REST
    CE -->|Execute flows| BOT
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Anime.js → Framer Motion breaks animations | Medium | Low | Incremental migration, test each component |
| shadcn/ui style conflicts with existing Tailwind | Medium | Medium | Reset shadcn defaults to match Hawk palette |
| Flow builder complexity underestimated | High | Medium | Start with simple actions, expand iteratively |
| WebSocket adds debugging complexity | Low | Low | Fallback to polling if WS fails |
| Light mode colors not tested thoroughly | Medium | Medium | Dedicated light-mode pass with contrast checker |
| Database migration breaks existing data | Low | High | Backup before migration, test on Yolo server first |
