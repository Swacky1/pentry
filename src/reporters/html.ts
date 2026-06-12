import type { ScanReport } from '../report.js';
import type { Finding, Severity, SeveritySummary } from '../types.js';
import { SEVERITY_ORDER } from '../types.js';

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '#b3001b',
  high: '#d7263d',
  medium: '#e8871e',
  low: '#2d7dd2',
  info: '#7a7a7a',
};

/**
 * Self-contained HTML report (inline CSS, no external assets) for sharing a scan
 * outside the terminal. Everything is escaped; nothing from the target is
 * rendered as live markup.
 */
export function htmlReporter(report: ScanReport, summary: SeveritySummary): string {
  const sorted = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  const rows = (['critical', 'high', 'medium', 'low', 'info'] as Severity[])
    .filter((s) => summary[s] > 0)
    .map(
      (s) =>
        `<tr><td><span class="badge" style="background:${SEVERITY_COLOR[s]}">${s}</span></td><td>${summary[s]}</td></tr>`,
    )
    .join('');

  const status = report.ok
    ? `<p class="status ok">✓ No new findings at or above <code>${report.config.failOn}</code>.</p>`
    : `<p class="status fail">✗ ${report.blockingCount()} new finding(s) at or above <code>${report.config.failOn}</code>.</p>`;

  const findingsHtml = sorted.map((f) => renderFinding(report, f)).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pentry security report — ${esc(report.config.target)}</title>
<style>
  :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  body { margin: 0; background: #f6f7f9; color: #1c2024; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px; }
  h1 { font-size: 1.4rem; }
  code { background: #eceef0; padding: 1px 5px; border-radius: 4px; font-size: .9em; }
  table { border-collapse: collapse; margin: 12px 0; }
  td { padding: 4px 14px 4px 0; }
  .badge { color: #fff; padding: 2px 8px; border-radius: 999px; font-size: .78rem; text-transform: uppercase; }
  .status { font-weight: 600; }
  .status.ok { color: #1a7f37; }
  .status.fail { color: #d7263d; }
  .finding { background: #fff; border: 1px solid #e3e6e8; border-left-width: 5px; border-radius: 8px; padding: 14px 16px; margin: 12px 0; }
  .finding h3 { margin: 0 0 6px; font-size: 1rem; }
  .finding .meta { color: #6b7280; font-size: .82rem; margin-bottom: 8px; }
  .finding .fix { margin-top: 8px; }
  .baselined { opacity: .6; }
  pre { background: #0d1117; color: #c9d1d9; padding: 10px 12px; border-radius: 6px; overflow-x: auto; font-size: .82rem; }
  a { color: #2d7dd2; }
</style>
</head>
<body>
<div class="wrap">
<h1>Pentry security report</h1>
<p><strong>Target:</strong> <code>${esc(report.config.target)}</code></p>
<table>${rows}</table>
${status}
${findingsHtml}
</div>
</body>
</html>
`;
}

function renderFinding(report: ScanReport, f: Finding): string {
  const baselined = report.isBaselined(f);
  const evidence = f.evidence
    ? `<pre>${esc(`${f.evidence.request.method} ${f.evidence.request.url}\n→ ${f.evidence.response.status}`)}</pre>`
    : '';
  const refs = f.references.length
    ? `<p>${f.references.map((r) => `<a href="${esc(r)}">${esc(r)}</a>`).join('<br>')}</p>`
    : '';
  return `<div class="finding${baselined ? ' baselined' : ''}" style="border-left-color:${SEVERITY_COLOR[f.severity]}">
  <h3><span class="badge" style="background:${SEVERITY_COLOR[f.severity]}">${f.severity}</span> ${esc(f.title)}${baselined ? ' <em>(baselined)</em>' : ''}</h3>
  <div class="meta">${esc(f.checkId)} · ${esc(f.target)}</div>
  <div>${esc(f.description)}</div>
  <div class="fix"><strong>Fix:</strong> ${esc(f.remediation)}</div>
  ${evidence}
  ${refs}
</div>`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
