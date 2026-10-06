# HAWK SYSTEM AUDIT & ENHANCEMENT PLAN

Comprehensive audit findings, technical remediation specs, and autonomous agent side prompt for Discord Bot (`src/`) and Next.js Dashboard (`web/`).

---

## 1. Audit Summary (49 Total Issues)

| Domain | Critical | High | Medium | Low | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Bot Core & Economy Logic** | 2 | 6 | 7 | 2 | **17** |
| **Dashboard API & Security** | 1 | 6 | 6 | 3 | **16** |
| **Dashboard UI/UX & Theme** | 1 | 4 | 7 | 4 | **16** |
| **Total** | **4** | **16** | **20** | **9** | **49** |

---

## 2. Technical Findings & Remediation Specs

### Phase 1: Security & Privilege Escalation (P0)

#### 1.1 Global Privilege Escalation via User Overrides
- **File**: `web/app/api/guilds/[id]/permissions/route.ts` (L124-128, L144-152)
- **Problem**: Saving `user_overrides` inserts target user IDs into global `dashboard_access` table. Grants target users global `editor` access across **ALL** servers. Removing user deletes global `dashboard_access` row, revoking access from other guilds.
- **Fix**:
  - Remove all queries referencing `dashboard_access` from `permissions/route.ts`.
  - Scope all override reads, writes, and deletes strictly to `user_overrides` table keyed by `(guild_id, user_id)`.

#### 1.2 Legitimate Discord Server Owners & Admins Blocked
- **File**: `web/lib/auth.ts` (L250-256)
- **Problem**: `getAccessLevel()` grants `editor` access only to users listed in global `dashboard_access` or bot admin env. Discord server owners and users with `Administrator`/`ManageGuild` permissions are forced to `viewer`.
- **Fix**: Check Discord guild ownership (`guild.owner`) and permissions bitflag (`Administrator` / `ManageGuild`). Return `'owner'` or `'editor'` for that specific guild.

#### 1.3 Health Endpoint Blocked by Auth Middleware
- **File**: `web/middleware.ts` (L47-55)
- **Problem**: Middleware blocks all `/api/*` routes except `/api/auth/*`. Uptime probes, Docker, and container orchestrators hitting `/api/health` receive `401 Unauthorized`.
- **Fix**: Whitelist `/api/health`: `(api && !path.startsWith('/api/auth/') && path !== '/api/health')`.

#### 1.4 Rate-Limit IP Fallback Collision
- **File**: `web/middleware.ts` (L16-22)
- **Problem**: When IP extraction yields `null`, key falls back to shared `auth:unidentified`. One attacker hitting limit locks out all anonymous users from OTP login.
- **Fix**: Parse rightmost trusted proxy hop or bind auth rate limit key to submitted `userId` from request body.

#### 1.5 Strict CSRF & Origin Validation
- **File**: `web/lib/csrf.ts` (L8, L14-17), `web/middleware.ts` (L28-32)
- **Problem**: `validateOrigin` returns `true` if `origin` is missing. Host check `host?.startsWith('localhost')` is bypassable. OTP endpoints bypass CSRF.
- **Fix**: Require strict Origin header on mutations. Compare hostname equality strictly. Enforce CSRF token on `/api/auth/otp/request` and `/api/auth/otp/verify`.

#### 1.6 Hash Stored OTP Codes
- **File**: `web/app/api/auth/otp/request/route.ts` & `verify/route.ts`
- **Problem**: Plaintext 6-digit OTP codes stored in `dashboard_otps` table.
- **Fix**: Store SHA-256 hash (`crypto.createHash('sha256').update(code).digest('hex')`).

---

### Phase 2: Bot Core & Economy Race Condition Hardening (P0)

