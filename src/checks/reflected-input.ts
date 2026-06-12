import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Reflected-input / potential XSS check.
 *
 * Pentry sends a unique, benign marker containing HTML-significant characters
 * (`<`, `>`, `"`) in a query parameter, then inspects HTML responses. If the
 * marker comes back **unencoded** inside an HTML body, the endpoint reflects
 * user input without output encoding — the precondition for reflected XSS.
 *
 * The payload never executes script; it only detects whether dangerous
 * characters survive intact. That keeps the probe safe to run against your own
 * app while still catching the real vulnerability class.
 */
const MARKER = 'pentryXSS9z3';
const PAYLOAD = `${MARKER}<svg/onload>"`;
const ENCODED_FORMS = [`${MARKER}&lt;`, `${MARKER}%3C`, `${MARKER}\\u003c`];

export const reflectedInputCheck: Check = {
  id: 'reflected-input',
  title: 'Reflected input (potential XSS)',
  description: 'Injects a benign marker and detects unencoded reflection in HTML responses.',
  severity: 'high',
  passive: false,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const route of ctx.routes) {
      const url = new URL(ctx.http.resolve(route.path));
      url.searchParams.set('q', PAYLOAD);

      const res = await ctx.http.request({ method: 'GET', path: url.toString() });
      const contentType = res.headers['content-type'] ?? '';
      if (!contentType.includes('html')) continue;

      const reflectedRaw = res.body.includes(PAYLOAD) || res.body.includes(`${MARKER}<svg`);
      const onlyEncoded = ENCODED_FORMS.some((form) => res.body.includes(form));

      if (reflectedRaw && !onlyEncoded) {
        findings.push(
          ctx.finding({
            key: route.path,
            title: `Reflected input without output encoding: ${route.path}`,
            severity: 'high',
            description:
              `A marker containing HTML metacharacters was reflected unencoded into the HTML ` +
              `response from ${route.path}. Reflecting attacker-controlled input verbatim into ` +
              'HTML is the precondition for reflected cross-site scripting (XSS).',
            remediation:
              'Context-aware output encoding for all user input rendered into HTML. Prefer ' +
              'auto-escaping templates and a strict Content-Security-Policy as defense in depth.',
            references: [
              'https://owasp.org/www-community/attacks/xss/',
              'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
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
