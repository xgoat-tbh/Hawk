# Hawk rebuild implementation and verification

Date: 2026-10-05  
Branch: `codex/hawk-rebuild-hardening`  
Specification: `HAWK_REBUILD_PLAN.md`

The rebuild is implemented in the working tree. Existing dashboard edits were preserved. During the subsequent bot/server connection repair, the local integrated bot/dashboard was restarted and migrations 030–033 were applied by normal bootstrap. No commit, push, or public deployment was performed. Authenticated overview and Socket.IO connectivity have now been verified in both guilds; OTP and broader feature acceptance remain outstanding.

## Implemented

- Removed the development login endpoint and embedded credential fallbacks. Fixed the economy reset authorization/confirmation returns, store role checks, audit table name, income reset configuration, and nullable community channels.
- Kept Next.js 15, React 19, and TypeScript. Replaced Anime.js with Framer Motion and added dark/light/system themes, accessible Radix controls, responsive navigation, command palette, dialogs, tables, save feedback, and persistent form drafts.
- Rebuilt Discord DM OTP login with digit inputs, resend countdown, atomic verification, attempt limits, PostgreSQL sessions, secure production cookies, CSRF checks, sliding-window rate limits, session validation, security headers, and request body limits.
- Enforced Discord administrator/Manage Server view access and allowlisted editor access in both UI and API. Restricted guild selection to Main Server and Yolo (Test).
- Added authenticated Socket.IO telemetry and PostgreSQL notifications for live state/cache synchronization. Added a lazy-loaded Chart.js activity graph with a text table alternative.
- Updated module configuration pages while retaining their real PostgreSQL/Discord behavior. Added validated game availability/bet controls, fixed configurable income collection intervals, and repaired permission ALLOW/DENY persistence and evaluation.
- Added the React Flow canvas and locally hosted Monaco editor, PostgreSQL custom-command CRUD, and a restricted command-flow language. Custom commands run through the bot's existing command permission/restriction/cooldown pipeline with validated actions, role/channel checks, bounded execution, and suppressed mentions.
- Replaced handwritten command identity metadata with a generated registry of actual bot definitions and aliases. Reserved built-in and owner command names cannot be replaced by custom commands.
- Added migrations 030–033 for custom commands, dashboard notifications, permission effects, and game controls. Added regression coverage and corrected the tier-2 boundary assertions.

## Verification results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed: bot TypeScript |
| `npx tsc --noEmit -p web` | Passed: dashboard TypeScript |
| `npm run build` | Passed: bot compilation and production dashboard build; shared first-load JS approximately 102 kB |
| `npm test` | Passed: 144 tests, zero failures or skipped tests |
| `npm test --prefix web` | Passed: 8 component tests across 4 files |
| `npm run lint` | Passed with 3 existing unused-catch-variable warnings in PVC files |
| `npm run lint --prefix web` | Passed; production build also reports retained unused-import warnings |
| `npm audit --omit=dev` | Zero production dependency vulnerabilities |
| Migrations 030–033 | Initially verified with rollback; subsequently applied successfully by the local bot startup during connection repair |
| `git diff --check` | Passed |
| Independent focused security/code review | No remaining introduced P1/P2 findings in reviewed scope |

The full dependency audit still reports five high-severity development-tooling advisories in the Tailwind 3 dependency chain. The suggested automatic fix requires a breaking Tailwind 4 migration and was not forced.

## Production browser checks

Chrome exercised the rebuilt app through a local HTTPS server using the integrated Next.js/Socket.IO setup and production CSP:

- Desktop dark/light themes and persistence; 390 px mobile layout without horizontal overflow; reduced-motion preference; invalid Discord ID feedback.
- Unauthenticated dashboard redirects and API denial; missing CSRF rejection; valid-CSRF input validation; development login endpoint returns 404.
- Unauthenticated Socket.IO handshake rejection.
- Local Monaco loader and editor initialization under production CSP.
- Zero page errors or CSP violations.
- Zero Axe WCAG 2 A/AA and WCAG 2.1 AA violations on desktop-dark, desktop-light, and mobile-light login screens. This is scoped automated evidence, not certification of all authenticated pages.

No OTP was requested, privileged session fabricated, Discord message sent, or production configuration changed during browser QA.

