import { afterEach, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';
import { silentLogger } from '../src/logger.js';
import { startFixture, type Fixture } from './fixture-server.js';

let fixture: Fixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

describe('security-headers check', () => {
  it('flags a response with no hardening headers', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hello');
    });

    const report = await scan(
      { target: fixture.url, checks: ['security-headers'] },
      { logger: silentLogger },
    );

    const ids = report.findings.map((f) => f.title);
    expect(ids.some((t) => /Content-Security-Policy/i.test(t))).toBe(true);
    expect(ids.some((t) => /X-Content-Type-Options/i.test(t))).toBe(true);
    expect(report.findings.every((f) => f.evidence)).toBe(true);
  });

  it('passes when headers are present', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(200, {
        'content-type': 'text/plain',
        'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'permissions-policy': 'geolocation=(), camera=()',
        'cross-origin-opener-policy': 'same-origin',
      });
      res.end('hello');
    });

    const report = await scan(
      { target: fixture.url, checks: ['security-headers'] },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('cors check', () => {
  it('flags credentialed reflection as critical', async () => {
    fixture = await startFixture((req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': req.headers.origin ?? '*',
        'access-control-allow-credentials': 'true',
      });
      res.end('{}');
    });

    const report = await scan({ target: fixture.url, checks: ['cors'] }, { logger: silentLogger });
    expect(report.bySeverity('critical').length).toBeGreaterThan(0);
  });
});

describe('access-control check', () => {
  it('flags a protected route that serves data anonymously', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"secret":true}');
    });

    const report = await scan(
      {
        target: fixture.url,
        routes: [{ path: '/admin', protected: true }],
        checks: ['access-control'],
      },
      { logger: silentLogger },
    );
    expect(report.bySeverity('high').length).toBe(1);
  });

  it('passes when the protected route returns 401', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end('{"error":"unauthorized"}');
    });

    const report = await scan(
      {
        target: fixture.url,
        routes: [{ path: '/admin', protected: true }],
        checks: ['access-control'],
      },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('reflected-input check', () => {
  it('flags unencoded reflection in HTML', async () => {
    fixture = await startFixture((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const q = url.searchParams.get('q') ?? '';
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<html><body>You searched: ${q}</body></html>`);
    });

    const report = await scan(
      { target: fixture.url, checks: ['reflected-input'] },
      { logger: silentLogger },
    );
    expect(report.bySeverity('high').length).toBeGreaterThan(0);
  });

  it('passes when reflection is HTML-encoded', async () => {
    fixture = await startFixture((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const q = (url.searchParams.get('q') ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<html><body>You searched: ${q}</body></html>`);
    });

    const report = await scan(
      { target: fixture.url, checks: ['reflected-input'] },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });
});
