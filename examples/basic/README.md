# Basic example

A tiny, intentionally-imperfect app you can scan with Pentry to see it in action.

## Scan from the CLI

```bash
node server.mjs
# in another terminal:
npx pentry scan http://localhost:4000 --routes /,/search,/api/admin
```

You should see findings for:

- **Reflected input** on `/search` (input echoed unencoded into HTML)
- **Missing security headers** on every route
- (Mark `/api/admin` as `protected` in a config to also catch **broken access
  control** — see below.)

## Scan from a test

`security.test.mjs` boots a server and asserts on the report:

```bash
node --test security.test.mjs
```

It intentionally fails, because `/api/admin` serves data without auth. That's the
demo: Pentry caught a real issue. Fix the server so the route returns `401` when
unauthenticated and the test goes green.

## Config-file version

`pentry.config.json` in this folder declares the routes (including the protected
one) so you can just run:

```bash
npx pentry scan --config pentry.config.json
```
