# Changelog

All notable changes to Pentry are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Swacky1/pentry/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Swacky1/pentry/releases/tag/v0.1.0
