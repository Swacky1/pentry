import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Detects GraphQL endpoints with introspection enabled in what is presumably a
 * production deployment. Introspection hands an attacker the full schema (every
 * type, query, and mutation), dramatically easing attack discovery. Pentry
 * sends a minimal, read-only introspection query to common endpoints (plus any
 * configured route containing "graphql") and only flags a genuine schema reply.
 */
const CANDIDATE_PATHS = ['/graphql', '/api/graphql', '/v1/graphql'];
const INTROSPECTION_QUERY = JSON.stringify({ query: '{__schema{queryType{name}}}' });

export const graphqlIntrospectionCheck: Check = {
  id: 'graphql-introspection',
  title: 'GraphQL introspection',
  description: 'Detects GraphQL endpoints exposing their schema via introspection.',
  severity: 'medium',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    const routePaths = ctx.routes.map((r) => r.path).filter((p) => /graphql/i.test(p));
    const paths = [...new Set([...CANDIDATE_PATHS, ...routePaths])];

    for (const path of paths) {
      let res;
      try {
        res = await ctx.http.request({
          method: 'POST',
          path,
          headers: { 'content-type': 'application/json' },
          body: INTROSPECTION_QUERY,
        });
      } catch {
        continue;
      }

      // A real, introspectable GraphQL endpoint echoes the schema query type.
      const looksLikeSchema =
        /__schema/.test(res.body) && /queryType/.test(res.body) && /"name"/.test(res.body);
      if (res.status === 200 && looksLikeSchema) {
        findings.push(
          ctx.finding({
            key: path,
            title: `GraphQL introspection enabled: ${path}`,
            severity: 'medium',
            description:
              `The GraphQL endpoint at ${path} answered an introspection query with its schema. ` +
              'Exposing the full schema in production gives attackers a complete map of your API.',
            remediation:
              'Disable introspection in production (e.g. Apollo `introspection: false`) or gate it ' +
              'behind authentication.',
            references: [
              'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/01-Testing_GraphQL',
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
