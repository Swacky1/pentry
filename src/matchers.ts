/**
 * Custom matchers for Vitest and Jest.
 *
 * Both runners accept the same `expect.extend` shape, so these work in either:
 *
 * ```ts
 * import { expect } from 'vitest';
 * import { pentryMatchers } from '@red_official/pentry/matchers';
 *
 * expect.extend(pentryMatchers);
 *
 * const report = await scan({ target: 'http://localhost:3000' });
 * expect(report).toBeSecure();
 * expect(report).toHaveNoFindingsAbove('high');
 * ```
 */
import type { ScanReport } from './report.js';
import type { Severity } from './types.js';
import { SEVERITY_ORDER } from './types.js';

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * The matcher set. Each returns the `{ pass, message }` object both Vitest and
 * Jest expect. We avoid importing either runner so this stays dependency-free.
 */
export const pentryMatchers = {
  /** Passes when the report has no new findings at or above its `failOn` severity. */
  toBeSecure(received: ScanReport): MatcherResult {
    assertReport(received, 'toBeSecure');
    const pass = received.ok;
    return {
      pass,
      message: () =>
        pass
          ? `expected the scan to have blocking findings, but it was clean`
          : received.failureSummary(),
    };
  },

  /** Passes when no new finding is at or above `severity`. */
  toHaveNoFindingsAbove(received: ScanReport, severity: Severity): MatcherResult {
    assertReport(received, 'toHaveNoFindingsAbove');
    const threshold = SEVERITY_ORDER[severity];
    const offending = received.newFindings().filter((f) => SEVERITY_ORDER[f.severity] >= threshold);
    const pass = offending.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? `expected findings at or above "${severity}", but found none`
          : `expected no findings at or above "${severity}", but found ${offending.length}:\n` +
            offending.map((f) => `  • [${f.severity}] ${f.title} (${f.target})`).join('\n'),
    };
  },
};

function assertReport(value: unknown, matcher: string): asserts value is ScanReport {
  if (!value || typeof (value as ScanReport).ok !== 'boolean') {
    throw new Error(
      `${matcher}: expected a Pentry ScanReport (the result of \`await scan(...)\`).`,
    );
  }
}
