# Contributing to Pentry

Thanks for helping make Pentry better. This guide covers how to get set up and
what we look for in contributions.

## Ways to contribute

- **New checks** — the highest-impact contribution. See the
  [check-authoring guide](./docs/internal/check-authoring.md).
- **Bug fixes** and **false-positive reports** — precision is the product, so a
  reproducible false positive is a high-priority bug.
- **Docs** — clarity wins adopters.
- **Performance and DX** improvements.

## Getting set up

```bash
git clone https://github.com/Swacky1/pentry
cd pentry
npm install
```

Common scripts:

| Command              | What it does                        |
| -------------------- | ----------------------------------- |
| `npm run build`      | Build with tsup (ESM + CJS + types) |
| `npm test`           | Run the test suite                  |
| `npm run test:watch` | Watch mode                          |
| `npm run typecheck`  | `tsc --noEmit`                      |
| `npm run lint`       | ESLint                              |
| `npm run format`     | Prettier write                      |

Requires Node.js 18+.

## Project principles

Read these before proposing changes — they shape what gets merged:

1. **Zero runtime dependencies.** PRs that add a production dependency will be
   declined unless there's no reasonable alternative. Dev dependencies are fine.
2. **Precision over coverage.** A check must have a credible false-positive story.
   We'd rather ship fewer checks users trust than many they learn to ignore.
3. **Every finding carries evidence.** Attach the request/response that proves it.
4. **Non-destructive only.** No brute-forcing, resource exhaustion, or state
   changes. Ever.

See the [design decisions](./docs/internal/design-decisions.md) for the reasoning.

## Submitting a change

1. Fork and create a branch (`feat/cors-preflight`, `fix/cookie-parsing`).
2. Add or update tests — checks need a positive (vulnerable) and negative (safe)
   fixture case.
3. Run `npm run typecheck && npm run lint && npm test` locally.
4. Update docs: the [checks reference](./docs/checks.md) for new checks, and the
   [CHANGELOG](./CHANGELOG.md) under "Unreleased".
5. Open a PR using the template. Describe the security issue, and for checks,
   explain the false-positive controls.

## Commit messages

Conventional Commits are appreciated (`feat:`, `fix:`, `docs:`, `chore:`) but not
strictly enforced. Keep them descriptive.

## Reporting security issues in Pentry itself

Please **don't** open a public issue for a vulnerability in Pentry. See
[SECURITY.md](./SECURITY.md) for private disclosure.

## Code of conduct

By participating you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).