#### 2.1 Infinite Money Glitch via Balance Reset
- **File**: `src/modules/economy/reset-money.ts` (L27-37), `src/modules/economy/economyService.ts` (L298-301)
- **Problem**: `resetUser()` executes `DELETE FROM economy_balances`. Deletes cooldown timestamps (`daily_last`, `work_last`, etc.). Exploiter claims daily/income -> transfers cash to alt -> runs `reset-money` -> row deleted -> claims daily again immediately.
- **Fix**: Soft-reset balances only: `UPDATE economy_balances SET cash = 0, bank = 0 WHERE guild_id = $1 AND user_id = $2`. Never delete row or clear cooldown timestamps on user self-reset.

#### 2.2 Income Command Concurrency Race Condition
- **File**: `src/modules/income/incomeService.ts` (L22-57, L59-100, L102-143, L145-195, L229-257)
- **Problem**: `executeWork`, `executeSlut`, `executeCrime`, `executeRob`, `collectIncome` read cooldown timestamps without row locks. Concurrent burst messages execute multiple commands simultaneously before DB timestamp write.
- **Fix**: Wrap commands in database transaction with `SELECT ... FOR UPDATE` row lock before cooldown verification and balance mutation.

#### 2.3 Welcome Panel Unauthenticated Configuration
- **File**: `src/modules/welcome/_welcomeHandler.ts` (L25-87)
- **Problem**: Button interactions and modal submissions lack permission checks. Any non-admin member can click welcome panel button, submit modal, and overwrite guild welcome/leave messages.
- **Fix**: Verify `interaction.member.permissions.has('ManageGuild')` on button interactions and modal submissions.

#### 2.4 PVC Voice Channel Privilege Escalation
- **File**: `src/modules/pvc/_pvcGatekeeper.ts` (L59, L91), `_pvcSelectHandler.ts` (L55)
- **Problem**: Grants `ManageChannels` permission flag to room owner on created voice channel. User can edit permission overrides, bypass name filters, or delete channel directly.
- **Fix**: Remove `ManageChannels` grant. Room settings must be managed exclusively through bot commands/panels.

#### 2.5 Native Discord Administrator Check Omission
- **File**: `src/core/permissions/PermissionChecker.ts` (L9-14)
- **Problem**: `getAuthorityLevel()` checks only `guildOwnerId` and database bot permits. Ignores native Discord `Administrator` bitflag.
- **Fix**: Check `member.permissions.has(PermissionFlagsBits.Administrator)` and assign proper authority level.

#### 2.6 Orphaned PVC Voice Channels on Cache Eviction
- **File**: `src/modules/pvc/_pvcGatekeeper.ts` (L43), `_pvcButtonHandler.ts` (L30), `_pvcSelectHandler.ts` (L17)
- **Problem**: Uses `channels.cache.get()` without `fetch()`. Discord client sweepers evict inactive channels, causing duplicate channel creation and orphaned channels.
- **Fix**: Replace with `await guild.channels.fetch(channelId).catch(() => null)`.

#### 2.7 Confession Panel Spam Vector
- **File**: `src/modules/confession/_confessionHandler.ts`
- **Problem**: Suggestion panel enforces cooldowns and guild blacklists, but confession submission modal lacks both.
- **Fix**: Add user submission cooldown and guild blacklist checks matching suggestion system.

#### 2.8 Post-Execution Cooldown Race Condition
- **File**: `src/core/commands/CommandExecutor.ts` (L261-262)
- **Problem**: `setCooldown()` called *after* `await command.execute()`. Rapid requests bypass cooldown while first execution awaits DB/Discord I/O.
- **Fix**: Set cooldown timestamp before execution. Remove cooldown only on syntax/input validation errors.

#### 2.9 Role Stripping via Message Purge
- **File**: `src/modules/moderation/purge.ts` (L39-43)
- **Problem**: `purge role <@role>` command requires only `ManageMessages`, not `ManageRoles`.
- **Fix**: Require `ManageRoles` permission specifically when subcommand is `role`.

