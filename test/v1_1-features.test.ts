import { afterEach, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';
import { silentLogger } from '../src/logger.js';
import { pentryMatchers } from '../src/matchers.js';
import { createBaseline } from '../src/baseline.js';
import { startFixture, type Fixture } from './fixture-server.js';

let fixture: Fixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

/** A server that triggers several security-header findings. */
async function bareServer() {
  fixture = await startFixture((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('hello');
  });
  return fixture.url;
}

describe('per-check severity overrides', () => {
  it('remaps a check’s findings to a new severity', async () => {
    const url = await bareServer();
    const report = await scan(
      {
        target: url,
        checks: ['security-headers'],
        overrides: { 'security-headers': { severity: 'info' } },
      },
      { logger: silentLogger },
    );
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.every((f) => f.severity === 'info')).toBe(true);
  });

  it('disables a check via overrides.enabled = false', async () => {
    const url = await bareServer();
    const report = await scan(
      {
        target: url,
        checks: ['security-headers'],
        overrides: { 'security-headers': { enabled: false } },
      },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });
});

describe('ignore rules with expiry', () => {
  it('suppresses a check while the rule is active', async () => {
    const url = await bareServer();
    const report = await scan(
      {
        target: url,
        checks: ['security-headers'],
        ignore: [{ check: 'security-headers', reason: 'tracked in JIRA-1', expires: '2999-01-01' }],
      },
      { logger: silentLogger },
    );
    expect(report.findings).toHaveLength(0);
  });

  it('lapses an expired ignore so the finding resurfaces', async () => {
    const url = await bareServer();
    const report = await scan(
      {
        target: url,
        checks: ['security-headers'],
        ignore: [{ check: 'security-headers', expires: '2000-01-01' }],
      },
      { logger: silentLogger },
    );
    expect(report.findings.length).toBeGreaterThan(0);
  });
});

describe('baseline', () => {
  it('marks baselined findings as non-blocking and only fails on new ones', async () => {
    const url = await bareServer();

    const first = await scan(
      { target: url, checks: ['security-headers'], failOn: 'low' },
      { logger: silentLogger },
    );
    expect(first.ok).toBe(false); // header findings exist

    const baseline = new Set(createBaseline(first, '2026-01-01T00:00:00Z').fingerprints);
    const second = await scan(
      { target: url, checks: ['security-headers'], failOn: 'low' },
      { logger: silentLogger, baseline },
    );

    expect(second.findings.length).toBe(first.findings.length); // still reported
    expect(second.baselinedFindings().length).toBe(second.findings.length);
    expect(second.newFindings()).toHaveLength(0);
    expect(second.ok).toBe(true); // nothing new → passes
  });
});

describe('matchers', () => {
  it('toBeSecure passes on a clean report and fails otherwise', async () => {
    const url = await bareServer();
    const insecure = await scan(
      { target: url, checks: ['security-headers'], failOn: 'low' },
      { logger: silentLogger },
    );
    expect(pentryMatchers.toBeSecure(insecure).pass).toBe(false);

    const ignoredAll = await scan(
      { target: url, checks: ['security-headers'], exclude: ['security-headers'] },
      { logger: silentLogger },
    );
    expect(pentryMatchers.toBeSecure(ignoredAll).pass).toBe(true);
  });

  it('toHaveNoFindingsAbove respects the threshold', async () => {
    const url = await bareServer();
    const report = await scan(
      { target: url, checks: ['security-headers'] },
      { logger: silentLogger },
    );
    // security-headers emits low/medium findings, nothing critical
    expect(pentryMatchers.toHaveNoFindingsAbove(report, 'critical').pass).toBe(true);
  });
});

describe('markdown reporter', () => {
  it('renders a markdown report with a summary table', async () => {
    const url = await bareServer();
    const report = await scan(
      { target: url, checks: ['security-headers'] },
      { logger: silentLogger },
    );
    const md = report.format('markdown');
    expect(md).toContain('## Pentry security report');
    expect(md).toContain('| Severity | Count |');
  });
});
