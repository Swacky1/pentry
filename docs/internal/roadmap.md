# Roadmap

Direction, not a promise of dates. The guiding principle: **earn each expansion
with trust.** Breadth of checks only matters if every finding is one users
believe. Every milestone below keeps the V1 invariants intact — zero runtime
dependencies, safe-by-default targeting, and evidence on every finding.

The path to a mature 1.x is deliberately long. We want Pentry to be _complete and
trusted_ as a header/access-control/reflection scanner before it grows into
heavier territory (auth flows, stateful checks, injection depth). **Nothing past
1.5 is scheduled** — the "Beyond 1.5" section is a holding area, not a commitment.

## v1.0 (current) — Trustworthy core

- [x] Scan engine, config, safety gate, evidence model
- [x] High-confidence check set: headers, cookies, info-disclosure, CORS,
      HTTP methods, broken access control, reflected input
- [x] Reporters: console, JSON, SARIF, JUnit
- [x] CLI + library API
- [x] Zero runtime dependencies

---

## v1.1 — Adoptable ✅ (shipped in 0.2.0)

_Theme: a team can drop Pentry onto an existing app without drowning in
pre-existing findings, and wire it into the tools they already use in minutes._

- [x] **Baseline / accept-list workflow** (`pentry baseline`): snapshot current
      findings so only _new_ issues fail the run. The single biggest blocker to
      adopting any scanner on a mature codebase.
- [x] **Config file loading**: auto-discover `pentry.config.{js,mjs,cjs,json}` and
      load `defineConfig(...)` (`.ts` under a TS-aware runtime).
- [x] **`pentry init`**: scaffold that writes a config and a starter test for the
      detected runner (Vitest/Jest/node:test).
- [x] **Vitest/Jest matchers** at `@red_official/pentry/matchers`:
      `expect(report).toBeSecure()` / `toHaveNoFindingsAbove('high')`.
- [x] **Per-check overrides** in config: remap a check's severity or disable it.
- [x] **Finding suppression by annotation**: richer `ignore` with reasons + expiry.

## v1.2 — Sharper signal ✅ (shipped in 0.3.0)

_Theme: widen the high-confidence (mostly passive) check set and make reports
something you'd paste into a PR. No risky probes yet — precision first._

- [x] **More header checks**: Permissions-Policy and Cross-Origin-Opener-Policy
      (COEP/CORP and `X-DNS-Prefetch-Control` deferred — low signal, easy to add).
- [x] **Cookie prefix validation** (`__Host-` / `__Secure-` correctness).
- [x] **HTTPS/TLS enforcement**: HTTP→HTTPS redirect, mixed-content references in
      HTML (`transport-security` check).
- [x] **Subresource Integrity (SRI)**: external `<script>`/`<link>` without
      integrity hashes.
- [x] **Verbose error / stack-trace disclosure** (`error-disclosure`).
- [x] **Directory listing & exposed files** (`.env`, `.git`) — `exposed-resources`.
- [x] **GraphQL introspection enabled** in production.
- [x] **Markdown reporter** (shipped in 0.2.0) — works as a PR-comment format.
- [x] **HTML report** (`--format html`) for sharing outside the terminal.
- [ ] Richer console output: grouping by route, `--quiet` summaries (deferred to 1.2.x).

## v1.3 — Knows your app

_Theme: stop making users hand-list routes. Discover them, and make local
iteration fast. This is the biggest DX unlock in the 1.x line._

- [ ] **Route discovery via framework adapters** — Express and Fastify first, then
      Next.js (app + pages). Opt-in, falls back to declared routes.
- [ ] **Adapter API** so the community can add framework support.
- [ ] **Watch mode** (`pentry scan --watch`): re-scan changed routes on save.
- [ ] **Concurrency behind a cap**: parallelize requests/checks with a politeness
      limit so we never hammer a dev server.
- [ ] **Smarter targeting**: per-route method/param hints surfaced from discovery.

## v1.4 — Authenticated & stateful

_Theme: test as a real, logged-in user and catch issues that only exist between
identities. Active and careful — each check ships with strong false-positive
controls and stays strictly non-destructive._

- [ ] **Login flows**: submit credentials (form/JSON), capture session
      cookie/token, and reuse it for authenticated requests.
- [ ] **Multiple identities**: define two users to enable cross-identity checks.
- [ ] **IDOR / broken object-level authorization**: user A requesting user B's
      resources, compared against expected denial.
- [ ] **CSRF**: detect state-changing endpoints accepting requests without a valid
      anti-CSRF token.
- [ ] **Open redirect** detection on redirect parameters.
- [ ] **Host-header injection** signals (password-reset poisoning, cache effects).

## v1.5 — Ecosystem & the on-ramp to 2.0

_Theme: make Pentry extensible and keep it current without a core release, and
make it a first-class CI citizen. This is the foundation v2's depth will build
on._

- [ ] **Official GitHub Action** (`Swacky1/pentry-action`): start app, scan,
      upload SARIF, comment on the PR.
- [ ] **Check-pack convention** (`pentry-plugin-*`) + auto-discovery of installed
      packs.
- [ ] **Shareable configs** (`extends`) so orgs can standardize a policy.
- [ ] **Decoupled rule/payload set** that can update independently of the core
      engine (versioned, so checks stay current between releases).
- [ ] **Diff-aware CI mode**: only scan/flag routes touched by a PR.
- [ ] **Stabilize the plugin & report contracts** ahead of 2.0.

---

## Beyond 1.5 (not yet scheduled)

Held here intentionally. These need the 1.x foundation (route discovery, auth
flows, plugin system) to be solid and trusted first, and several carry real
false-positive risk that we won't take on until the basics are unimpeachable.

- **Injection depth**: error-based SQLi/NoSQLi signals, SSRF, command injection —
  only with strong false-positive controls and clear non-destructive guarantees.
- **More framework adapters**: Koa, Hono, NestJS, Remix, and non-Node targets via
  pure-HTTP discovery.
- **Deeper auth**: OAuth/OIDC flows, token refresh, role/permission matrices.
- **Hosted check-pack registry / index** (only if the plugin ecosystem warrants
  it — mirrors the "earn it" logic from the package-manager design).
- **2.0**: a major version is only on the table once the plugin and report
  contracts have proven stable across the 1.x line.

## Explicit non-goals

These don't change with the roadmap:

- **Not a general-purpose web crawler/spider.** Pentry tests what you point it at
  (route discovery in 1.3 is opt-in and bounded, not a spider).
- **Not a destructive tool.** No brute-forcing, no resource exhaustion, no data
  mutation. Ever — including the active checks in 1.4+.
- **Not a compliance/SBOM/dependency scanner.** Those corners are well served
  (`npm audit`, Snyk, Socket, Trivy). We stay focused on runtime app behavior.
- **Not a replacement for a professional pentest.** Pentry catches the common,
  automatable classes early; humans still find the deep logic bugs.

## How to propose a change

Open an issue describing the check or feature and, for checks, the false-positive
story (see [DD-4](./design-decisions.md#dd-4-precision-over-coverage)). Precision
is the bar. If a proposal targets "Beyond 1.5," say why it can't wait for the
foundation it depends on.
