import type { Check, CheckContext, Finding } from '../types.js';

const PROBE_ORIGIN = 'https://pentry-cors-probe.example';

/**
 * Detects dangerous CORS configurations by sending a crafted Origin header and
 * observing how the server reflects it. The high-severity case — reflecting an
 * arbitrary origin *with credentials* — lets any website read authenticated
 * responses on behalf of a logged-in user.
 */
export const corsCheck: Check = {
  id: 'cors',
  title: 'CORS misconfiguration',
  description: 'Probes Access-Control-Allow-Origin / -Credentials for unsafe reflection.',
  severity: 'high',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const route of ctx.routes) {
      const res = await ctx.http.request({
        method: 'GET',
        path: route.path,
        headers: { origin: PROBE_ORIGIN },
      });

      const acao = res.headers['access-control-allow-origin'];
      const acac = res.headers['access-control-allow-credentials'];
      if (!acao) continue;

      const reflectsArbitrary = acao === PROBE_ORIGIN;
      const wildcard = acao === '*';
      const withCredentials = acac?.toLowerCase() === 'true';

      if (reflectsArbitrary && withCredentials) {
        findings.push(
          ctx.finding({
            key: `${route.path}:reflected-credentialed`,
            title: 'CORS reflects arbitrary origin with credentials',
            severity: 'critical',
            description:
              `The server reflected an attacker-controlled Origin (${PROBE_ORIGIN}) in ` +
              'Access-Control-Allow-Origin while also setting Access-Control-Allow-Credentials: true. ' +
              'Any website can read authenticated responses from this endpoint on behalf of a ' +
              'logged-in victim, fully bypassing the same-origin policy.',
            remediation:
              'Never reflect the Origin header when credentials are allowed. Validate the Origin ' +
              'against a strict allowlist and echo only known-good origins.',
            references: [
              'https://portswigger.net/web-security/cors',
              'https://developer.mozilla.org/docs/Web/HTTP/CORS',
            ],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      } else if (reflectsArbitrary) {
        findings.push(
          ctx.finding({
            key: `${route.path}:reflected`,
            title: 'CORS reflects arbitrary origin',
            severity: 'medium',
            description:
              `The server reflected an attacker-controlled Origin (${PROBE_ORIGIN}). While ` +
              'credentials are not allowed, this still exposes any non-credentialed data to ' +
              'cross-origin readers and often indicates an over-permissive CORS policy.',
            remediation: 'Validate Origin against an allowlist instead of reflecting it.',
            references: ['https://portswigger.net/web-security/cors'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      } else if (wildcard && withCredentials) {
        // Browsers reject "*" with credentials, but it signals a misunderstanding worth flagging.
        findings.push(
          ctx.finding({
            key: `${route.path}:wildcard-credentialed`,
            title: 'CORS wildcard combined with credentials',
            severity: 'low',
            description:
              'Access-Control-Allow-Origin is "*" while Access-Control-Allow-Credentials is true. ' +
              'Browsers will reject this combination, but it indicates a misconfigured CORS policy ' +
              'that may be "fixed" insecurely by reflecting the Origin instead.',
            remediation:
              'Decide whether the endpoint truly needs credentials. If so, use a strict origin ' +
              'allowlist; if not, drop the credentials flag.',
            references: ['https://developer.mozilla.org/docs/Web/HTTP/CORS'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
