import type { Check, CheckContext, Finding, Severity } from '../types.js';

interface HeaderRule {
  header: string;
  title: string;
  severity: Severity;
  description: string;
  remediation: string;
  references: string[];
  /** Only evaluate over HTTPS (e.g. HSTS is meaningless on plain HTTP). */
  httpsOnly?: boolean;
  /** If present, the header value must match this to be considered correct. */
  expect?: RegExp;
  /** A header that, if present, satisfies this rule instead. */
  satisfiedBy?: string;
}

const RULES: HeaderRule[] = [
  {
    header: 'content-security-policy',
    title: 'Missing Content-Security-Policy header',
    severity: 'medium',
    description:
      'No Content-Security-Policy was set. A CSP is the most effective defense-in-depth ' +
      'control against cross-site scripting and data injection attacks.',
    remediation:
      'Set a Content-Security-Policy header. Start strict (e.g. "default-src \'self\'") and ' +
      'loosen only as needed.',
    references: [
      'https://owasp.org/www-community/controls/Content_Security_Policy',
      'https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy',
    ],
  },
  {
    header: 'strict-transport-security',
    title: 'Missing HTTP Strict-Transport-Security (HSTS) header',
    severity: 'medium',
    httpsOnly: true,
    description:
      'HSTS was not set over HTTPS. Without it, clients can be downgraded to HTTP and are ' +
      'exposed to man-in-the-middle attacks on the first request.',
    remediation:
      'Send "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload" on HTTPS responses.',
    references: ['https://owasp.org/www-project-secure-headers/#http-strict-transport-security'],
  },
  {
    header: 'x-content-type-options',
    title: 'Missing or invalid X-Content-Type-Options header',
    severity: 'low',
    expect: /nosniff/i,
    description:
      'Without "X-Content-Type-Options: nosniff", browsers may MIME-sniff responses, which can ' +
      'turn benign uploads into executable content.',
    remediation: 'Set "X-Content-Type-Options: nosniff" on all responses.',
    references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Content-Type-Options'],
  },
  {
    header: 'x-frame-options',
    title: 'No clickjacking protection (X-Frame-Options / frame-ancestors)',
    severity: 'medium',
    satisfiedBy: 'content-security-policy', // frame-ancestors in CSP also counts (checked below)
    description:
      'Neither X-Frame-Options nor a CSP "frame-ancestors" directive was found. The page can be ' +
      'embedded in a malicious frame and used for clickjacking.',
    remediation:
      'Set "X-Frame-Options: DENY" (or SAMEORIGIN) and/or a CSP "frame-ancestors" directive.',
    references: ['https://owasp.org/www-community/attacks/Clickjacking'],
  },
  {
    header: 'referrer-policy',
    title: 'Missing Referrer-Policy header',
    severity: 'low',
    description:
      'No Referrer-Policy was set. Full URLs (which may contain sensitive tokens) can leak to ' +
      'third-party sites via the Referer header.',
    remediation: 'Set "Referrer-Policy: strict-origin-when-cross-origin" or stricter.',
    references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Referrer-Policy'],
  },
  {
    header: 'permissions-policy',
    title: 'Missing Permissions-Policy header',
    severity: 'low',
    description:
      'No Permissions-Policy was set. This header restricts which browser features (camera, ' +
      'geolocation, microphone, …) the page and its iframes may use.',
    remediation:
      "Set a Permissions-Policy that disables features you don't use, e.g. " +
      '"geolocation=(), camera=(), microphone=()".',
    references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Permissions-Policy'],
  },
  {
    header: 'cross-origin-opener-policy',
    title: 'Missing Cross-Origin-Opener-Policy header',
    severity: 'low',
    description:
      'No Cross-Origin-Opener-Policy (COOP) was set. COOP isolates your browsing context from ' +
      'cross-origin windows, mitigating cross-window attacks like XS-Leaks.',
    remediation: 'Set "Cross-Origin-Opener-Policy: same-origin".',
    references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy'],
  },
];

export const securityHeadersCheck: Check = {
  id: 'security-headers',
  title: 'Security headers',
  description: 'Verifies that standard hardening response headers are present and correct.',
  severity: 'medium',
  passive: true,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const res = await ctx.http.get('/');
    const isHttps = ctx.baseUrl.protocol === 'https:';

    for (const rule of RULES) {
      if (rule.httpsOnly && !isHttps) continue;

      const value = res.headers[rule.header];

      // Special case: a CSP with frame-ancestors satisfies clickjacking protection.
      if (rule.header === 'x-frame-options' && !value) {
        const csp = res.headers['content-security-policy'];
        if (csp && /frame-ancestors/i.test(csp)) continue;
      }

      const missing = !value;
      const invalid = !missing && rule.expect ? !rule.expect.test(value) : false;

      if (missing || invalid) {
        findings.push(
          ctx.finding({
            key: rule.header,
            title: rule.title,
            severity: rule.severity,
            description: rule.description,
            remediation: rule.remediation,
            references: rule.references,
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
