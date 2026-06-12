import { afterEach, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';
import { silentLogger } from '../src/logger.js';
import { startFixture, type Fixture } from './fixture-server.js';
import type { Handler } from './fixture-server.js';

let fixture: Fixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

async function run(handler: Handler, checks: string[], extra: Record<string, unknown> = {}) {
  fixture = await startFixture(handler);
  return scan({ target: fixture.url, checks, ...extra }, { logger: silentLogger });
}

describe('cache-control check', () => {
  it('flags a cacheable JSON response', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=600',
        });
        s.end('{"user":1}');
      },
      ['cache-control'],
    );
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('passes when JSON sets no-store', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        s.end('{"user":1}');
      },
      ['cache-control'],
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('cookies check — prefix validation', () => {
  it('flags a __Host- cookie missing required attributes', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, {
          'content-type': 'text/html',
          'set-cookie': '__Host-sid=abc; Path=/admin',
        });
        s.end('ok');
      },
      ['cookies'],
    );
    expect(report.findings.some((f) => /prefix/i.test(f.title))).toBe(true);
  });
});

describe('subresource-integrity check', () => {
  it('flags a cross-origin script without integrity', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, { 'content-type': 'text/html' });
        s.end('<html><head><script src="https://cdn.example.com/x.js"></script></head></html>');
      },
      ['subresource-integrity'],
    );
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('ignores same-origin scripts', async () => {
    fixture = await startFixture((_q, s) => {
      s.writeHead(200, { 'content-type': 'text/html' });
      s.end('<html><script src="/local.js"></script></html>');
    });
    const report = await scan(
      { target: fixture.url, checks: ['subresource-integrity'] },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('error-disclosure check', () => {
  it('flags a leaked Node.js stack trace', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(500, { 'content-type': 'text/plain' });
        s.end(
          'TypeError: x\n    at Object.<anonymous> (/app/server.js:42:13)\n    at Module._compile',
        );
      },
      ['error-disclosure'],
    );
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('does not flag a clean 404', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(404, { 'content-type': 'text/plain' });
        s.end('Not found');
      },
      ['error-disclosure'],
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('exposed-resources check', () => {
  it('flags an exposed .env file', async () => {
    const report = await run(
      (q, s) => {
        if (q.url === '/.env') {
          s.writeHead(200, { 'content-type': 'text/plain' });
          s.end('SECRET_KEY=supersecret\nDB_PASSWORD=hunter2');
          return;
        }
        s.writeHead(200, { 'content-type': 'text/html' });
        s.end('<html>ok</html>');
      },
      ['exposed-resources'],
    );
    expect(report.bySeverity('high').length).toBeGreaterThan(0);
  });

  it('flags directory listing', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, { 'content-type': 'text/html' });
        s.end('<html><head><title>Index of /</title></head><body>...</body></html>');
      },
      ['exposed-resources'],
    );
    expect(report.findings.some((f) => /directory listing/i.test(f.title))).toBe(true);
  });
});

describe('graphql-introspection check', () => {
  it('flags an endpoint that returns its schema', async () => {
    const report = await run(
      (q, s) => {
        if (q.url === '/graphql') {
          s.writeHead(200, { 'content-type': 'application/json' });
          s.end('{"data":{"__schema":{"queryType":{"name":"Query"}}}}');
          return;
        }
        s.writeHead(404);
        s.end();
      },
      ['graphql-introspection'],
    );
    expect(report.findings.length).toBeGreaterThan(0);
  });
});

describe('html reporter', () => {
  it('renders a self-contained HTML document', async () => {
    const report = await run(
      (_q, s) => {
        s.writeHead(200, { 'content-type': 'text/plain' });
        s.end('hi');
      },
      ['security-headers'],
    );
    const html = report.format('html');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Pentry security report');
    expect(html).not.toContain('<script src="http://'); // escaping sanity
  });
});
