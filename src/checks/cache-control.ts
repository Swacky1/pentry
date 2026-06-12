import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Flags responses that look sensitive (JSON payloads, or anything that sets a
 * cookie) but allow caching. Sensitive data lingering in a shared/browser cache
 * can be served to the wrong user. Precision-first: only fires when caching is
 * actually permissive (missing Cache-Control, or an explicit `public`/`max-age`
 * with no `no-store`/`private`).
 */
export const cacheControlCheck: Check = {
  id: 'cache-control',
  title: 'Sensitive response caching',
  description: 'Detects JSON / cookie-setting responses without no-store/private caching.',
  severity: 'low',
  passive: true,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const route of ctx.routes) {
      const res = await ctx.http.request({ method: route.method, path: route.path });
      const contentType = res.headers['content-type'] ?? '';
      const sensitive = contentType.includes('json') || res.setCookies.length > 0;
      if (!sensitive) continue;

      const cc = (res.headers['cache-control'] ?? '').toLowerCase();
      const safe = /no-store|private|no-cache/.test(cc);
      const cacheable = cc === '' || /public|max-age=(?!0)\d/.test(cc);

      if (!safe && cacheable) {
        findings.push(
          ctx.finding({
            key: route.path,
            title: `Sensitive response is cacheable: ${route.path}`,
            severity: 'low',
            description:
              `${route.method} ${route.path} returns sensitive content (${
                res.setCookies.length ? 'sets a cookie' : 'JSON'
              }) with a cache policy of "${cc || '(none)'}". It may be stored by browsers or ` +
              'intermediary caches and served to another user.',
            remediation:
              'Set "Cache-Control: no-store" (or at least "private, no-cache") on responses ' +
              'containing user-specific or sensitive data.',
            references: ['https://developer.mozilla.org/docs/Web/HTTP/Headers/Cache-Control'],
            target: res.evidence.request.url,
            evidence: res.evidence,
          }),
        );
      }
    }

    return findings;
  },
};
