import type { ScanReport } from '../report.js';
import type { Finding, Severity, SeveritySummary } from '../types.js';
import { SEVERITY_ORDER } from '../types.js';

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: '🟥',
  high: '🟥',
  medium: '🟧',
  low: '🟦',
  info: '⬜',
};

/**
 * Markdown report, suitable for pasting into a PR comment or a job summary
 * (e.g. `$GITHUB_STEP_SUMMARY`). Groups findings by severity and folds details
 * into `<details>` blocks so long reports stay scannable.
 */
export function markdownReporter(report: ScanReport, summary: SeveritySummary): string {
  const lines: string[] = [];
  lines.push(`## Pentry security report`);
  lines.push('');
  lines.push(`**Target:** \`${report.config.target}\``);
  lines.push('');

  if (report.findings.length === 0) {
    lines.push('✅ **No issues found.**');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Severity | Count |');
  lines.push('| --- | --- |');
  for (const sev of ['critical', 'high', 'medium', 'low', 'info'] as Severity[]) {
    if (summary[sev]) lines.push(`| ${SEVERITY_EMOJI[sev]} ${sev} | ${summary[sev]} |`);
  }
  lines.push('');

  const status = report.ok
    ? `✅ No new findings at or above \`${report.config.failOn}\`.`
    : `❌ **${report.blockingCount()} new finding(s) at or above \`${report.config.failOn}\` — failing.**`;
  lines.push(status);
  lines.push('');

  const sorted = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  for (const f of sorted) {
    const baselined = report.isBaselined(f) ? ' _(baselined)_' : '';
    lines.push(`<details>`);
    lines.push(
      `<summary>${SEVERITY_EMOJI[f.severity]} <strong>${escape(f.title)}</strong>${baselined} — <code>${f.checkId}</code></summary>`,
    );
    lines.push('');
    lines.push(`**Target:** \`${f.target}\``);
    lines.push('');
    lines.push(escape(f.description));
    lines.push('');
    lines.push(`**Fix:** ${escape(f.remediation)}`);
    if (f.evidence) lines.push(evidenceBlock(f));
    if (f.references[0]) lines.push(`\n${f.references.map((r) => `- ${r}`).join('\n')}`);
    lines.push('');
    lines.push(`</details>`);
    lines.push('');
  }

  return lines.join('\n');
}

function evidenceBlock(f: Finding): string {
  const ev = f.evidence!;
  return (
    `\n\`\`\`http\n${ev.request.method} ${ev.request.url}\n` + `→ ${ev.response.status}\n\`\`\``
  );
}

function escape(text: string): string {
  return text.replace(/([<>])/g, '\\$1');
}
