import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Flags response headers that leak implementation details (server software and
 * versions, framework fingerprints). On their own these are low severity, but
 * they hand attackers a precise version to match against known CVEs.
 */
export const infoDisclosureCheck: Check = {
  id: 'info-disclosure',
  title: 'Information disclosure',
  description: 'Detects server/framework version banners and fingerprinting headers.',
  severity: 'low',
  passive: true,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const res = await ctx.http.get('/');

    const server = res.headers['server'];
    if (server && /\d/.test(server)) {
      findings.push(
        ctx.finding({
          key: 'server-version',
          title: 'Server header leaks software version',
          severity: 'low',
          description:
            `The Server header advertises "${server}". Exposing exact versions lets attackers ` +
            'look up known vulnerabilities for your stack without any probing.',
          remediation: 'Remove or genericize the Server header at your app or reverse proxy.',
          references: ['https://owasp.org/www-project-secure-headers/#server'],
          target: res.evidence.request.url,
          evidence: res.evidence,
        }),
      );
    }

    const fingerprintHeaders = ['x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version'];
    for (const header of fingerprintHeaders) {
      const value = res.headers[header];
      if (value) {
        findings.push(
          ctx.finding({
            key: header,
            title: `Framework fingerprint via ${header}`,
            severity: 'info',
            description:
              `The "${header}: ${value}" header reveals the framework powering this app, aiding ` +
              'targeted attacks.',
            remediation: `Disable the ${header} header (e.g. app.disable('x-powered-by') in Express).`,
            references: ['https://owasp.org/www-project-secure-headers/#x-powered-by'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
