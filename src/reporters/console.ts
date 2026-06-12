import type { Finding, ResolvedConfig, Severity, SeveritySummary } from '../types.js';
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
export function consoleReporter(
  findings: Finding[],
  config: ResolvedConfig,
  summary: SeveritySummary,
): string {
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

  for (const f of sorted) {
    lines.push('');
    lines.push(`${SEVERITY_LABEL[f.severity]}  ${colors.bold(f.title)}`);
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
  const blocking = thresholdCount(summary, config.failOn);
  if (blocking > 0) {
    lines.push(colors.red(`✗ ${blocking} finding(s) at or above "${config.failOn}" — failing.`));
  } else {
    lines.push(colors.green(`✓ No findings at or above "${config.failOn}".`));
  }
  lines.push('');
  return lines.join('\n');
}

function summaryLine(summary: SeveritySummary): string {
  const parts = [
    summary.critical && colors.red(`${summary.critical} critical`),
    summary.high && colors.red(`${summary.high} high`),
    summary.medium && colors.yellow(`${summary.medium} medium`),
    summary.low && colors.blue(`${summary.low} low`),
    summary.info && colors.gray(`${summary.info} info`),
  ].filter(Boolean);
  return parts.length ? parts.join(colors.gray(' · ')) : colors.green('clean');
}

function thresholdCount(summary: SeveritySummary, failOn: Severity): number {
  return (Object.entries(summary) as [Severity, number][])
    .filter(([sev]) => SEVERITY_ORDER[sev] >= SEVERITY_ORDER[failOn])
    .reduce((sum, [, count]) => sum + count, 0);
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
