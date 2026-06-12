# Roadmap

Direction, not a promise of dates. The guiding principle: **earn each expansion
with trust.** Breadth of checks only matters if every finding is one users
believe.

## V1 (current) — Trustworthy core

- [x] Scan engine, config, safety gate, evidence model
- [x] High-confidence check set: headers, cookies, info-disclosure, CORS,
      HTTP methods, broken access control, reflected input
- [x] Reporters: console, JSON, SARIF, JUnit
- [x] CLI + library API
- [x] Zero runtime dependencies

## V1.x — Polish and reach

- [ ] More header checks (Permissions-Policy, COOP/COEP/CORP, cache directives)
- [ ] Config file auto-discovery for `.js`/`.ts` configs
- [ ] Vitest/Jest custom matcher package (`toBeSecure()`)
- [ ] `--baseline` / accept-list workflow to adopt Pentry on an existing app
      without drowning in pre-existing findings
- [ ] Richer console output (grouping, `--quiet` summaries)
- [ ] Watch mode for local dev (`pentry scan --watch`)

## V2 — Depth

- [ ] **Route discovery** via framework adapters (Express, Fastify, Next.js) so
      users don't hand-list routes — likely the biggest UX unlock
- [ ] **Authenticated flows**: log in, capture session, scan as a real user
- [ ] **Stateful checks**: IDOR (compare two identities), CSRF token validation
- [ ] Parallel execution behind a concurrency cap
- [ ] Injection depth: error-based SQLi/NoSQLi signals, open-redirect, SSRF
      (carefully, with strong false-positive controls)

## V3 — Ecosystem

- [ ] Published check-pack convention + a few official packs
- [ ] Plugin discovery (`pentry-plugin-*`)
- [ ] Optional rule/payload set that can update independently of the core
- [ ] Diff-aware mode (only scan routes touched by a PR)

## Explicit non-goals

- **Not a general-purpose web crawler/spider.** Pentry tests what you point it at.
- **Not a destructive tool.** No brute-forcing, no resource exhaustion, no data
  mutation. Ever.
- **Not a compliance/SBOM/dependency scanner.** Those corners are well served
  (`npm audit`, Snyk, Socket, Trivy). We stay focused on runtime app behavior.
- **Not a replacement for a professional pentest.** Pentry catches the common,
  automatable classes early; humans still find the deep logic bugs.

## How to propose a change

Open an issue describing the check or feature and, for checks, the false-positive
story (see [DD-4](./design-decisions.md#dd-4-precision-over-coverage)). Precision
is the bar.
