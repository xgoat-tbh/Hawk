# Amo Bot Web Revamp & Operating Console — E2E Test Infrastructure (TEST_INFRA.md)

## 1. Test Philosophy & Architecture

The E2E Test Infrastructure for Hawk / Amo Bot follows **Dual Track** principles, separating feature implementation from continuous, independent test verification.

### Core Principles
1. **Opaque-Box Testing**: Tests interact only with observable external interfaces — HTTP API contracts, PostgreSQL database records, Discord bot repository caches, UI Component V2 builders, and entity resolvers. Tests do not rely on internal private methods or implementation accidents.
2. **Requirement-Driven**: All test cases and expected outputs are strictly derived from:
   - `ORIGINAL_REQUEST.md`: R1 (Unified Terminal Console Design System), R2 (Complete Real Backend & DB Wiring), R3 (Snappy Tactile Interactions & Responsive Stability).
   - `PROJECT.md`: Architecture, 24-feature inventory, and interface contracts (Cache Invalidation, PVC Termination, Telemetry).
   - `discord_bot_invariants.md`: BigInt amount parsing, anti-ping role formatting, persistent voice channel lifecycles, and borderless container standards.
3. **Progressive Testability**: Tests are partitioned into distinct operational tiers. Each test is verifiable against database state and service contracts without depending on unimplemented future milestones.
4. **Independence & Determinism**: Every test suite provisions its own unique test snowflake IDs (`999999999999999XXX`), sets up clean state, asserts deterministic values, and cleans up after execution. Tests are completely isolated from test execution order.

---

