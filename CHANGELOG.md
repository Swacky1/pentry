# Changelog

All notable changes to Pentry are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] — 2026-06-12 — Knows your app

Finishes the "Sharper signal" console work and delivers route discovery so you
stop hand-listing routes.

### Added

- **Route discovery adapters** — feed routes straight from your app:
  - `discoverExpressRoutes(app)` — top-level + mounted Express routes
  - `discoverOpenApiRoutes(spec)` — any OpenAPI/Swagger document (framework-agnostic)
  - `discoverRoutes(input)` — auto-detects which adapter to use
- **Concurrency** — checks now run in parallel (default 6, `concurrency` /
  `--concurrency`), with output kept deterministic. Configurable; gentle on dev servers.
- **Watch mode** — `pentry scan --watch [--interval <ms>]` re-scans on an interval.
- **Grouped console output** — findings are grouped under severity headers.

## [1.0.0] — 2026-06-12 — First public release 🎉

The first published release of Pentry. It bundles everything built across the
v1.0–v1.2 milestones (see the entries below) into one stable, production-ready
package, plus an official GitHub Action and a hardened release pipeline.

**Highlights**

- **13 security checks** covering the common, automatable OWASP Top 10 classes —
  broken access control, reflected XSS, CORS, security headers, cookies, mixed
  content, SRI, error/stack-trace disclosure, exposed `.env`/`.git`, GraphQL
  introspection, and more. Every finding ships with reproducible evidence and a fix.
- **Runs in your test suite and CI** — `scan()` + `report.assert()`, a CLI, and
  matchers for Vitest/Jest.
- **Six report formats** — console, JSON, SARIF, JUnit, Markdown, HTML.
- **Baseline workflow, config files, `pentry init`, per-check overrides, and
  expiring ignores** for frictionless adoption.
- **Official GitHub Action** (`uses: Swacky1/pentry@v1`) with injection-safe args.
- **Safe by default** (localhost-only), **zero runtime dependencies**, and a
  **provenance-signed, environment-gated** publish pipeline. `npm audit`: 0.

## [0.3.0] — 2026-06-12

The **v1.2 "Sharper signal"** milestone — more high-confidence checks and reports
you'd paste into a PR.

### Added

- New checks:
  - `cache-control` — sensitive (JSON / cookie-setting) responses that are cacheable
  - `subresource-integrity` — cross-origin scripts/styles loaded without an integrity hash
  - `transport-security` — mixed content on HTTPS pages, and missing HTTP→HTTPS redirects
  - `error-disclosure` — stack traces / framework internals leaked in error responses
  - `exposed-resources` — directory listing and sensitive files (`.env`, `.git/config`)
  - `graphql-introspection` — GraphQL endpoints exposing their schema
- More `security-headers` rules: Permissions-Policy and Cross-Origin-Opener-Policy.
- Cookie **prefix validation** (`__Host-` / `__Secure-`) in the `cookies` check.
- **HTML reporter** (`--format html`) — a self-contained, shareable report.

## [0.2.0] — 2026-06-12

The **v1.1 "Adoptable"** milestone — make Pentry easy to drop onto an existing
app and wire into existing tooling.

### Added

- **Baseline workflow**: `pentry baseline <target>` records current findings to
  `pentry-baseline.json`; subsequent scans with `--baseline` (or `baseline` in
  config) report those findings but only fail on _new_ ones.
- **Config file auto-discovery**: `pentry.config.{js,mjs,cjs,json}` are loaded
  automatically; `.ts` works under a TS-aware runtime.
- **`pentry init`**: scaffolds a config and a starter security test, detecting
  Vitest/Jest/node:test.
- **Per-check overrides** (`overrides`): remap a check's severity or disable it.
- **Rich ignore rules**: `ignore` now accepts objects with `reason` and an
  `expires` date, after which the suppression lapses and the finding resurfaces.
- **Test-runner matchers** at `@red_official/pentry/matchers`: `toBeSecure()` and
  `toHaveNoFindingsAbove(severity)` for Vitest and Jest.
- **Markdown reporter** (`--format markdown`) for PR comments and job summaries.

### Changed

- `ScanReport` is now baseline-aware: `ok`/`blockingCount()` consider only new
  findings; added `newFindings()`, `baselinedFindings()`, `isBaselined()`, and
  `failureSummary()`.

## [0.1.0] — 2026-06-11

Initial development release (pre-1.0, not published to npm).

### Added

- Core scan engine with a localhost-only-by-default safety gate.
- Built-in checks:
  - `security-headers` — CSP, HSTS, X-Content-Type-Options, clickjacking, Referrer-Policy
  - `cookies` — HttpOnly / Secure / SameSite flags
  - `info-disclosure` — Server / X-Powered-By version banners
  - `cors` — arbitrary-origin reflection and credentialed wildcards
  - `http-methods` — TRACE/TRACK (Cross-Site Tracing)
  - `access-control` — broken access control on `protected` routes
  - `reflected-input` — unencoded reflection (potential XSS)
- Library API (`scan`, `ScanReport`) and a CLI (`pentry scan`).
- Reporters: console, JSON, SARIF (GitHub code scanning), JUnit (CI).
- Custom check support via the `Check` interface.
- Zero runtime dependencies.

[Unreleased]: https://github.com/Swacky1/pentry/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Swacky1/pentry/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Swacky1/pentry/releases/tag/v1.0.0
[0.3.0]: https://github.com/Swacky1/pentry/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Swacky1/pentry/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Swacky1/pentry/releases/tag/v0.1.0
