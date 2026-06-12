import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ScanReport } from './report.js';

/** On-disk baseline format. */
export interface BaselineFile {
  tool: 'pentry';
  version: number;
  /** When the baseline was generated (ISO timestamp). */
  createdAt: string;
  /** The target it was generated against (informational). */
  target?: string;
  /** Fingerprints of accepted/known findings. */
  fingerprints: string[];
}

export const DEFAULT_BASELINE_PATH = 'pentry-baseline.json';

/**
 * Load the set of baselined fingerprints from a file. Returns an empty set if
 * the file does not exist, so a missing baseline simply means "nothing is
 * accepted yet."
 */
export function loadBaseline(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const data = JSON.parse(readFileSync(path, 'utf8')) as BaselineFile;
  return new Set(data.fingerprints ?? []);
}

/** Build a baseline file object from a scan report. */
export function createBaseline(report: ScanReport, createdAt: string): BaselineFile {
  return {
    tool: 'pentry',
    version: 1,
    createdAt,
    target: report.config.target,
    fingerprints: [...new Set(report.findings.map((f) => f.fingerprint))].sort(),
  };
}

/** Write a baseline file to disk (pretty-printed). */
export function writeBaseline(path: string, baseline: BaselineFile): void {
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}