## 2. Testing Tiers & Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tier 4: Real-World Scenarios                                          │
│  Complete multi-step administrative lifecycles & end-to-end workflows  │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations                                    │
│  Pairwise feature interactions, cascade effects & event chains         │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases                                       │
│  Malformed inputs, limits, negative numbers, permission rejections     │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage                                              │
│  Happy-path verification across all 12 modules, APIs & bot repos       │
└────────────────────────────────────────────────────────────────────────┘
```

- **Tier 1 — Feature Coverage**: Representative happy-path tests verifying CRUD operations, configuration persistence, and bot synchronization for every dashboard module.
- **Tier 2 — Boundary & Corner Cases**: Stressing edge conditions — empty inputs, invalid snowflake IDs, 2000-character limits, negative balances, zero values, SSRF filter evasion, and permission denials.
- **Tier 3 — Cross-Feature Combinations**: Validating multi-subsystem contracts — economy adjustments triggering audit logs, store purchases deducting balances and logging transactions, PVC creations and terminations, role salary updates altering payroll aggregations.
- **Tier 4 — Real-World Scenarios**: Simulating full real-world operator journeys — comprehensive server initialization, role hierarchy configuration, customized store catalog setups, live telemetry inspection, and sticky notice lifecycle.

---

## 3. Feature Inventory to Test Tier Mapping (All 24 Features)

| # | Feature | Description | Primary Tier | Test File Location |
|---|---|---|---|---|
| 1 | Dark Terminal Foundation | Near-black theme tokens (`#08090a`), borderless containers, crisp UI tokens | Tier 1 | `tests/ui.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts` |
| 2 | Monospace Numbered Nav | Numbered tags `[01] Console` .. `[13] Developers` and route structure | Tier 1 | `tests/e2e/tier1_feature_coverage.test.ts` |
| 3 | Tactical UI Primitives | Mechanical button states, status helpers, Components V2 containers | Tier 1 | `tests/ui.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts` |
| 4 | Technical Console Navbar | Gateway ping indicator, guild status badge, monospace breadcrumbs | Tier 1 | `tests/e2e/tier1_feature_coverage.test.ts` |
| 5 | Real-time Cache Invalidation | PostgreSQL `LISTEN`/`NOTIFY` invalidation bus connecting Web to bot `TTLCache` | Tier 1, Tier 3 | `tests/module_sync.test.ts`, `tests/e2e/tier3_cross_feature.test.ts` |
| 6 | Telemetry Migration & Logging | `command_telemetry` logging, command executor metrics, activity audit | Tier 1, Tier 4 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 7 | Store Schema Synchronization | Full 16 `store_items` columns (roles, stock, replies, requirements, actions) | Tier 1, Tier 2 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts` |
| 8 | PVC Discord REST Termination | Remote voice channel deletion contract via Discord REST + DB session removal | Tier 1, Tier 3 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier3_cross_feature.test.ts` |
| 9 | Root ESLint Cleanup | Clean syntax and code integrity across all modules | Tier 1 | `tests/commandsIntegrity.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts` |
| 10 | Console Overview (`/`) | Real live statistics, activity stream, quick actions (voice, reward, message) | Tier 1, Tier 4 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 11 | Developers & Telemetry (`/developers`) | CPU, memory, uptime, latency, maintenance actions (`flush_cache`) | Tier 1, Tier 4 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 12 | General Settings (`/general`) | Prefix, log channel, audit channel, bot commander role persistence | Tier 1, Tier 4 | `tests/module_sync.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 13 | Economy Dashboard (`/economy`) | Currency symbol, user balances, bank capacity, transactions, audit trails | Tier 1, Tier 2, Tier 3 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts`, `tests/e2e/tier3_cross_feature.test.ts` |
| 14 | Store Catalog (`/store`) | Store items CRUD, price parsing, stock limits, inventory roles, action JSON | Tier 1, Tier 2, Tier 3, Tier 4 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts`, `tests/e2e/tier3_cross_feature.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 15 | Role Salaries & Intervals (`/income`) | Role salary definitions, interval cadence, payout aggregation | Tier 1, Tier 2, Tier 3 | `tests/module_sync.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier3_cross_feature.test.ts` |
| 16 | Minigames & Wagers (`/games`) | Cooldown configurations, bet limits, game enable flags | Tier 1, Tier 2 | `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts` |
| 17 | Welcome Greetings (`/welcome`) | Greet & leave toggles, embed vs plain mode, token replacements (`{user}`, `{server}`) | Tier 1, Tier 2, Tier 4 | `tests/welcome.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 18 | Community Feedback (`/community`) | Suggestions, confessions, channel routing, anonymous logs | Tier 1, Tier 2 | `tests/module_sync.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts` |
| 19 | Private Voice Channels (`/pvc`) | Join-to-Create setup, user defaults, live session control, instant termination | Tier 1, Tier 2, Tier 3 | `tests/ui.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier3_cross_feature.test.ts` |
| 20 | Gaming LFG & Matchmaking (`/gaming`) | Game triggers, role pings, dedicated voice lobbies, cooldown enforcement | Tier 1, Tier 2 | `tests/module_sync.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts` |
| 21 | Sticky Notices (`/sticky`) | Sticky message channel assignments, variable replacements, overwrite/deletion | Tier 1, Tier 2, Tier 4 | `tests/sticky.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 22 | Permissions & ACLs (`/permissions`) | 5-tier permission evaluation, role profiles, user overrides, simulation | Tier 1, Tier 2, Tier 3, Tier 4 | `tests/permission_resolver.test.ts`, `tests/e2e/tier1_feature_coverage.test.ts`, `tests/e2e/tier2_boundary_corner.test.ts`, `tests/e2e/tier4_real_world_scenarios.test.ts` |
| 23 | E2E Testing Suite (Tiers 1-4) | Complete automated test infrastructure and runner execution | Meta / Runner | `tests/e2e/*.test.ts` |
| 24 | Adversarial Hardening (Tier 5) | White-box stress testing, race condition probes, concurrency validation | Tier 5 (Challenger) | `tests/security_hardening.test.ts`, `tests/persistence_restart.test.ts` |

---

## 4. Test Runner Command & Pass/Fail Semantics

### Execution Command
The unified test suite is executed using Node.js built-in test runner (`node:test`) and strict assertions (`node:assert/strict`), loaded via `tsx`:

```bash
npx tsx --test tests/**/*.test.ts
```

### Pass/Fail Semantics
- **Zero-Failure Gate**: The test command must exit with code `0`. Any test failure, unhandled rejection, or uncaught exception yields non-zero exit code and fails the verification gate.
- **100% Pass Rate**: Every discovered test suite across unit, integration, and E2E tiers must report status `pass`. Zero tests skipped or cancelled under standard test conditions.
- **Idempotent Isolation**: Tests create unique test records identified by timestamps or high-range synthetic snowflake IDs (`999999999999999XXX`), run isolated transactions, and clean up their test fixtures. Running the test suite multiple times in succession must yield identical pass results without leaking database rows.
- **Graceful DB Fallback**: If PostgreSQL is temporarily unreachable in a sandboxed CI environment without database services, tests detect connection availability upfront and fail-safe without crashing or leaking unhandled socket errors.
