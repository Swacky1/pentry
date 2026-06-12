import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Checks for risky HTTP methods. The headline issue is TRACE being enabled,
 * which enables Cross-Site Tracing (XST) — a way to read otherwise-protected
 * headers/cookies. This is an active check: it sends a single TRACE request.
 */
export const httpMethodsCheck: Check = {
  id: 'http-methods',
  title: 'Dangerous HTTP methods',
  description: 'Detects enabled TRACE/TRACK methods that enable Cross-Site Tracing.',
  severity: 'medium',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const method of ['TRACE', 'TRACK']) {
      let res;
      try {
        res = await ctx.http.request({ method, path: '/' });
      } catch {
        continue; // method not supported by client/runtime — nothing to report
      }

      // A 2xx response that echoes the request body/headers indicates TRACE is live.
      if (res.status >= 200 && res.status < 300) {
        findings.push(
          ctx.finding({
            key: method,
            title: `HTTP ${method} method enabled (Cross-Site Tracing)`,
            severity: 'medium',
            description:
              `The server responded ${res.status} to an HTTP ${method} request. TRACE/TRACK echo ` +
              'the request back to the client and can be abused (Cross-Site Tracing) to steal ' +
              'headers and cookies that are otherwise inaccessible to scripts.',
            remediation: `Disable the ${method} method at your web server or reverse proxy.`,
            references: ['https://owasp.org/www-community/attacks/Cross_Site_Tracing'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
