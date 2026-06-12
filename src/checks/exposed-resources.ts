import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Detects two classes of accidental exposure:
 *  - directory listing (auto-index) enabled, revealing file structure;
 *  - a small, high-signal set of sensitive files served directly
 *    (`/.env`, `/.git/config`).
 *
 * Each finding is content-verified (not just a 200) so this stays
 * false-positive-free — a generic 200 or SPA catch-all won't trip it.
 */
const SENSITIVE_FILES: Array<{ path: string; signature: RegExp; what: string }> = [
  { path: '/.env', signature: /^[A-Z0-9_]+=.+/m, what: 'environment file (.env)' },
  { path: '/.git/config', signature: /\[core\]/, what: 'Git repository config (.git/config)' },
];

const LISTING_SIGNATURE = /<title>\s*Index of \/|Directory listing for \//i;

export const exposedResourcesCheck: Check = {
  id: 'exposed-resources',
  title: 'Exposed resources',
  description: 'Detects directory listing and sensitive files (.env, .git) served directly.',
  severity: 'high',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Directory listing on the base path.
    const root = await ctx.http.get('/');
    if (LISTING_SIGNATURE.test(root.body)) {
      findings.push(
        ctx.finding({
          key: 'directory-listing',
          title: 'Directory listing enabled',
          severity: 'medium',
          description:
            'The server returned an auto-generated directory index, revealing the file structure ' +
            'and potentially sensitive files that were not meant to be browsable.',
          remediation:
            'Disable auto-indexing (e.g. `autoindex off;` in nginx, `Options -Indexes`).',
          references: ['https://owasp.org/www-community/Improper_Access_Control'],
          target: root.evidence.request.url,
          evidence: root.evidence,
        }),
      );
    }

    // Sensitive files.
    for (const file of SENSITIVE_FILES) {
      const res = await ctx.http.get(file.path);
      if (res.status === 200 && file.signature.test(res.body)) {
        findings.push(
          ctx.finding({
            key: file.path,
            title: `Sensitive file exposed: ${file.path}`,
            severity: 'high',
            description:
              `The ${file.what} is served directly and contains recognizable secrets/config. ` +
              'This frequently leaks credentials, API keys, or source-control metadata.',
            remediation:
              'Block access to dotfiles and VCS directories at the web server, and never deploy ' +
              'them to the web root.',
            references: ['https://cwe.mitre.org/data/definitions/538.html'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