#### 2.10 AFK Rate-Limit Loop on Discord API
- **File**: `src/modules/general/_afkHandler.ts` (L76-84)
- **Problem**: Regex `/^\[AFK\]\s*/i` checked on non-AFK members on every message. If user's native Discord username starts with `[AFK]`, bot attempts to rename user on every message, hitting rate limits.
- **Fix**: Store boolean in DB/cache indicating whether bot renamed user; only strip nickname if bot set it.

---

### Phase 3: Dashboard API & Data Integrity Hardening (P1)

#### 3.1 Destructive Partial Configuration Updates
- **File**: `web/app/api/guilds/[id]/config/handlers/general.ts` (L8-32), `handlers/pvc.ts` (L5-36)
- **Problem**: Omitting fields in payload (e.g. submitting only `{ prefix: "!" }`) writes `NULL` to `audit_channel_id`, `log_channel_id`, and PVC category settings.
- **Fix**: Use dynamic partial updates (`COALESCE` or dynamic SQL generation) updating only supplied keys.

#### 3.2 Missing Database Tables & Schema Drift
- **File**: `web/lib/db.ts` (L46-318)
- **Problem**: `ensureDatabaseSchema()` omits tables and columns used across routes:
  1. `suggestion_configs` (`community.ts:9`)
  2. `confession_configs` (`community.ts:24`)
  3. `guild_audit_logs` (`lib/audit.ts:40`)
  4. Missing columns on `store_items`: `icon_url`, `usable`, `sellable`, `stock`, `role_required`, `role_given`, `role_removed`, `reply_message`, `requirements_json`, `actions_json`.
- **Fix**: Add `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` in `web/lib/db.ts`.

#### 3.3 Numeric Overflow & Input Validation
- **File**: `web/app/api/guilds/[id]/economy/users/route.ts` (L86-97)
- **Problem**: Non-numeric strings cause `NaN` 500 errors. Huge numbers overflow integer bounds.
- **Fix**: Clamp numeric inputs: `Number.isSafeInteger(val) && val >= 0 && val <= 1_000_000_000_000`. Validate snowflakes with `/^\d{17,20}$/`.

#### 3.4 Public Audit Log Injection
- **File**: `web/app/api/guilds/[id]/audit/route.ts` (L29-58)
- **Problem**: Public POST endpoint allows client to forge arbitrary audit entries.
- **Fix**: Delete public POST route; audit logs must be created server-side only during actual mutations.

#### 3.5 Test Welcome Mass-Mention Injection
- **File**: `web/app/api/guilds/[id]/test-welcome/route.ts` (L98-100)
- **Problem**: Plain text mode uses `allowed_mentions: { parse: ['users'] }`.
- **Fix**: Set `allowed_mentions: { parse: [] }`.

---

### Phase 4: UI/UX, Theme Integrity & Usability Overhaul (P1)

#### 4.1 Access Simulator Permanent Blank Screen Bug
- **File**: `web/components/Permissions/AccessPreviewer.tsx` (L47, L72-89)
- **Problem**: `selectedRoleId` initialized to `roles[0]?.id`. On mount, `roles` array is initially empty (`[]`), setting state to `null`. Condition `if (!targetId) return;` permanently aborts fetch. Simulator stays blank forever unless query param manually passed in URL.
- **Fix**: Add effect syncing `selectedRoleId` when `roles` populates:
  ```tsx
  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);
  ```

#### 4.2 PVC Auto-Cleanup Silent Data Loss
- **File**: `web/app/dashboard/[guildId]/pvc/page.tsx` (L117-146)
- **Problem**: Auto-cleanup toggle bound to state but omitted from save payload. User setting is discarded on save.
- **Fix**: Include `auto_cleanup: formValues.autoCleanup` in save payload.

#### 4.3 Broken Light Theme Palette
- **File**: `web/styles/globals.css` (L68-103)
- **Problem**: `.light` class omits all RGB tokens (`--sidebar-bg-rgb`, `--surface-panel-rgb`, `--surface-elevated-rgb`, etc.). Inherits dark values (`21 24 33`), rendering dark/black containers in light mode.
- **Fix**: Define complete light RGB tokens in `.light` root block.

