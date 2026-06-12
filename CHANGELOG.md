# Changelog

All notable changes to Pentry are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

First public release.

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

[Unreleased]: https://github.com/Swacky1/pentry/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Swacky1/pentry/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Swacky1/pentry/releases/tag/v0.1.0
