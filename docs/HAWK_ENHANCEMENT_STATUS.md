# Hawk enhancement execution ledger

Specification: `HAWK_ENHANCEMENT_PLAN.md` plus the user's phased request. Base: `e03a77c`. Work occurs on `codex/hawk-rebuild-hardening`; origin/main was `5877b46` at preflight. The existing rebuild is already committed and the working tree was clean.

Ruling: Execute the supplied, explicitly approved plan inline. User authorization includes migrations, phase commits, fast-forwarding main, and pushing origin/main. Never stage environment files or credentials.

Ruling: The document's aggregate 49 count is not a numbered 49-item specification. The following 49 acceptance checks decompose its concrete requirements and include AFK ownership and both voice-move handlers from the user's request. No requirements are discarded.

Ruling: Native Discord owners/admins/ManageGuild users receive guild-scoped owner/editor access, replacing the earlier viewer-only design. Global dashboard allowlisting remains separate from guild permission overrides.

## Phase 1 — Security

- [x] 01 User override reads/writes/deletes never modify global dashboard access.
- [x] 02 Discord owners receive owner access in their own guild.
- [x] 03 Administrator/ManageGuild receive editor access in their own guild.
- [x] 04 Unauthenticated health probes work.
- [x] 05 Unknown-peer OTP limits are account-scoped without a shared lockout bucket.
- [x] 06 Mutation origin matching requires exact scheme/hostname/port and rejects absent origins.
- [x] 07 OTP request requires CSRF.
- [x] 08 OTP verify requires CSRF.
- [x] 09 OTP issuance/storage/verification use SHA-256; schema supports hashes.

## Phase 2 — Bot and economy

- [ ] 10 Reset cash and bank without deleting a balance record.
- [ ] 11 Preserve all daily/work/income cooldown timestamps on reset.
- [ ] 12 Work transaction locks balance before cooldown check.
- [ ] 13 Slut transaction locks balance before cooldown check.
- [ ] 14 Crime transaction locks balance before cooldown check.
- [ ] 15 Rob transaction locks attacker/victim in deterministic order.
- [ ] 16 Role income collection transaction locks before cooldown check.
- [ ] 17 Welcome buttons require ManageGuild.
- [ ] 18 Welcome modals require ManageGuild.
- [ ] 19 PVC creation does not grant ManageChannels.
- [ ] 20 PVC select handlers do not grant ManageChannels.
- [ ] 21 Native Discord Administrator is recognized in bot authority.
- [ ] 22 PVC operations fetch channels after cache eviction.
- [ ] 23 Confession submission cooldown matches suggestions.
- [ ] 24 Confession guild blacklist matches suggestions.
- [ ] 25 Command cooldown is reserved before execution; input errors can release it.
- [ ] 26 Purge role requires ManageRoles.
- [ ] 27 AFK nickname restoration only touches a nickname set by the bot, once.

## Phase 3 — API and schema

- [ ] 28 General configuration patches preserve omitted fields.
- [ ] 29 PVC configuration patches preserve omitted fields.
- [ ] 30 Suggestion/confession schema is ensured.
- [ ] 31 Guild audit schema is ensured.
- [ ] 32 All required store columns are ensured.
- [ ] 33 Economy user IDs and numbers are validated and bounded.
- [ ] 34 Public audit POST injection is removed.
- [ ] 35 Test welcome suppresses mentions.

## Phase 4 — UI and theme

- [ ] 36 Simulator selects an available role after asynchronous loading.
- [ ] 37 PVC save includes auto_cleanup.
- [ ] 38 Light theme defines every semantic RGB palette token.
- [ ] 39 SaveBar success/error backgrounds retain precedence.
- [ ] 40 Canvas surface/background colors use semantic tokens.
- [ ] 41 Canvas node/edge/inspector colors respect theme tokens.
- [ ] 42 Role arguments use RolePicker.
- [ ] 43 Channel arguments use ChannelPicker.
- [ ] 44 Protected API 401 redirects to session-expired login; OTP failures stay in login.
- [ ] 45 Welcome simulator receives avatar placeholders unchanged.

## Phase 5 — Voice and games

- [ ] 46 Mines inactivity settles winnings and removes the active session.
- [ ] 47 Suggestion mutex wait is bounded to 5000 ms and released in finally.
- [ ] 48 Confession mutex wait is bounded to 5000 ms and released in finally.
- [ ] 49 Drag/remove member moves check destination permissions for bot and member.

## Verification and delivery

Each phase requires both TypeScript checks with zero errors and relevant regression tests before its Conventional Commit. Final delivery requires the complete bot/component suites, production build, secret scan of staged changes, independent branch review, fast-forward main, and a verified normal push to origin/main. Logs are retained under ignored `.rebuild/enhancement/`.

Phase 1 verified: bot/web TypeScript both exit 0; npm test 155/155; production build exit 0. Migration 034 applied to PostgreSQL; SHA-256 verified. Ruling: underlying permissions service must also stop synthesizing guild overrides from global dashboard grants. Session cookies remain Secure in production and SameSite Strict.
