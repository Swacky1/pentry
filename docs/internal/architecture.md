# Architecture

Internal reference for contributors. Public usage docs live one level up in
[`docs/`](../).

## High-level flow

```
PentryConfig
   │  resolveConfig()            apply defaults, normalize routes, SAFETY GATE
   ▼
ResolvedConfig
   │  scan()
   ▼
selectChecks() ── builtInChecks (+ user checks) filtered by checks/exclude
   │
   ▼
for each Check:
   createContext() ── { http, config, routes, log, finding() }
   check.run(ctx) ──► Finding[]      (errors are caught & logged, never fatal)
   │
   ▼
applyIgnores() ── drop fingerprints / check IDs in `ignore`
   │
   ▼
ScanReport ── ok / summary / assert / format(console|json|sarif|junit)
```

## Module map

| Path                 | Responsibility                                                     |
| -------------------- | ------------------------------------------------------------------ |
| `src/types.ts`       | All shared types. The contract every other module speaks.          |
| `src/config.ts`      | Defaults, normalization, and the localhost safety gate.            |
| `src/http/client.ts` | `fetch`-based client that captures evidence per request.           |
| `src/logger.ts`      | stderr logger + `silentLogger`. Human output never touches stdout. |
| `src/checks/*`       | One file per check; `checks/index.ts` is the registry.             |
| `src/scanner.ts`     | Orchestration: select checks, build context, collect findings.     |
| `src/report.ts`      | `ScanReport` — gating logic and reporter dispatch.                 |
| `src/reporters/*`    | Pure functions: `(findings, config, …) => string`.                 |
| `src/cli.ts`         | Arg parsing, config-file loading, exit codes.                      |
| `src/index.ts`       | Public API barrel.                                                 |

## Design invariants

These are load-bearing. Changing them is a breaking/architectural decision, not a
casual edit.

1. **Zero runtime dependencies.** Everything ships in `dist` with no `dependencies`
   in `package.json`. A security tool's supply chain is its own attack surface.
   Dev dependencies (build/test) are fine.
2. **stdout is for reports only.** All human/progress logging goes to stderr, so
   `pentry scan … --format json > out.json` is always clean.
3. **Findings carry evidence.** A finding without a reproducible request/response
   is a bug. Precision is the product.
4. **Default-deny on targets.** The safety gate in `resolveConfig` is the single
   choke point; never bypass it elsewhere.
5. **A failing check never fails the scan.** `scan()` catches per-check errors and
   logs a warning. One broken check shouldn't blind the others.

## Why a check is a plain object

Checks are data, not classes or registered plugins behind an API. This keeps the
barrier to authoring one near zero (see [check-authoring.md](./check-authoring.md))
and makes the built-in set trivially introspectable and testable. The registry is
just an array.

## Evidence model

`FetchHttpClient.request()` builds an `Evidence` object for every call: the
outgoing request (method/url/headers/body) and the response (status/headers plus
a truncated body snippet). Checks attach `res.evidence` to findings. Reporters
decide how much of it to render — the console shows a one-line `METHOD url →
status`, JSON/SARIF carry the full object.

## Reporters

Reporters are pure: `(findings, config, summary?) => string`. They never do I/O.
The CLI and `ScanReport.format()` own writing to stdout/files. Adding a format =
add a pure function + a `case` in `report.ts`.

## Concurrency

V1 runs checks sequentially for predictable output ordering and to avoid
hammering a dev server. Within a check, requests are also sequential. Parallelism
is a deliberate future optimization (see [roadmap.md](./roadmap.md)) gated behind
a concurrency limit — correctness and gentle load first.

## Testing strategy

Checks are tested against a real throwaway HTTP server (`test/fixture-server.ts`)
rather than mocks, so we exercise the actual `fetch` path and header handling.
Each check has a positive (vulnerable) and negative (safe) case.