Evidence is retained in the ignored `.rebuild` directory:

- `.rebuild/root-tests-final.log`
- `.rebuild/components-final.log`
- `.rebuild/build-final.log`
- `.rebuild/migrations-final.log`
- `.rebuild/browser/report.json`
- `.rebuild/browser/login-dark.png`, `login-light.png`, and `login-mobile.png`

Connection repair evidence: `.rebuild/connection-build-final.log`, `.rebuild/connection-tests-final.log`, `.rebuild/connection-components.log`, and `.rebuild/connection-live.log`. The connection suite adds four regression cases to the original 140 tests.

## Deployment and remaining live acceptance

1. Review the working-tree diff and back up PostgreSQL before public deployment. Build with the root `npm run build`; deploy the rebuilt bot and dashboard together. The normal bot bootstrap runs pending SQL migrations before initializing custom commands and the integrated dashboard. Migrations 030–033 are now applied to the configured database; other deployment databases still require their own migration run.
2. Run the integrated bot/dashboard server in production behind HTTPS. Set `DASHBOARD_ORIGIN` to the exact public HTTPS origin. Keep `DATABASE_URL` and Discord credentials server-only. Secure production cookies require HTTPS.
3. Configure existing bot-owner/admin identities and the editor allowlist. `SESSION_DURATION_HOURS` defaults to 24 and is bounded to 1–168 hours. Only enable `TRUST_PROXY=true` when the app is reachable through a trusted proxy that controls forwarded headers. `ALLOWED_IPS` is optional; peer verification and Socket.IO require the integrated server.
4. Use real Discord accounts to verify DM delivery, OTP expiry/resend, logout, session expiry, viewer denial of mutations, and allowlisted editing.
5. Verify configuration save/readback, reload persistence, authorized live telemetry, and custom-command create/edit/delete/execution in Yolo (Test), then both supported guilds as appropriate.
6. Finish keyboard, focus, screen-reader, contrast, and mobile acceptance across authenticated pages. Actual Discord action delivery and permitted role changes remain untested. Authorized Socket.IO connectivity was subsequently verified in both guilds during the connection repair.

The source migration runner exports `runMigrations`; the existing `npm run migrate` script does not itself invoke that export. Use normal bot bootstrap for the deployment migration path described above.

## Bot/server connection repair

The running dashboard was a standalone `next dev` process, so there was no Discord gateway client or Socket.IO server in that process. Stats queries also referenced nonexistent `command_telemetry.executed_at` columns; the actual timestamp is `created_at`. The local test guild setting pointed to a guild this bot does not belong to. Starting the integrated server from the repository root additionally exposed relative Tailwind configuration paths that omitted dashboard styles.

These causes are corrected:

- Both dashboard launch commands delegate to the integrated root service. `src/dev.ts` explicitly selects development; `src/start.ts` selects production before loading the bot and rejects a missing production dashboard build.
- All dashboard/socket command telemetry queries use `created_at`.
- API and socket stats report actual gateway readiness, guild availability, and nullable heartbeat latency. Temporarily unavailable cached guilds cannot appear connected. REST latency is no longer substituted for gateway latency.
- The overview distinguishes the Discord gateway, authenticated live updates, and runtime resource status. Missing presence counts are left unavailable.
- `TEST_GUILD_ID` in the local environment now identifies the verified Yolo guild, `1493322410567401722`. Its source default matches that guild. Other credentials were retained.
- PostCSS selects the dashboard Tailwind configuration explicitly, and content paths resolve relative to that configuration.
- New regression tests execute real stats queries against PostgreSQL, catch swallowed telemetry schema errors, cover gateway/guild availability, compile responsive CSS from the repository root, and verify production startup mode and build guard.

Live browser verification used the existing signed-in session. Both Main/Amo and Yolo displayed `Discord gateway: Connected` and `Live updates connected`, with successful stats/activity responses and real member/module counts. No privileged session was fabricated and no test command was sent to Discord.

The local service is launched through `npm --prefix web run dev`; either that command or root `npm run dev` starts the integrated bot/dashboard. Production uses root `npm run build`, then `npm start` (or `npm --prefix web start`). Use HTTPS for public production access.
