# Release process

Pentry publishes to npm. Releases are cut from `main` and triggered by pushing a
version tag, which runs `.github/workflows/release.yml`.

## Versioning

[Semantic Versioning](https://semver.org). Pre-1.0, treat any breaking change to
the public API (`scan`, `ScanReport`, config shape, check IDs, report formats) as
a minor bump and call it out loudly in the changelog.

Check IDs, the JSON report shape (`version` field), and the SARIF/JUnit output
are part of the public contract — changing them is breaking.

## Steps

1. **Land everything** on `main`; ensure CI is green.
2. **Update the changelog.** Move items from `Unreleased` into a new
   `## [x.y.z] — YYYY-MM-DD` section. Update the compare links at the bottom.
3. **Bump the version** in `package.json`. Also update the `VERSION` constant in
   `src/cli.ts` (kept in sync manually).
4. **Verify locally:**
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   npm pack --dry-run   # confirm only dist/, README, LICENSE, CHANGELOG ship
   ```
5. **Commit** the version bump (`chore: release vX.Y.Z`) and push to `main`.
6. **Tag and push:**
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
7. The **Release workflow** runs tests + build and publishes with
   `npm publish --provenance --access public`. It needs an `NPM_TOKEN` repo
   secret with publish rights.
8. **Create the GitHub Release** from the tag, pasting the changelog section.

## What gets published

Controlled by the `files` field in `package.json`: `dist/`, `README.md`,
`LICENSE`, `CHANGELOG.md`. Source, tests, and docs are intentionally excluded
from the npm tarball (they live on GitHub). Verify with `npm pack --dry-run`.

## Pre-release / beta

For a release candidate, tag a prerelease version and publish under a dist-tag:

```bash
npm version 0.2.0-rc.0 --no-git-tag-version
npm publish --tag next --access public
```

Users opt in with `npm install @red_official/pentry@next`.

## Rollback

npm doesn't allow re-publishing a version. If a release is broken:

1. Publish a patch with the fix (preferred), or
2. `npm deprecate @red_official/pentry@x.y.z "reason — use x.y.z+1"` to warn installers.

Avoid `npm unpublish` except within the 72-hour window for genuinely broken
publishes — it breaks anyone who already pinned the version.
