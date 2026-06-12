import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfigFile, findConfigFile } from '../src/config-file.js';
import { scaffoldInit } from '../src/init.js';
import { createBaseline, writeBaseline, loadBaseline } from '../src/baseline.js';
import type { ResolvedConfig } from '../src/types.js';

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pentry-test-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('config-file loader', () => {
  it('loads a JSON config', async () => {
    const dir = tempDir();
    const file = join(dir, 'pentry.config.json');
    writeFileSync(file, JSON.stringify({ target: 'http://localhost:3000', failOn: 'high' }));
    const cfg = await loadConfigFile(file);
    expect(cfg.target).toBe('http://localhost:3000');
    expect(cfg.failOn).toBe('high');
  });

  it('finds a config file by convention', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'pentry.config.json'), '{}');
    expect(findConfigFile(dir)).toBe(join(dir, 'pentry.config.json'));
  });

  it('throws a clear error for a missing file', async () => {
    await expect(loadConfigFile('does-not-exist.json')).rejects.toThrow(/not found/i);
  });
});

describe('init scaffolder', () => {
  it('creates a config and a test, then skips on re-run', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ devDependencies: { vitest: '^1' } }));

    const first = scaffoldInit(dir);
    expect(first.runner).toBe('vitest');
    expect(first.created).toContain('pentry.config.json');
    expect(first.created).toContain('pentry.security.test.mjs');
    expect(existsSync(join(dir, 'pentry.config.json'))).toBe(true);

    const second = scaffoldInit(dir);
    expect(second.created).toHaveLength(0);
    expect(second.skipped.length).toBeGreaterThan(0);
  });

  it('falls back to node:test with no test runner', () => {
    const dir = tempDir();
    const result = scaffoldInit(dir);
    expect(result.runner).toBe('node');
    const test = readFileSync(join(dir, 'pentry.security.test.mjs'), 'utf8');
    expect(test).toContain("from 'node:test'");
  });
});

describe('baseline file round-trip', () => {
  it('writes and reloads fingerprints', () => {
    const dir = tempDir();
    const path = join(dir, 'pentry-baseline.json');
    const fakeReport = {
      config: { target: 'http://localhost:3000' } as ResolvedConfig,
      findings: [{ fingerprint: 'a' }, { fingerprint: 'b' }, { fingerprint: 'a' }],
    };
    // createBaseline only reads .config.target and .findings[].fingerprint
    writeBaseline(path, createBaseline(fakeReport as never, '2026-01-01T00:00:00Z'));
    const loaded = loadBaseline(path);
    expect([...loaded].sort()).toEqual(['a', 'b']);
  });

  it('returns an empty set when the baseline file is missing', () => {
    expect(loadBaseline(join(tempDir(), 'nope.json')).size).toBe(0);
  });
});
