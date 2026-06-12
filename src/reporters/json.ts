import type { Finding, ResolvedConfig, SeveritySummary } from '../types.js';

export interface JsonReport {
  tool: 'pentry';
  version: number;
  target: string;
  summary: SeveritySummary;
  total: number;
  findings: Finding[];
}

/** Machine-readable JSON report (stable shape; bump `version` on changes). */
export function jsonReporter(
  findings: Finding[],
  config: ResolvedConfig,
  summary: SeveritySummary,
): string {
  const report: JsonReport = {
    tool: 'pentry',
    version: 1,
    target: config.target,
    summary,
    total: findings.length,
    findings,
  };
  return JSON.stringify(report, null, 2);
}