#### 4.4 SaveBar Specificity Override
- **File**: `web/styles/globals.css` (L407)
- **Problem**: `.hawk-save-bar > div { background: var(--surface-3); }` overrides success/error styles.
- **Fix**: Remove hardcoded background or scope under `:not([data-variant])`.

#### 4.5 FlowCanvas Hardcoded Colors & Snowflakes
- **File**: `web/components/Commands/FlowCanvas.tsx`
- **Problem 1**: Hardcoded dark hex values (`bg-[#121622]`, `bg-[#090c14]`) break light theme.
- **Problem 2**: Node inspector requires typing 18-digit ID strings for roles and channels.
- **Fix**: Use CSS variables. Replace raw text inputs with `RolePicker` and `ChannelPicker`.

#### 4.6 Session Expiration Auto-Redirect
- **File**: `web/lib/api.ts` (L1-17)
- **Problem**: Expired JWT causes raw "Unauthorized" toast errors; user stuck on dead page.
- **Fix**: Add 401 interceptor redirecting browser to `/?session_expired=1`.

#### 4.7 Discord Embed Simulator Avatar Fix
- **File**: `web/app/dashboard/[guildId]/welcome/page.tsx` (L220)
- **Problem**: Strips `{user.avatar}` to `null`, hiding avatar in preview.
- **Fix**: Pass `thumbnailUrl={current.thumbnailUrl}` directly.

---

### Phase 5: Voice (PVC) & Gaming Polish (P2)

#### 5.1 Inactive Mines Games Auto-Cashout
- **File**: `src/modules/games/mines.ts` (L100-106)
- **Problem**: 5-minute inactivity timer has empty handler; game state hangs and bet lost.
- **Fix**: Auto-cashout winnings and delete active game session on timeout.

#### 5.2 Mutex Spinlock Timeout Failsafe
- **File**: `src/modules/suggestion/_suggestionHandler.ts`, `src/modules/confession/_confessionHandler.ts`
- **Problem**: Unhandled error inside critical section hangs channel lock forever.
- **Fix**: Add 5000ms max wait timeout and wrap critical section in `try/finally` release.

---

## 3. Automated Verification Strategy

```bash
# 1. Typecheck root bot and web dashboard
npx tsc --noEmit
npx tsc --noEmit -p web

# 2. Lint check
npx eslint src/ web/app/ web/components/

# 3. Automated test suite
npm test

# 4. Production web build
npm run build
```

---

## 4. Master Autonomous Agent Side Prompt

