import type { Finding, ResolvedConfig, Severity } from '../types.js';

/**
 * SARIF 2.1.0 output. GitHub's code-scanning feature ingests SARIF, so this
 * lets Pentry findings show up directly in the Security tab and as PR
 * annotations when uploaded via `github/codeql-action/upload-sarif`.
 */
export function sarifReporter(findings: Finding[], config: ResolvedConfig): string {
  const rulesById = new Map<string, ReturnType<typeof toRule>>();
  for (const f of findings) {
    if (!rulesById.has(f.checkId)) rulesById.set(f.checkId, toRule(f));
  }

  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Pentry',
            informationUri: 'https://www.npmjs.com/package/@red_official/pentry',
            rules: [...rulesById.values()],
          },
        },
        results: findings.map((f) => toResult(f, config)),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function toRule(f: Finding) {
  return {
    id: f.checkId,
    name: f.checkId,
    shortDescription: { text: f.title },
    helpUri: f.references[0] ?? 'https://www.npmjs.com/package/@red_official/pentry',
    defaultConfiguration: { level: sarifLevel(f.severity) },
  };
}

function toResult(f: Finding, config: ResolvedConfig) {
  return {
    ruleId: f.checkId,
    level: sarifLevel(f.severity),
    message: { text: `${f.title}. ${f.description} Fix: ${f.remediation}` },
    partialFingerprints: { pentryFingerprint: f.fingerprint },
    properties: { severity: f.severity, target: f.target },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.target || config.target },
        },
      },
    ],
  };
}

/** SARIF only has error/warning/note/none, so collapse our five severities. */
function sarifLevel(severity: Severity): 'error' | 'warning' | 'note' {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium' || severity === 'low') return 'warning';
  return 'note';
}
