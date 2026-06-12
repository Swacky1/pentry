import type { ScanReport } from '../report.js';
import type { Severity, SeveritySummary } from '../types.js';
import { SEVERITY_ORDER } from '../types.js';
import { colors } from '../util/colors.js';

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: colors.bgRed(colors.bold(' CRIT ')),
  high: colors.red(colors.bold('HIGH')),
  medium: colors.yellow(colors.bold('MED ')),
  low: colors.blue('LOW '),
  info: colors.gray('INFO'),
};

/** Pretty, human-readable report for terminals. */
export function consoleReporter(report: ScanReport, summary: SeveritySummary): string {
  const { config, findings } = report;
  const lines: string[] = [];
  lines.push('');
  lines.push(colors.bold(`Pentry security report — ${config.target}`));
  lines.push(colors.gray('─'.repeat(60)));

  if (findings.length === 0) {
    lines.push(colors.green('✓ No issues found.'));
    lines.push('');
    return lines.join('\n');
  }

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  let currentSeverity: Severity | null = null;
  for (const f of sorted) {
    // Group header whenever the severity changes (sorted high → low).
    if (f.severity !== currentSeverity) {
      currentSeverity = f.severity;
      const count = sorted.filter((x) => x.severity === currentSeverity).length;
      lines.push('');
      lines.push(colors.gray(`──── ${currentSeverity.toUpperCase()} (${count}) ────`));
    }
    const baselined = report.isBaselined(f);
    lines.push('');
    const tag = baselined ? colors.gray(' (baseline)') : '';
    lines.push(`${SEVERITY_LABEL[f.severity]}  ${colors.bold(f.title)}${tag}`);
    lines.push(colors.gray(`      ${f.checkId} · ${f.target}`));
    lines.push(`      ${wrapText(f.description, 6)}`);
    lines.push(`      ${colors.cyan('Fix:')} ${wrapText(f.remediation, 6)}`);
    if (f.evidence) {
      const ev = f.evidence;
      lines.push(
        colors.gray(`      ${ev.request.method} ${ev.request.url} → ${ev.response.status}`),
      );
    }
    if (f.references[0]) lines.push(colors.gray(colors.underline(`      ${f.references[0]}`)));
  }

  lines.push('');
  lines.push(colors.gray('─'.repeat(60)));
  lines.push(summaryLine(summary));
  if (report.baseline.size > 0) {
    lines.push(
      colors.gray(`${report.baselinedFindings().length} finding(s) accepted by baseline.`),
    );
  }
  const blocking = report.blockingCount();
  if (blocking > 0) {
    lines.push(
      colors.red(`✗ ${blocking} new finding(s) at or above "${config.failOn}" — failing.`),
    );
  } else {
    lines.push(colors.green(`✓ No new findings at or above "${config.failOn}".`));
  }
  lines.push('');
  return lines.join('\n');
}

function summaryLine(summary: SeveritySummary): string {
  const parts: Array<string | false> = [
    summary.critical > 0 && colors.red(`${summary.critical} critical`),
    summary.high > 0 && colors.red(`${summary.high} high`),
    summary.medium > 0 && colors.yellow(`${summary.medium} medium`),
    summary.low > 0 && colors.blue(`${summary.low} low`),
    summary.info > 0 && colors.gray(`${summary.info} info`),
  ];
  const present = parts.filter((p): p is string => Boolean(p));
  return present.length ? present.join(colors.gray(' · ')) : colors.green('clean');
}

/** Word-wrap `text` to the terminal width, indenting continuation lines. */
function wrapText(text: string, indent: number): string {
  const width = Math.max(40, 100 - indent);
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  const pad = ' '.repeat(indent);
  return out.map((l, i) => (i === 0 ? l : `${pad}${l}`)).join('\n');
}
