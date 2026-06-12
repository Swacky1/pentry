# Writing custom checks

A check is the unit of security testing in Pentry. Built-in checks are plain
objects implementing the `Check` interface — yours look exactly the same and run
right alongside them.

## The `Check` interface

```ts
interface Check {
  id: string; // stable, kebab-case, unique
  title: string; // human-readable name
  description: string; // one line: what it looks for
  severity: Severity; // default severity for findings
  passive: boolean; // true = only reads normal responses
  run(ctx: CheckContext): Promise<Finding[]>;
}
```

## A minimal example

This check flags any route that responds without a `Cache-Control` header on a
JSON endpoint (a stand-in for "sensitive responses should not be cached"):

```ts
import type { Check } from '@red_official/pentry';

export const noCacheControl: Check = {
  id: 'no-cache-control',
  title: 'Missing Cache-Control on JSON responses',
  description: 'Flags JSON responses served without a Cache-Control header.',
  severity: 'low',
  passive: true,
  async run(ctx) {
    const findings = [];
    for (const route of ctx.routes) {
      const res = await ctx.http.get(route.path);
      const isJson = (res.headers['content-type'] ?? '').includes('json');
      if (isJson && !res.headers['cache-control']) {
        findings.push(
          ctx.finding({
            key: route.path,
            title: `No Cache-Control on ${route.path}`,
            severity: 'low',
            description: 'JSON responses without Cache-Control may be cached by proxies/browsers.',
            remediation: 'Set "Cache-Control: no-store" on responses containing sensitive data.',
            references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Cache-Control'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }
    return findings;
  },
};
```

## Running custom checks

Pass them via `scan` options. They run _in addition_ to the built-ins by default:

```ts
import { scan } from '@red_official/pentry';
import { noCacheControl } from './checks/no-cache-control.js';

const report = await scan({ target: 'http://localhost:3000' }, { checks: [noCacheControl] });
```

Run _only_ your checks with `replaceChecks: true`:

```ts
await scan({ target: '…' }, { checks: [noCacheControl], replaceChecks: true });
```

## The `CheckContext`

Your `run` receives everything it needs:

| Field            | Purpose                                                             |
| ---------------- | ------------------------------------------------------------------- |
| `http`           | HTTP client (`get`, `request`, `resolve`) that captures evidence    |
| `config`         | The resolved configuration                                          |
| `baseUrl`        | Parsed base URL (`URL` object)                                      |
| `routes`         | Normalized routes to test                                           |
| `log`            | Logger (`info` / `warn` / `debug`)                                  |
| `finding(input)` | Builds a `Finding`, filling in `checkId` and a stable `fingerprint` |

## Guidelines for good checks

These are the rules the built-in checks follow — they're what keep Pentry
trustworthy:

1. **Always attach evidence.** Every finding should carry the request/response
   that proves it (`evidence: res.evidence`). A finding a human can't verify is
   noise.
2. **Prefer precision over coverage.** A check that occasionally cries wolf gets
   the whole tool removed from CI. When unsure, raise a lower severity or don't
   report.
3. **Stay non-destructive.** Active checks may send crafted requests, but must
   never delete data, exhaust resources, or change state. No brute-forcing.
4. **Make `key` unique.** Pass a `key` to `ctx.finding` that distinguishes
   findings within the same check/target (e.g. the route or header name) so
   fingerprints are stable and dedupe correctly.
5. **Write actionable remediation.** Tell the developer exactly what to change.

## Publishing a check pack

Custom checks are just objects, so you can publish a package that exports an
array of them and let others import and pass them to `scan`. If you build
something broadly useful, consider contributing it back — see the
[check-authoring guide](./internal/check-authoring.md) for the internal
conventions built-in checks follow.
