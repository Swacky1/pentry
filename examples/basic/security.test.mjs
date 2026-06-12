// Example: run Pentry as part of a test suite.
// This uses node:test so it has no extra dependencies, but the same pattern
// works in Vitest, Jest, or any runner.
//
//   node --test security.test.mjs
//
import { test, before, after } from 'node:test';
import { createServer } from 'node:http';
import { scan } from '@red_official/pentry';

let server;
let url;

before(async () => {
  // Boot the demo app on a random port.
  const { createServer: makeApp } = await import('node:http');
  server = makeApp((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname === '/api/admin') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"secret":true}');
      return;
    }
    res.writeHead(200, {
      'content-type': 'text/html',
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    });
    res.end('<html><body>ok</body></html>');
  });
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

after(() => server?.close());

test('app has no high+ security findings', async () => {
  const report = await scan({
    target: url,
    routes: ['/', { path: '/api/admin', protected: true }],
    failOn: 'high',
  });

  // This will throw — the /api/admin route is reachable without auth — which
  // is the point of the example. Fix the server to make the test pass.
  report.assert();
});
