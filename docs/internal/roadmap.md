# Roadmap

Direction, not a promise of dates. The guiding principle: **earn each expansion
with trust.** Breadth of checks only matters if every finding is one users
believe. Every release keeps the core invariants intact — zero runtime
dependencies, safe-by-default targeting, and evidence on every finding.

**Versioning:** milestones now track npm minor versions directly (1.1, 1.2, …).
Breaking changes are reserved for a future 2.0; everything in the 1.x line is
additive. **Nothing past 1.3 is scheduled** — the "Beyond 1.x" section is a
holding area, not a commitment.

## 1.0.0 — Foundation ✅ (shipped)

The first public release. Everything needed to run trustworthy security tests in
a test suite and CI.

- [x] Scan engine, config, localhost-only safety gate, evidence model
- [x] 13 checks across the common automatable OWASP Top 10 classes
- [x] 6 reporters: console, JSON, SARIF, JUnit, Markdown, HTML
- [x] Adoption: `pentry init`, config files, baselines, per-check overrides,
      expiring ignores, Vitest/Jest matchers
- [x] CLI + library API, official GitHub Action
- [x] Zero runtime dependencies; provenance-signed, environment-gated publishing

## 1.1.0 — Knows your app ✅ (shipped)

_Theme: stop hand-listing routes, and make local runs fast and scannable._

- [x] **Route discovery adapters** — `discoverExpressRoutes`, `discoverOpenApiRoutes`,
      and a `discoverRoutes` auto-detector. Opt-in; falls back to declared routes.
- [x] **Concurrency** — checks run in parallel behind a cap, output stays deterministic.
- [x] **Watch mode** — `pentry scan --watch` re-scans on an interval.
- [x] **Grouped console output** — findings grouped under severity headers.

## 1.2.0 — Authenticated & stateful (next)

_Theme: test as a real, logged-in user and catch issues that only exist between
identities. Active and careful — each check ships with strong false-positive
controls and stays strictly non-destructive._

- [ ] **Login flows**: submit credentials (form/JSON), capture session
      cookie/token, reuse it for authenticated requests.
- [ ] **Multiple identities**: define two users to enable cross-identity checks.
- [ ] **IDOR / broken object-level authorization**: user A requesting user B's
      resources, compared against expected denial.
- [ ] **CSRF**: detect state-changing endpoints accepting requests without a valid
      anti-CSRF token.
- [ ] **Open redirect** detection on redirect parameters.
- [ ] **Host-header injection** signals.

## 1.3.0 — Ecosystem

_Theme: make Pentry extensible and keep it current without a core release._

- [ ] **More route adapters** — Fastify, Next.js (app + pages), via the existing
      adapter shape.
- [ ] **Check-pack convention** (`pentry-plugin-*`) + auto-discovery of installed packs.
- [ ] **Shareable configs** (`extends`) so orgs can standardize a policy.
- [ ] **Decoupled rule/payload set** that can update independently of the core engine.
- [ ] **Diff-aware CI mode**: only scan/flag routes touched by a PR.
- [ ] **Stabilize the plugin & report contracts** ahead of 2.0.

---

## Beyond 1.x (not yet scheduled)

Held here intentionally — these need the 1.x foundation solid and trusted first,
and several carry real false-positive risk we won't take on until the basics are
unimpeachable.

- **Injection depth**: error-based SQLi/NoSQLi signals, SSRF, command injection —
  only with strong false-positive controls and clear non-destructive guarantees.
- **Deeper auth**: OAuth/OIDC flows, token refresh, role/permission matrices.
- **Hosted check-pack registry** (only if the plugin ecosystem warrants it).
- **2.0**: a major version is only on the table once the plugin and report
  contracts have proven stable across the 1.x line.

## Explicit non-goals

These don't change with the roadmap:

- **Not a general-purpose web crawler/spider.** Pentry tests what you point it at
  (route discovery is opt-in and bounded, not a spider).
- **Not a destructive tool.** No brute-forcing, no resource exhaustion, no data
  mutation. Ever — including the active checks in 1.2+.
- **Not a compliance/SBOM/dependency scanner.** Those corners are well served
  (`npm audit`, Snyk, Socket, Trivy). We stay focused on runtime app behavior.
- **Not a replacement for a professional pentest.** Pentry catches the common,
  automatable classes early; humans still find the deep logic bugs.

## How to propose a change

Open an issue describing the check or feature and, for checks, the false-positive
story (see [DD-4](./design-decisions.md#dd-4-precision-over-coverage)). Precision
is the bar. If a proposal targets "Beyond 1.x," say why it can't wait for the
foundation it depends on.
