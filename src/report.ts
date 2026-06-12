import { consoleReporter } from './reporters/console.js';
import { jsonReporter } from './reporters/json.js';
import { junitReporter } from './reporters/junit.js';
import { sarifReporter } from './reporters/sarif.js';
import type { Check, Finding, ResolvedConfig, Severity, SeveritySummary } from './types.js';
import { SEVERITY_ORDER, SEVERITIES } from './types.js';

export type ReportFormat = 'console' | 'json' | 'sarif' | 'junit';

/**
 * The result of a scan. Carries the findings plus helpers for CI gating
 * (`ok`, `assert`) and rendering (`format`). This is what `scan()` resolves to.
 */
export class ScanReport {
  constructor(
    readonly findings: Finding[],
    readonly config: ResolvedConfig,
    private readonly checks: Check[],
  ) {}

  /** Counts of findings by severity. */
  summary(): SeveritySummary {
    const summary = { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as SeveritySummary;
    for (const f of this.findings) summary[f.severity]++;
    return summary;
  }

  /** Number of findings at or above the configured `failOn` threshold. */
  blockingCount(): number {
    const threshold = SEVERITY_ORDER[this.config.failOn];
    return this.findings.filter((f) => SEVERITY_ORDER[f.severity] >= threshold).length;
  }

  /** True when no finding meets or exceeds the `failOn` severity. */
  get ok(): boolean {
    return this.blockingCount() === 0;
  }

  /** Findings at a specific severity. */
  bySeverity(severity: Severity): Finding[] {
    return this.findings.filter((f) => f.severity === severity);
  }

  /**
   * Throw if the scan is not `ok`. Use this inside a test so a security
   * regression fails your suite:
   *
   * ```ts
   * const report = await scan({ target: 'http://localhost:3000' });
   * report.assert();
   * ```
   */
  assert(): void {
    if (this.ok) return;
    const summary = this.summary();
    const lines = this.findings
      .filter((f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[this.config.failOn])
      .map((f) => `  • [${f.severity}] ${f.title} (${f.target})`);
    throw new Error(
      `Pentry: ${this.blockingCount()} security finding(s) at or above "${this.config.failOn}":\n` +
        lines.join('\n') +
        `\n\nTotals: ${SEVERITIES.map((s) => `${summary[s]} ${s}`).join(', ')}`,
    );
  }

  /** Render the report in the requested format. */
  format(format: ReportFormat = 'console'): string {
    const summary = this.summary();
    switch (format) {
      case 'json':
        return jsonReporter(this.findings, this.config, summary);
      case 'sarif':
        return sarifReporter(this.findings, this.config);
      case 'junit':
        return junitReporter(this.findings, this.config, this.checks);
      case 'console':
      default:
        return consoleReporter(this.findings, this.config, summary);
    }
  }

  toJSON(): unknown {
    return JSON.parse(this.format('json'));
  }
}
