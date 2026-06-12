# API reference

Everything Pentry exports from its package entry point. TypeScript types ship
with the package.

## `scan(config, options?)`

```ts
function scan(config: PentryConfig, options?: ScanOptions): Promise<ScanReport>;
```

Runs a scan and resolves to a [`ScanReport`](#scanreport). The primary entry
point.

```ts
import { scan } from '@red_official/pentry';

const report = await scan(
  { target: 'http://localhost:3000', failOn: 'high' },
  {
    /* options */
  },
);
```

### `ScanOptions`

| Field           | Type      | Description                                           |
| --------------- | --------- | ----------------------------------------------------- |
| `checks`        | `Check[]` | Extra custom checks to run.                           |
| `replaceChecks` | `boolean` | Run only `checks`, skipping the built-ins.            |
| `logger`        | `Logger`  | Custom logger. Pass `silentLogger` to silence output. |

## `ScanReport`

The object returned by `scan`.

| Member            | Type              | Description                                                 |
| ----------------- | ----------------- | ----------------------------------------------------------- |
| `findings`        | `Finding[]`       | All findings (after `ignore` filtering).                    |
| `ok`              | `boolean`         | `true` if nothing is at/above `failOn`.                     |
| `summary()`       | `SeveritySummary` | Counts by severity.                                         |
| `blockingCount()` | `number`          | Findings at/above `failOn`.                                 |
| `bySeverity(sev)` | `Finding[]`       | Findings of a given severity.                               |
| `assert()`        | `void`            | Throws a descriptive error if `!ok`.                        |
| `format(fmt?)`    | `string`          | Render as `console` (default), `json`, `sarif`, or `junit`. |
| `toJSON()`        | `unknown`         | The JSON report as an object.                               |

## `Scanner`

A thin class wrapper over `scan` for when an object form is preferable:

```ts
const report = await new Scanner({ target: '…' }, options).run();
```

## Configuration helpers

### `defineConfig(config)`

Identity function for type-checked config files.

```ts
import { defineConfig } from '@red_official/pentry';
export default defineConfig({ target: 'http://localhost:3000' });
```

### `resolveConfig(config)`

Applies defaults and validation, returning a `ResolvedConfig`. Throws
`UnauthorizedTargetError` for non-local targets without `allowExternal`.

### `isLocalHost(hostname)`

`boolean` — whether a hostname is loopback/private. Used by the safety gate.

### `UnauthorizedTargetError`

Error thrown when a scan would hit a non-authorized host.

## Checks

### `builtInChecks`

`Check[]` — the default check set, in run order.

### `getCheck(id)`

Look up a built-in check by ID. Returns `Check | undefined`.

Individual checks are also exported by name: `securityHeadersCheck`,
`cookiesCheck`, `infoDisclosureCheck`, `corsCheck`, `httpMethodsCheck`,
`accessControlCheck`, `reflectedInputCheck`.

## Logging

### `createLogger(options?)`

Creates the default stderr logger. Options: `{ quiet?, verbose? }`.

### `silentLogger`

A `Logger` that discards all output — handy for library and test use.

## Constants

- `SEVERITIES` — `Severity[]`, ordered low → high.
- `SEVERITY_ORDER` — `Record<Severity, number>` for comparisons.

## Types

The package exports all public types, including: `PentryConfig`,
`ResolvedConfig`, `RouteSpec`, `AuthConfig`, `Check`, `CheckContext`, `Finding`,
`FindingInput`, `Evidence`, `Severity`, `SeveritySummary`, `HttpClient`,
`HttpRequestOptions`, `HttpResponse`, `Logger`, `ScanOptions`, `ReportFormat`.

See the [type definitions](../src/types.ts) for full detail.
