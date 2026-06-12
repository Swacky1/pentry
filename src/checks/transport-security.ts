import { isLocalHost } from '../config.js';
import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Transport-layer checks:
 *  - mixed content: an HTTPS page referencing `http://` subresources, which
 *    browsers may block or which weakens the page's security guarantees;
 *  - no HTTP→HTTPS redirect for a plain-HTTP origin (skipped for localhost,
 *    where serving HTTP is normal and a redirect would be noise).
 */
export const transportSecurityCheck: Check = {
  id: 'transport-security',
  title: 'Transport security',
  description: 'Detects mixed content and missing HTTP→HTTPS redirects.',
  severity: 'medium',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const isHttps = ctx.baseUrl.protocol === 'https:';

    const res = await ctx.http.get('/');

    if (isHttps) {
      const contentType = res.headers['content-type'] ?? '';
      if (contentType.includes('html')) {
        const insecure = findInsecureRefs(res.body);
        if (insecure.length > 0) {
          findings.push(
            ctx.finding({
              key: 'mixed-content',
              title: 'Mixed content: HTTPS page loads http:// resources',
              severity: 'medium',
              description:
                `The HTTPS page references ${insecure.length} resource(s) over plain HTTP ` +
                `(e.g. ${insecure[0]}). These can be blocked or tampered with, undermining the ` +
                'security of the whole page.',
              remediation:
                'Serve all subresources over HTTPS, and add "upgrade-insecure-requests" to your CSP.',
              references: ['https://developer.mozilla.org/docs/Web/Security/Mixed_content'],
              target: res.evidence.request.url,
              evidence: res.evidence,
            }),
          );
        }
      }
    } else if (!isLocalHost(ctx.baseUrl.hostname)) {
      // Plain HTTP on a non-local host: it should redirect to HTTPS.
      const redirectsToHttps =
        res.status >= 300 &&
        res.status < 400 &&
        (res.headers['location'] ?? '').startsWith('https:');
      if (!redirectsToHttps) {
        findings.push(
          ctx.finding({
            key: 'no-https-redirect',
            title: 'No HTTP→HTTPS redirect',
            severity: 'medium',
            description:
              'The plain-HTTP origin did not redirect to HTTPS. Traffic (including cookies and ' +
              'credentials) can be intercepted on the network.',
            remediation:
              'Redirect all HTTP requests to HTTPS (301) and serve HSTS on the HTTPS responses.',
            references: [
              'https://owasp.org/www-project-secure-headers/#http-strict-transport-security',
            ],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};

/** Find http:// references in src/href attributes of an HTML body. */
function findInsecureRefs(html: string): string[] {
  const matches = html.match(/(?:src|href)\s*=\s*["']http:\/\/[^"']+["']/gi) ?? [];
  return matches.slice(0, 5).map((m) => m.replace(/^(?:src|href)\s*=\s*["']|["']$/gi, ''));
}
