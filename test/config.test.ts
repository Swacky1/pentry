import { describe, expect, it } from 'vitest';
import { resolveConfig, isLocalHost, UnauthorizedTargetError } from '../src/config.js';

describe('isLocalHost', () => {
  it('accepts loopback and private addresses', () => {
    for (const host of [
      'localhost',
      'app.localhost',
      '127.0.0.1',
      '10.1.2.3',
      '192.168.0.5',
      '172.16.4.4',
      '::1',
      'myapp.test',
    ]) {
      expect(isLocalHost(host)).toBe(true);
    }
  });

  it('rejects public addresses', () => {
    for (const host of ['example.com', '8.8.8.8', '172.15.0.1', 'api.github.com']) {
      expect(isLocalHost(host)).toBe(false);
    }
  });
});

describe('resolveConfig', () => {
  it('refuses external targets without allowExternal', () => {
    expect(() => resolveConfig({ target: 'https://example.com' })).toThrow(UnauthorizedTargetError);
  });

  it('permits external targets when allowExternal is set', () => {
    const cfg = resolveConfig({ target: 'https://example.com', allowExternal: true });
    expect(cfg.baseUrl.hostname).toBe('example.com');
  });

  it('always includes the base path and de-dupes routes', () => {
    const cfg = resolveConfig({
      target: 'http://localhost:3000',
      routes: ['/a', { path: 'a', method: 'get' }, '/b'],
    });
    const keys = cfg.routes.map((r) => `${r.method} ${r.path}`);
    expect(keys).toContain('GET /');
    expect(keys.filter((k) => k === 'GET /a')).toHaveLength(1);
    expect(keys).toContain('GET /b');
  });

  it('applies sensible defaults', () => {
    const cfg = resolveConfig({ target: 'http://localhost:3000' });
    expect(cfg.failOn).toBe('medium');
    expect(cfg.timeout).toBe(10_000);
    expect(cfg.allowExternal).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(() => resolveConfig({ target: 'ftp://localhost' })).toThrow();
  });
});
