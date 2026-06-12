import { consoleReporter } from './reporters/console.js';
import { jsonReporter } from './reporters/json.js';
import { junitReporter } from './reporters/junit.js';
import { markdownReporter } from './reporters/markdown.js';
import { sarifReporter } from './reporters/sarif.js';
import type { Check, Finding, ResolvedConfig, Severity, SeveritySummary } from './types.js';
import { SEVERITY_ORDER, SEVERITIES } from './types.js';

export type ReportFormat = 'console' | 'json' | 'sarif' | 'junit' | 'markdown';

export interface ScanReportOptions {
  /** Fingerprints accepted via a baseline — reported but not counted as blocking. */
  baseline?: Set<string>;
}

/**
 * The result of a scan. Carries the findings plus helpers for CI gating
 * (`ok`, `assert`) and rendering (`format`). This is what `scan()` resolves to.
 */
export class ScanReport {
  /** Fingerprints accepted via a baseline. */
  readonly baseline: Set<string>;

  constructor(
    readonly findings: Finding[],
    readonly config: ResolvedConfig,
    private readonly checks: Check[],
    options: ScanReportOptions = {},
  ) {
    this.baseline = options.baseline ?? new Set();
  }

  /** Counts of all findings by severity (baselined included). */
  summary(): SeveritySummary {
    const summary = { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as SeveritySummary;
    for (const f of this.findings) summary[f.severity]++;
    return summary;
  }

  /** Whether a finding is accepted by the baseline. */
  isBaselined(finding: Finding): boolean {
    return this.baseline.has(finding.fingerprint);
  }

  /** Findings not present in the baseline — the ones that can fail a run. */
  newFindings(): Finding[] {
    return this.findings.filter((f) => !this.isBaselined(f));
  }

  /** Findings accepted by the baseline. */
  baselinedFindings(): Finding[] {
    return this.findings.filter((f) => this.isBaselined(f));
  }

  /** Number of *new* findings at or above the configured `failOn` threshold. */
  blockingCount(): number {
    const threshold = SEVERITY_ORDER[this.config.failOn];
    return this.newFindings().filter((f) => SEVERITY_ORDER[f.severity] >= threshold).length;
  }

  /** True when no new finding meets or exceeds the `failOn` severity. */
  get ok(): boolean {
    return this.blockingCount() === 0;
  }

  /** Findings at a specific severity (baselined included). */
  bySeverity(severity: Severity): Finding[] {
    return this.findings.filter((f) => f.severity === severity);
  }

  /** Human-readable summary of why the run failed (empty string if it passed). */
  failureSummary(): string {
    if (this.ok) return '';
    const summary = this.summary();
    const threshold = SEVERITY_ORDER[this.config.failOn];
    const lines = this.newFindings()
      .filter((f) => SEVERITY_ORDER[f.severity] >= threshold)
      .map((f) => `  • [${f.severity}] ${f.title} (${f.target})`);
    const baselinedNote = this.baseline.size
      ? `\n(${this.baselinedFindings().length} baselined finding(s) ignored.)`
      : '';
    return (
      `Pentry: ${this.blockingCount()} new security finding(s) at or above "${this.config.failOn}":\n` +
      lines.join('\n') +
      `\n\nTotals: ${SEVERITIES.map((s) => `${summary[s]} ${s}`).join(', ')}` +
      baselinedNote
    );
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
    throw new Error(this.failureSummary());
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
      case 'markdown':
        return markdownReporter(this, summary);
      case 'console':
      default:
        return consoleReporter(this, summary);
    }
  }

  toJSON(): unknown {
    return JSON.parse(this.format('json'));
  }
}
