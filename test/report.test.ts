import { afterEach, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';
import { silentLogger } from '../src/logger.js';
import { startFixture, type Fixture } from './fixture-server.js';

let fixture: Fixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

async function scanBareServer() {
  fixture = await startFixture((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('hello');
  });
  return scan({ target: fixture.url }, { logger: silentLogger });
}

describe('ScanReport', () => {
  it('summarizes findings by severity', async () => {
    const report = await scanBareServer();
    const summary = report.summary();
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    expect(total).toBe(report.findings.length);
  });

  it('assert() throws when findings meet the threshold', async () => {
    const report = await scanBareServer();
    if (!report.ok) {
      expect(() => report.assert()).toThrow(/security finding/i);
    }
  });

  it('produces valid JSON output', async () => {
    const report = await scanBareServer();
    const parsed = JSON.parse(report.format('json'));
    expect(parsed.tool).toBe('pentry');
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it('produces valid SARIF output', async () => {
    const report = await scanBareServer();
    const sarif = JSON.parse(report.format('sarif'));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.name).toBe('Pentry');
  });

  it('produces JUnit XML output', async () => {
    const report = await scanBareServer();
    const xml = report.format('junit');
    expect(xml).toContain('<testsuites');
    expect(xml).toContain('classname="pentry');
  });

  it('respects the ignore list', async () => {
    fixture = await startFixture((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('hello');
    });
    const report = await scan(
      { target: fixture.url, ignore: ['security-headers'] },
      { logger: silentLogger },
    );
    expect(report.findings.some((f) => f.checkId === 'security-headers')).toBe(false);
  });
});
