# Check authoring (internal conventions)

The public [writing-checks guide](../writing-checks.md) covers the mechanics of
the `Check` interface. This doc captures the conventions built-in checks follow
so the set stays consistent and trustworthy.

## Anatomy of a built-in check

One check per file in `src/checks/`, exported as a named const, then registered
in `src/checks/index.ts`'s `builtInChecks` array (in run order — passive/low-risk
first).

```
src/checks/
  security-headers.ts   export const securityHeadersCheck: Check
  cors.ts               export const corsCheck: Check
  index.ts              builtInChecks = [ … ]   ← registration + run order
```

## Conventions

### IDs and metadata

- `id` is kebab-case, stable, and unique. It appears in `--only`/`--exclude`,
  fingerprints, JSON, and SARIF rule IDs — treat it as public API.
- `title` is a short noun phrase; `description` is one line.
- Set `passive: true` only if the check never sends crafted requests — i.e. it
  reads responses to normal requests. Anything that probes is `passive: false`.

### Severity

- The `severity` field is the check's default; individual findings set their own
  `severity` (often varying by how bad the specific case is — see `cors`).
- Calibrate against [DD-5](./design-decisions.md): reserve `high`/`critical` for
  issues that are exploitable with real impact. Fingerprinting and missing
  defense-in-depth headers are `low`/`info`.

### Findings

Always build findings via `ctx.finding(...)` so `checkId` and `fingerprint` are
filled in consistently. Every finding must include:

- `title`, `severity`, `description` (what + why it matters), `remediation`
  (concrete fix), `references` (authoritative links).
- `target` — the specific URL.
- `evidence: res.evidence` — non-negotiable. A finding without reproducible proof
  is a bug.
- `key` — a discriminator unique within the check/target (route, header, cookie
  name). This makes fingerprints stable across runs so `ignore` lists and SARIF
  dedupe work.

### False-positive discipline

This is the bar. Before adding a check, answer: _what benign configuration looks
like a finding, and how does the check avoid flagging it?_ Examples of how the
built-ins do this:

- `access-control` only runs on routes the user declared `protected`, so it can't
  guess wrong.
- `security-headers` treats a CSP `frame-ancestors` as satisfying clickjacking
  protection, so it doesn't double-flag.
- `reflected-input` checks for the marker reflected **and** that it isn't present
  only in encoded form, avoiding false hits when the app escapes correctly.

If you can't articulate the false-positive story, the check isn't ready.

### Non-destructive guarantee

Active checks may send crafted requests but must never mutate state, exhaust
resources, or brute-force. Prefer a single crafted request per route. If a check
needs many requests, justify it and add a cap.

## Testing a check

Add cases to `test/checks.test.ts` using the fixture server:

- A **positive** case: a server configured to be vulnerable → expect the finding.
- A **negative** case: a server configured correctly → expect zero findings.

Test through `scan({ checks: ['your-check'] }, { logger: silentLogger })` so you
exercise the real context wiring, not the check function in isolation.

## Checklist before opening the PR

- [ ] Registered in `builtInChecks` at the right position
- [ ] Positive + negative tests
- [ ] Every finding has evidence, remediation, references, and a stable `key`
- [ ] Severity calibrated; false-positive story written in the PR
- [ ] Added to `docs/checks.md` and `CHANGELOG.md`
