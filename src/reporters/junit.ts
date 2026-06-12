import type { Check, Finding, ResolvedConfig } from '../types.js';

/**
 * JUnit XML output. Most CI systems (GitLab, Jenkins, CircleCI, Azure DevOps)
 * render JUnit reports natively, so this surfaces each check as a "test" and
 * each finding as a failure in the CI test UI.
 */
export function junitReporter(
  findings: Finding[],
  config: ResolvedConfig,
  checks: Check[],
): string {
  const byCheck = new Map<string, Finding[]>();
  for (const check of checks) byCheck.set(check.id, []);
  for (const f of findings) {
    const list = byCheck.get(f.checkId) ?? [];
    list.push(f);
    byCheck.set(f.checkId, list);
  }

  const cases: string[] = [];
  for (const [checkId, checkFindings] of byCheck) {
    if (checkFindings.length === 0) {
      cases.push(`    <testcase classname="pentry" name="${esc(checkId)}" />`);
      continue;
    }
    for (const f of checkFindings) {
      const detail = `${f.description}\nFix: ${f.remediation}\nTarget: ${f.target}`;
      cases.push(
        `    <testcase classname="pentry.${esc(checkId)}" name="${esc(f.title)}">\n` +
          `      <failure type="${esc(f.severity)}" message="${esc(f.title)}">${esc(detail)}</failure>\n` +
          `    </testcase>`,
      );
    }
  }

  const failures = findings.length;
  const tests = cases.length;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites name="pentry" tests="${tests}" failures="${failures}">\n` +
    `  <testsuite name="${esc(config.target)}" tests="${tests}" failures="${failures}">\n` +
    `${cases.join('\n')}\n` +
    `  </testsuite>\n` +
    `</testsuites>\n`
  );
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
