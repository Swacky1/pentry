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

## v1.1 — Adoptable

_Theme: a team can drop Pentry onto an existing app without drowning in
pre-existing findings, and wire it into the tools they already use in minutes._

- [ ] **Baseline / accept-list workflow** (`pentry baseline`): snapshot current
      findings so only _new_ issues fail the run. The single biggest blocker to
      adopting any scanner on a mature codebase.
- [ ] **Config file loading**: auto-discover `pentry.config.{js,mjs,ts,json}` and
      load `defineConfig(...)` (today the type helper exists but isn't read).
- [ ] **`pentry init`**: interactive scaffold that writes a config and a starter
      test for the detected runner.
- [ ] **Vitest/Jest matcher package** (`@red_official/pentry-matchers`):
      `expect(report).toBeSecure()` / `toHaveNoFindingsAbove('high')`.
- [ ] **Per-check severity overrides and options** in config (e.g. downgrade
      `info-disclosure`, set `failOn` per check).
- [ ] **Finding suppression by annotation**: richer `ignore` with reasons + expiry.

## v1.2 — Sharper signal

_Theme: widen the high-confidence (mostly passive) check set and make reports
something you'd paste into a PR. No risky probes yet — precision first._

- [ ] **More header checks**: Permissions-Policy, COOP/COEP/CORP, cache
      directives on sensitive responses, `X-DNS-Prefetch-Control`.
- [ ] **Cookie prefix validation** (`__Host-` / `__Secure-` correctness).
- [ ] **HTTPS/TLS enforcement**: HTTP→HTTPS redirect, mixed-content references in
      HTML, missing `upgrade-insecure-requests`.
- [ ] **Subresource Integrity (SRI)**: external `<script>`/`<link>` without
      integrity hashes.
- [ ] **Verbose error / stack-trace disclosure**: framework error pages leaking
      internals (passive content inspection).
- [ ] **Directory listing & common debug endpoints** exposed.
- [ ] **GraphQL introspection enabled** in production.
- [ ] **Markdown reporter** + a ready-to-use PR-comment format.
- [ ] **HTML report** (`--format html`) for sharing outside the terminal.
- [ ] Richer console output: grouping by route/severity, `--quiet` summaries.

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
