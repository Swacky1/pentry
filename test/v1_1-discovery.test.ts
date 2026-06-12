import { afterEach, describe, expect, it } from 'vitest';
import { discoverOpenApiRoutes } from '../src/discovery/openapi.js';
import { discoverExpressRoutes } from '../src/discovery/express.js';
import { discoverRoutes } from '../src/discovery/index.js';
import { scan } from '../src/scanner.js';
import { silentLogger } from '../src/logger.js';
import { startFixture, type Fixture } from './fixture-server.js';

let fixture: Fixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

describe('OpenAPI route discovery', () => {
  const spec = {
    openapi: '3.0.0',
    paths: {
      '/users': { get: {}, post: {} },
      '/users/{id}': { get: {}, delete: {} },
      '/health': { get: {} },
    },
  };

  it('extracts paths and methods, concretizing templates', () => {
    const routes = discoverOpenApiRoutes(spec);
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(keys).toContain('GET /users');
    expect(keys).toContain('POST /users');
    expect(keys).toContain('GET /users/1'); // {id} → 1
    expect(keys).toContain('DELETE /users/1');
    expect(keys).toContain('GET /health');
  });

  it('is reachable via the generic discoverRoutes', () => {
    expect(discoverRoutes(spec).length).toBe(5);
  });
});

describe('Express route discovery', () => {
  // A synthetic Express router stack (avoids depending on express itself).
  const app = {
    _router: {
      stack: [
        { route: { path: '/', methods: { get: true } } },
        { route: { path: '/login', methods: { get: true, post: true } } },
        {
          name: 'router',
          regexp: { source: '^\\/api\\/?(?=\\/|$)' },
          handle: {
            stack: [{ route: { path: '/users', methods: { get: true } } }],
          },
        },
      ],
    },
  };

  it('discovers top-level and mounted routes', () => {
    const routes = discoverExpressRoutes(app);
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(keys).toContain('GET /');
    expect(keys).toContain('GET /login');
    expect(keys).toContain('POST /login');
    expect(keys).toContain('GET /api/users'); // mount prefix recovered
  });

  it('throws a clear error on a non-Express object', () => {
    expect(() => discoverExpressRoutes({} as never)).toThrow(/router stack/i);
  });
});

describe('discovered routes feed scan()', () => {
  it('scans every discovered route', async () => {
    fixture = await startFixture((req, res) => {
      // Reflect q unencoded on any path → reflected-input fires per route.
      const u = new URL(req.url ?? '/', 'http://localhost');
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<html>${u.searchParams.get('q') ?? ''}</html>`);
    });
    const routes = discoverOpenApiRoutes({
      openapi: '3.0.0',
      paths: { '/a': { get: {} }, '/b': { get: {} } },
    });
    const report = await scan(
      { target: fixture.url, routes, checks: ['reflected-input'] },
      { logger: silentLogger },
    );
    const targets = new Set(report.findings.map((f) => new URL(f.target).pathname));
    expect(targets.has('/a')).toBe(true);
    expect(targets.has('/b')).toBe(true);
  });
});

describe('concurrency', () => {
  it('produces the same findings regardless of concurrency', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hello');
    });
    const seq = await scan({ target: fixture.url, concurrency: 1 }, { logger: silentLogger });
    const par = await scan({ target: fixture.url, concurrency: 8 }, { logger: silentLogger });
    expect(par.findings.length).toBe(seq.findings.length);
    // Deterministic order despite parallelism.
    expect(par.findings.map((f) => f.fingerprint)).toEqual(seq.findings.map((f) => f.fingerprint));
  });
});
