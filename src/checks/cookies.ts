import type { Check, CheckContext, Finding, Severity } from '../types.js';

interface CookieFlagRule {
  test: (attrs: string) => boolean;
  title: string;
  severity: Severity;
  description: string;
  remediation: string;
  /** Only relevant over HTTPS (e.g. the Secure flag). */
  httpsOnly?: boolean;
}

const RULES: CookieFlagRule[] = [
  {
    test: (a) => !/;\s*httponly/i.test(a),
    title: 'Cookie missing HttpOnly flag',
    severity: 'medium',
    description:
      'A cookie was set without the HttpOnly flag, so it is readable from JavaScript. If the ' +
      'cookie holds a session or auth token, any XSS becomes a full account takeover.',
    remediation: 'Add the HttpOnly attribute to session/auth cookies.',
  },
  {
    test: (a) => !/;\s*secure/i.test(a),
    title: 'Cookie missing Secure flag',
    severity: 'medium',
    httpsOnly: true,
    description:
      'A cookie was set over HTTPS without the Secure flag, so the browser will also send it ' +
      'over plain HTTP, where it can be intercepted.',
    remediation: 'Add the Secure attribute so the cookie is only sent over HTTPS.',
  },
  {
    test: (a) => !/;\s*samesite/i.test(a),
    title: 'Cookie missing SameSite attribute',
    severity: 'low',
    description:
      'A cookie was set without an explicit SameSite attribute. Relying on browser defaults ' +
      'leaves CSRF protection inconsistent across clients.',
    remediation: 'Set SameSite=Lax (or Strict) explicitly on cookies.',
  },
];

const REFERENCES = [
  'https://owasp.org/www-community/controls/SecureCookieAttribute',
  'https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie',
];

export const cookiesCheck: Check = {
  id: 'cookies',
  title: 'Cookie security flags',
  description: 'Checks Set-Cookie responses for HttpOnly, Secure, and SameSite attributes.',
  severity: 'medium',
  passive: true,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const isHttps = ctx.baseUrl.protocol === 'https:';
    const res = await ctx.http.get('/');

    for (const cookie of res.setCookies) {
      const name = cookie.split('=', 1)[0]?.trim() ?? 'cookie';
      for (const rule of RULES) {
        if (rule.httpsOnly && !isHttps) continue;
        if (rule.test(cookie)) {
          findings.push(
            ctx.finding({
              key: `${name}:${rule.title}`,
              title: `${rule.title} (${name})`,
              severity: rule.severity,
              description: rule.description,
              remediation: rule.remediation,
              references: REFERENCES,
              target: res.evidence.request.url,
              evidence: res.evidence,
            }),
          );
        }
      }
    }

    return findings;
  },
};
