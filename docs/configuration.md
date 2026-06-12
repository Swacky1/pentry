# Configuration

Pentry can be configured three ways, in increasing precedence:

1. A config file (`pentry.config.json` or `pentry.config.js`).
2. The `scan(config)` argument (library use).
3. CLI flags (override the config file).

## Options

All options live on the `PentryConfig` object.

| Option           | Type                            | Default      | Description                                                   |
| ---------------- | ------------------------------- | ------------ | ------------------------------------------------------------- |
| `target`         | `string`                        | — (required) | Base URL of the app under test, e.g. `http://localhost:3000`. |
| `routes`         | `Array<string \| RouteSpec>`    | `['/']`      | Paths to probe. The base path `/` is always included.         |
| `checks`         | `string[]`                      | all          | Allowlist of check IDs to run.                                |
| `exclude`        | `string[]`                      | `[]`         | Check IDs to skip (applied after `checks`).                   |
| `ignore`         | `Array<string \| IgnoreRule>`   | `[]`         | Findings to suppress (strings or rich rules, see below).      |
| `overrides`      | `Record<string, CheckOverride>` | `{}`         | Per-check severity remap / enable-disable.                    |
| `baseline`       | `string`                        | —            | Path to a baseline file; only _new_ findings fail.            |
| `failOn`         | `Severity`                      | `'medium'`   | Lowest severity that fails an assertion / exits non-zero.     |
| `allowExternal`  | `boolean`                       | `false`      | Permit non-local targets. You must be authorized.             |
| `timeout`        | `number`                        | `10000`      | Per-request timeout in milliseconds.                          |
| `auth`           | `AuthConfig`                    | —            | Credentials attached to authenticated requests.               |
| `maxBodyCapture` | `number`                        | `65536`      | Max bytes of a response body to read/keep as evidence.        |

### `RouteSpec`

```ts
interface RouteSpec {
  path: string; // '/api/users'
  method?: string; // defaults to 'GET'
  protected?: boolean; // expected to require auth — verified by the access-control check
}
```

### `AuthConfig`

```ts
interface AuthConfig {
  headers?: Record<string, string>; // e.g. { Authorization: 'Bearer …' }
  cookie?: string; // a Cookie header value
}
```

Auth credentials are only attached to requests that opt in (`includeAuth`), so
checks can deliberately test the _unauthenticated_ path (that's how broken access
control is detected).

## Severity levels

From lowest to highest: `info`, `low`, `medium`, `high`, `critical`.

`failOn` is a threshold: a value of `high` means `high` and `critical` findings
fail the run, while `medium` and below are reported but don't.

## Config file

`pentry.config.json`:

```json
{
  "target": "http://localhost:3000",
  "routes": ["/", "/login", { "path": "/api/admin", "protected": true }],
  "failOn": "high",
  "exclude": ["info-disclosure"]
}
```

`pentry.config.js` (or `.mjs`) with type-checking via `defineConfig`:

```js
import { defineConfig } from '@red_official/pentry';

export default defineConfig({
  target: 'http://localhost:3000',
  routes: ['/', { path: '/api/admin', protected: true }],
  failOn: 'high',
});
```

The CLI auto-discovers `pentry.config.{js,mjs,cjs,json}` in the working directory,
or point at any file with `--config <path>`. (`.ts` configs load only under a
TypeScript-aware runtime such as `tsx`.) Generate a starter config + test with
`pentry init`.

## Per-check overrides

Tune an individual check without forking it. Keyed by check ID:

```json
{
  "overrides": {
    "info-disclosure": { "severity": "info" },
    "http-methods": { "enabled": false }
  }
}
```

```ts
interface CheckOverride {
  severity?: Severity; // force this check's findings to a severity
  enabled?: boolean; // false disables the check (like adding to `exclude`)
}
```

## Suppressing a finding

Every finding has a stable `fingerprint`. The simple form accepts a fingerprint
or a whole check ID:

```json
{
  "ignore": [
    "info-disclosure",
    "cookies:http://localhost:3000:Cookie missing SameSite attribute (sid)"
  ]
}
```

The rich form documents _why_ and can expire — after `expires`, the suppression
lapses and the finding resurfaces, so dismissals don't become permanent blind
spots:

```json
{
  "ignore": [
    {
      "check": "info-disclosure",
      "reason": "Server banner removed at the LB — ticket SEC-42",
      "expires": "2026-09-01"
    }
  ]
}
```

Print fingerprints with `--format json` to copy the exact value.

## Baselines

For an app that already has findings, snapshot them so only _new_ issues fail:

```bash
pentry baseline http://localhost:3000        # writes pentry-baseline.json
pentry scan http://localhost:3000 --baseline pentry-baseline.json
```

Baselined findings are still reported (marked `(baseline)`), but don't count
toward `failOn`. Commit the baseline file and shrink it as you fix issues. See
[getting-started](./getting-started.md) for the adoption workflow.

## CLI flags

| Flag                                             | Maps to                |
| ------------------------------------------------ | ---------------------- |
| `--routes a,b,c`                                 | `routes`               |
| `--fail-on <sev>`                                | `failOn`               |
| `--only a,b`                                     | `checks`               |
| `--exclude a,b`                                  | `exclude`              |
| `--ignore a,b`                                   | `ignore`               |
| `--baseline <file>`                              | `baseline`             |
| `--timeout <ms>`                                 | `timeout`              |
| `--allow-external`                               | `allowExternal: true`  |
| `--format console\|json\|sarif\|junit\|markdown` | output format          |
| `--output <file>`                                | write report to a file |
| `--config <file>`                                | load a config file     |
| `--quiet` / `--verbose`                          | logging verbosity      |
