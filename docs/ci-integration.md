# CI integration

Pentry is designed to run in CI as a gate: start your app, scan it, and fail the
build if security findings cross your threshold. It exits non-zero when findings
meet `--fail-on`, and can emit SARIF or JUnit for native CI reporting.

## GitHub Actions

### Using the Pentry action (simplest)

```yaml
name: security
on: [push, pull_request]

jobs:
  pentry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: npm ci && npm run build --if-present
      - run: npm start &
      - run: npx wait-on http://localhost:3000
      - name: Pentry scan
        uses: Swacky1/pentry@v1
        with:
          target: http://localhost:3000
          fail-on: high
          routes: /,/api/users
```

Action inputs: `target` (required), `fail-on`, `routes`, `format`, `output`,
`config`, `baseline`, `version`.

### Or call the CLI directly

```yaml
- name: Pentry scan
  run: npx @red_official/pentry scan http://localhost:3000 --fail-on high
```

### Surface findings in the Security tab (SARIF)

Upload SARIF so findings appear in GitHub's **Security → Code scanning** view and
as inline PR annotations:

```yaml
- name: Pentry scan (SARIF)
  run: npx pentry scan http://localhost:3000 --format sarif --output pentry.sarif
  continue-on-error: true # let the upload run even if findings fail the gate
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: pentry.sarif
```

> Use `continue-on-error: true` on the scan step if you want the SARIF uploaded
> even when the scan fails the build, then enforce the gate via a separate step
> or branch protection.

## GitLab CI

JUnit reports render in GitLab's merge-request widget:

```yaml
pentry:
  image: node:20
  script:
    - npm ci
    - npm start &
    - npx wait-on http://localhost:3000
    - npx pentry scan http://localhost:3000 --format junit --output pentry-junit.xml
  artifacts:
    when: always
    reports:
      junit: pentry-junit.xml
```

## CircleCI / Jenkins / others

Any system that understands JUnit XML can consume Pentry's output:

```bash
npx pentry scan http://localhost:3000 --format junit --output pentry-junit.xml
```

Point your platform's test-report collector at `pentry-junit.xml`.

## Running it as part of your test suite

If you already run integration tests in CI, you don't need a separate job — put
the scan in a test and let your runner handle it (see
[getting-started.md](./getting-started.md)). The scan then shows up wherever your
test results do.

## Tips

- **Wait for the app.** Use `wait-on`, `wait-for-it`, or a health-check loop
  before scanning so you don't race the server's startup.
- **Pick a deliberate `failOn`.** Start at `high` to gate only serious issues,
  then ratchet down to `medium`/`low` as you clean up the backlog.
- **Scan a realistic build.** Run against the production build of your app, not
  the dev server, so headers and error handling match reality.
- **Keep secrets out.** If a route needs auth, pass a dedicated test token via
  `auth`, not a real user credential.
