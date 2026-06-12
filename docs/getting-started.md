# Getting started

Pentry runs security tests against your web app. This guide takes you from
install to a passing (or failing!) security check in a few minutes.

## Requirements

- Node.js 18 or newer (Pentry uses the built-in `fetch`).
- A running app you can reach over HTTP — typically `http://localhost:<port>`.

## Install

```bash
npm install --save-dev @red_official/pentry
```

## Your first scan (CLI)

Start your app, then:

```bash
npx pentry scan http://localhost:3000
```

Pentry prints a report and exits non-zero if it finds anything at or above the
`--fail-on` severity (default `medium`). That exit code is what lets it gate CI.

Useful flags:

```bash
# Only test specific routes
npx pentry scan http://localhost:3000 --routes /,/api/users,/login

# Be stricter about what fails the run
npx pentry scan http://localhost:3000 --fail-on low

# Machine-readable output
npx pentry scan http://localhost:3000 --format json --output pentry-report.json
```

Run `npx pentry --help` for the full list.

## Your first scan (in a test)

The real power is asserting on security inside your existing test runner. Pentry
is runner-agnostic — it just returns a report object you assert on.

```ts
import { test } from 'vitest';
import { scan } from '@red_official/pentry';

test('no security regressions', async () => {
  const report = await scan({
    target: 'http://localhost:3000',
    failOn: 'high',
  });

  // Throws a descriptive error (failing the test) if anything ≥ failOn exists.
  report.assert();
});
```

Prefer manual assertions? The report exposes everything:

```ts
const report = await scan({ target: 'http://localhost:3000' });

expect(report.ok).toBe(true);
expect(report.bySeverity('critical')).toHaveLength(0);
console.log(report.summary()); // { info: 1, low: 2, medium: 0, high: 0, critical: 0 }
```

## Spinning up the app inside the test

For integration tests, boot your server before scanning and tear it down after:

```ts
import { afterAll, beforeAll, test } from 'vitest';
import { scan } from '@red_official/pentry';
import { createServer } from '../src/server.js';

let server;
let url;

beforeAll(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

afterAll(() => server.close());

test('security', async () => {
  const report = await scan({ target: url });
  report.assert();
});
```

## The safety gate

By default Pentry **refuses** to scan anything that isn't a loopback or private
address. If you point it at a public host you'll get:

```
✗ Refusing to scan non-local target "example.com". …
```

That's intentional — you should only test systems you own. To scan your own
staging/production host, opt in explicitly:

```bash
npx pentry scan https://staging.myapp.com --allow-external
```

```ts
await scan({ target: 'https://staging.myapp.com', allowExternal: true });
```

## Next steps

- [Configuration](./configuration.md) — every option explained.
- [Checks reference](./checks.md) — what each check does and how to fix findings.
- [CI integration](./ci-integration.md) — wire Pentry into GitHub Actions and others.
- [Writing custom checks](./writing-checks.md) — add checks specific to your app.
