<div align="center">

# Pentry

**Security tests for your web app, right in your test suite.**

Like Jest, but it pen-tests. Point it at your running app and it probes for the
OWASP Top 10 — broken access control, XSS, CORS holes, missing security headers,
and more — then reports each finding with reproducible evidence and a fix.

[![CI](https://github.com/Swacky1/pentry/actions/workflows/ci.yml/badge.svg)](https://github.com/Swacky1/pentry/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@red_official/pentry.svg)](https://www.npmjs.com/package/@red_official/pentry)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)

</div>

---

## Why Pentry

Security scanning today is either a heavyweight external tool owned by a separate
team (ZAP, Burp) or a SaaS you wire into CI. Neither lives where developers work:
**the test suite.** Pentry does.

- 🧪 **Runs in your tests and CI** — assert that your app has no security
  regressions the same way you assert it returns `200`.
- 🎯 **Precision over noise** — every finding ships with the exact request/response
  that proves it. A scanner you can't trust gets deleted from CI in a week; Pentry
  is built to cry wolf as little as possible.
- 🔒 **Safe by default** — only scans `localhost`/private addresses unless you
  explicitly authorize an external target. You test what you own.
- 📦 **Zero runtime dependencies** — a security tool shouldn't drag in a supply
  chain. Pentry has none.
- 🧩 **Extensible** — built-in checks are just objects; write your own in a few lines.
- 📤 **Reports anywhere** — pretty console, JSON, **SARIF** (GitHub code scanning),
  **JUnit** (CI test UIs), **Markdown** (PR comments), and **HTML**.

## How it compares

|               | ZAP / Burp      | StackHawk      | **Pentry**               |
| ------------- | --------------- | -------------- | ------------------------ |
| Where it runs | External tool   | SaaS + CI      | **Your test suite & CI** |
| Cost          | Free / paid     | Paid           | **Free & open source**   |
| Setup         | Heavy, separate | Account + YAML | **`npm i` + 3 lines**    |
| Runtime deps  | —               | —              | **Zero**                 |
| Owned by      | Security team   | Security team  | **Developers**           |

Pentry isn't trying to replace a full DAST suite or a human pentest — it catches
the common, automatable issues _early_, where developers already work.

## Install

```bash
npm install --save-dev @red_official/pentry
```

Requires Node.js 18+.

## Quick start

### In a test

```ts
import { test } from 'vitest'; // or jest, node:test, etc.
import { scan } from '@red_official/pentry';

test('app has no security regressions', async () => {
  const report = await scan({ target: 'http://localhost:3000' });
  report.assert(); // throws (failing the test) if anything ≥ "medium" is found
});
```

### From the CLI

```bash
npx @red_official/pentry scan http://localhost:3000
```

```
Pentry security report — http://localhost:3000
────────────────────────────────────────────────────────────
MED   Missing Content-Security-Policy header
      security-headers · http://localhost:3000/
      No Content-Security-Policy was set. A CSP is the most effective
      defense-in-depth control against cross-site scripting…
      Fix: Set a Content-Security-Policy header. Start strict…
      GET http://localhost:3000/ → 200

HIGH  Protected route reachable without authentication: /api/admin
      access-control · http://localhost:3000/api/admin
      …
────────────────────────────────────────────────────────────
1 high · 1 medium
✗ 2 finding(s) at or above "medium" — failing.
```

The CLI exits non-zero when findings meet the `--fail-on` threshold, so it gates
a pipeline out of the box.

## Testing protected routes

Tell Pentry which routes should require auth and how to authenticate, and it will
verify both that anonymous users are blocked and that your headers don't leak:

```ts
const report = await scan({
  target: 'http://localhost:3000',
  routes: [
    '/',
    { path: '/api/admin', protected: true },
    { path: '/api/me', method: 'GET', protected: true },
  ],
  auth: { headers: { Authorization: 'Bearer <test-token>' } },
  failOn: 'high',
});
```

## What it checks

| Check                  | ID                      | What it catches                                                           |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------- |
| Security headers       | `security-headers`      | Missing/invalid CSP, HSTS, X-CTO, clickjacking, Referrer/Permissions/COOP |
| Cookie flags           | `cookies`               | Missing `HttpOnly`/`Secure`/`SameSite`; `__Host-`/`__Secure-` prefixes    |
| Sensitive caching      | `cache-control`         | JSON / cookie-setting responses that are cacheable                        |
| Information disclosure | `info-disclosure`       | `Server`/`X-Powered-By` version banners                                   |
| Subresource Integrity  | `subresource-integrity` | Cross-origin scripts/styles without an integrity hash                     |
| CORS misconfiguration  | `cors`                  | Arbitrary-origin reflection, credentialed wildcard                        |
| Transport security     | `transport-security`    | Mixed content; missing HTTP→HTTPS redirect                                |
| Dangerous HTTP methods | `http-methods`          | `TRACE`/`TRACK` enabled (Cross-Site Tracing)                              |
| Broken access control  | `access-control`        | `protected` routes reachable without auth                                 |
| Reflected input (XSS)  | `reflected-input`       | User input reflected unencoded into HTML                                  |
| Verbose errors         | `error-disclosure`      | Stack traces / framework internals in error responses                     |
| Exposed resources      | `exposed-resources`     | Directory listing; `.env` / `.git/config` served directly                 |
| GraphQL introspection  | `graphql-introspection` | GraphQL endpoints exposing their schema                                   |

See [docs/checks.md](./docs/checks.md) for the full reference, including severity
and remediation for each.

## CI integration

Upload SARIF to get findings in GitHub's Security tab and on PRs:

```yaml
- run: npx @red_official/pentry scan http://localhost:3000 --format sarif --output pentry.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: pentry.sarif
```

Full guide: [docs/ci-integration.md](./docs/ci-integration.md).

## Documentation

- [Getting started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Checks reference](./docs/checks.md)
- [CI integration](./docs/ci-integration.md)
- [Writing custom checks](./docs/writing-checks.md)
- [API reference](./docs/api.md)

Contributors: see [docs/internal](./docs/internal) for architecture and design notes.

## Responsible use

Pentry actively sends crafted (non-destructive) requests to a target. Only run it
against systems **you own or are explicitly authorized to test.** By default it
refuses any target that isn't loopback/private; the `allowExternal` opt-in exists
for your own staging/production hosts, not other people's. See [SECURITY.md](./SECURITY.md).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). New checks are
the highest-impact contribution; the [check-authoring guide](./docs/internal/check-authoring.md)
walks through it.

## License

[MIT](./LICENSE)
