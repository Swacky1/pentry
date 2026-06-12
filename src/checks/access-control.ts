import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Broken access control check.
 *
 * For every route the user marked as `protected: true`, Pentry sends a request
 * *without* credentials. If the endpoint answers with success instead of
 * 401/403, it is serving protected data to anonymous callers — the #1 item on
 * the OWASP Top 10.
 *
 * This only runs when protected routes are declared, which keeps it free of
 * false positives: the user is asserting "this should require auth", and Pentry
 * verifies that assertion.
 */
export const accessControlCheck: Check = {
  id: 'access-control',
  title: 'Broken access control',
  description: 'Requests routes marked `protected` without auth and flags unauthorized success.',
  severity: 'high',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const protectedRoutes = ctx.routes.filter((r) => r.protected);

    for (const route of protectedRoutes) {
      const res = await ctx.http.request({
        method: route.method,
        path: route.path,
        includeAuth: false,
      });

      const denied = res.status === 401 || res.status === 403;
      const redirectedToAuth = res.status >= 300 && res.status < 400;

      if (!denied && !redirectedToAuth && res.status < 500) {
        findings.push(
          ctx.finding({
            key: `${route.method} ${route.path}`,
            title: `Protected route reachable without authentication: ${route.path}`,
            severity: 'high',
            description:
              `${route.method} ${route.path} is declared as protected, but an unauthenticated ` +
              `request returned ${res.status} instead of 401/403. This endpoint exposes data or ` +
              'actions to anonymous users (broken access control).',
            remediation:
              'Enforce authentication/authorization on this route server-side before returning ' +
              'any data. Do not rely on the client hiding the route.',
            references: [
              'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
              'https://cwe.mitre.org/data/definitions/284.html',
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
