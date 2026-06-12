# Configuration

Pentry can be configured three ways, in increasing precedence:

1. A config file (`pentry.config.json` or `pentry.config.js`).
2. The `scan(config)` argument (library use).
3. CLI flags (override the config file).

## Options

All options live on the `PentryConfig` object.

| Option           | Type                         | Default      | Description                                                   |
| ---------------- | ---------------------------- | ------------ | ------------------------------------------------------------- |
| `target`         | `string`                     | — (required) | Base URL of the app under test, e.g. `http://localhost:3000`. |
| `routes`         | `Array<string \| RouteSpec>` | `['/']`      | Paths to probe. The base path `/` is always included.         |
| `checks`         | `string[]`                   | all          | Allowlist of check IDs to run.                                |
| `exclude`        | `string[]`                   | `[]`         | Check IDs to skip (applied after `checks`).                   |
| `ignore`         | `string[]`                   | `[]`         | Finding fingerprints or check IDs to suppress from results.   |
| `failOn`         | `Severity`                   | `'medium'`   | Lowest severity that fails an assertion / exits non-zero.     |
| `allowExternal`  | `boolean`                    | `false`      | Permit non-local targets. You must be authorized.             |
| `timeout`        | `number`                     | `10000`      | Per-request timeout in milliseconds.                          |
| `auth`           | `AuthConfig`                 | —            | Credentials attached to authenticated requests.               |
| `maxBodyCapture` | `number`                     | `65536`      | Max bytes of a response body to read/keep as evidence.        |

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

The CLI auto-loads `pentry.config.json` from the working directory if present, or
point at any file with `--config <path>`.

## CLI flags

| Flag                                   | Maps to                |
| -------------------------------------- | ---------------------- |
| `--routes a,b,c`                       | `routes`               |
| `--fail-on <sev>`                      | `failOn`               |
| `--only a,b`                           | `checks`               |
| `--exclude a,b`                        | `exclude`              |
| `--ignore a,b`                         | `ignore`               |
| `--timeout <ms>`                       | `timeout`              |
| `--allow-external`                     | `allowExternal: true`  |
| `--format console\|json\|sarif\|junit` | output format          |
| `--output <file>`                      | write report to a file |
| `--config <file>`                      | load a config file     |
| `--quiet` / `--verbose`                | logging verbosity      |

## Suppressing a finding

Every finding has a stable `fingerprint`. To accept a specific finding (e.g. a
known, risk-accepted issue), add its fingerprint or the whole check ID to
`ignore`:

```json
{
  "ignore": [
    "info-disclosure",
    "cookies:http://localhost:3000:Cookie missing SameSite attribute (sid)"
  ]
}
```

Print fingerprints with `--format json` to copy the exact value.