```markdown
You are an autonomous senior full-stack and systems security engineer. Your mission is to implement all 49 fixes and hardening specifications documented in `d:\Hawk\HAWK_ENHANCEMENT_PLAN.md`.

### Operational Rules:
1. FULL AUTONOMY: Execute file edits, migrations, tests, and git commits without stopping for confirmation.
2. ZERO REGRESSIONS: Preserve Discord.js v14, Next.js 15, React 19, and Tailwind CSS design contracts.
3. CONVENTIONAL COMMITS: Commit code at the completion of each phase (`feat(security): ...`, `fix(bot): ...`, `fix(ui): ...`).
4. TYPESCRIPT INTEGRITY: `npx tsc --noEmit` and `npx tsc --noEmit -p web` must pass with 0 errors at every phase.
5. CLEAN BUILDS: `npm run build` must succeed with 0 errors.

### Implementation Checklist:

#### Phase 1: Security & Privilege Isolation
- [ ] `web/app/api/guilds/[id]/permissions/route.ts`: Remove all `dashboard_access` queries. Scope user overrides strictly to `user_overrides` table keyed by `(guild_id, user_id)`.
- [ ] `web/lib/auth.ts`: Update `getAccessLevel()` so guild owners (`guild.owner`) and users with `Administrator`/`ManageGuild` get `'owner'`/`'editor'` permissions.
- [ ] `web/middleware.ts`: Whitelist `/api/health` from authentication. Fix rate-limit IP fallback collision.
- [ ] `web/lib/csrf.ts`: Enforce strict origin matching. Require CSRF validation on OTP endpoints.
- [ ] `web/app/api/auth/otp/`: Store SHA-256 hashed OTP codes in `dashboard_otps`.

#### Phase 2: Bot Core & Economy Race Condition Hardening
- [ ] `src/modules/economy/reset-money.ts` & `economyService.ts`: Soft-reset `cash = 0, bank = 0`. Never delete row or clear income cooldown timestamps.
- [ ] `src/modules/income/incomeService.ts`: Wrap `executeWork`, `executeSlut`, `executeCrime`, `executeRob` inside database transactions with `SELECT ... FOR UPDATE` row locks.
- [ ] `src/modules/welcome/_welcomeHandler.ts`: Add `interaction.member.permissions.has('ManageGuild')` check on button and modal handlers.
- [ ] `src/modules/pvc/_pvcGatekeeper.ts`: Remove `ManageChannels` permission grant from voice channel overrides.
- [ ] `src/core/permissions/PermissionChecker.ts`: Add native Discord `Administrator` bitflag check.
- [ ] `src/modules/pvc/`: Replace `channels.cache.get()` with `await guild.channels.fetch(channelId).catch(() => null)`.
- [ ] `src/modules/confession/_confessionHandler.ts`: Add cooldown and guild blacklist checks matching suggestions.
- [ ] `src/core/commands/CommandExecutor.ts`: Set command cooldown before `await command.execute()`.
- [ ] `src/modules/moderation/purge.ts`: Require `ManageRoles` permission for `purge role` subcommand.

#### Phase 3: Dashboard API & Data Integrity
- [ ] `web/app/api/guilds/[id]/config/handlers/general.ts` & `pvc.ts`: Use dynamic partial update logic preserving omitted columns.
- [ ] `web/lib/db.ts`: Add `suggestion_configs`, `confession_configs`, and missing `store_items` columns to schema migrations.
- [ ] `web/app/api/guilds/[id]/economy/users/route.ts`: Add validation and numeric bounds clamping (`Number.MAX_SAFE_INTEGER`).
- [ ] `web/app/api/guilds/[id]/audit/route.ts`: Remove public POST route for client audit event injection.
- [ ] `web/app/api/guilds/[id]/test-welcome/route.ts`: Set `allowed_mentions` to `{ parse: [] }`.

#### Phase 4: UI/UX, Theme Integrity & Usability
- [ ] `web/components/Permissions/AccessPreviewer.tsx`: Synchronize `selectedRoleId` when async `roles` load to prevent blank simulator screen.
- [ ] `web/app/dashboard/[guildId]/pvc/page.tsx`: Include `auto_cleanup` in configuration save payload.
- [ ] `web/styles/globals.css`: Define complete light theme RGB palette under `.light` (`--sidebar-bg-rgb`, `--surface-panel-rgb`, etc.). Remove `.hawk-save-bar > div` background override.
- [ ] `web/components/Commands/FlowCanvas.tsx`: Convert hardcoded dark hex colors to semantic CSS variables. Replace raw text inputs for `roleId` and `channelId` with `RolePicker` and `ChannelPicker`.
- [ ] `web/lib/api.ts`: Add 401 interceptor redirecting to login on expired session.
- [ ] `web/app/dashboard/[guildId]/welcome/page.tsx`: Pass `{user.avatar}` directly to `DiscordEmbedSimulator`.

#### Phase 5: Voice (PVC) & Gaming Polish
- [ ] `src/modules/games/mines.ts`: Auto-cashout winnings and prune session on 5-minute inactivity timeout.
- [ ] `src/modules/suggestion/_suggestionHandler.ts` & `_confessionHandler.ts`: Add 5000ms mutex timeout failsafe.

#### Phase 6: Final Verification & Git Delivery
- [ ] Run `npx tsc --noEmit` and `npx tsc --noEmit -p web`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Fast-forward `main` and push clean commits to `origin/main`.
```
