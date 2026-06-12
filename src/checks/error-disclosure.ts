import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Detects verbose error pages that leak stack traces / internals. Pentry pokes
 * each route with input that commonly trips unhandled errors (a non-existent
 * sub-path and a malformed query value) and looks for high-signal stack-trace
 * markers across common stacks. To stay false-positive-free it only fires on
 * those distinctive multi-token signatures, never on the word "error" alone.
 */
const SIGNATURES: Array<{ stack: string; pattern: RegExp }> = [
  { stack: 'Node.js', pattern: /\bat\s+[\w.<>]+\s+\(.*:\d+:\d+\)/ },
  { stack: 'Node.js', pattern: /\/node_modules\/.*:\d+:\d+/ },
  { stack: 'Python', pattern: /Traceback \(most recent call last\):/ },
  { stack: 'Java', pattern: /\bat\s+[\w.$]+\([\w.]+\.java:\d+\)/ },
  { stack: 'PHP', pattern: /Fatal error:.*on line \d+|Stack trace:\s*#0/ },
  { stack: 'Ruby', pattern: /\b(?:app\/controllers|gems)\/.*\.rb:\d+:in / },
  { stack: '.NET', pattern: /\bat System\.[\w.]+\(.*\) in .*:line \d+/ },
];

export const errorDisclosureCheck: Check = {
  id: 'error-disclosure',
  title: 'Verbose error disclosure',
  description: 'Detects stack traces / framework internals leaked in error responses.',
  severity: 'medium',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const seen = new Set<string>();

    for (const route of ctx.routes) {
      const base = route.path.replace(/\/$/, '');
      const probes = [
        `${base}/pentry-nonexistent-${'a'.repeat(3)}`,
        `${route.path}${route.path.includes('?') ? '&' : '?'}pentry=%27%22%5B%5D`,
      ];

      for (const probe of probes) {
        const res = await ctx.http.request({ method: 'GET', path: probe });
        const hit = SIGNATURES.find((s) => s.pattern.test(res.body));
        if (!hit) continue;

        const key = route.path;
        if (seen.has(key)) continue;
        seen.add(key);

        findings.push(
          ctx.finding({
            key,
            title: `Stack trace disclosed in error response (${route.path})`,
            severity: 'medium',
            description:
              `An error response from ${route.path} exposed a ${hit.stack} stack trace / internal ` +
              'paths. This leaks framework versions, file layout, and logic that aid an attacker.',
            remediation:
              'Return generic error pages in production. Disable debug/verbose error output and ' +
              'log details server-side instead.',
            references: [
              'https://owasp.org/www-community/Improper_Error_Handling',
              'https://cwe.mitre.org/data/definitions/209.html',
            ],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
        break;
      }
    }

    return findings;
  },
};
