import type { Check, CheckContext, Finding } from '../types.js';

/**
 * Flags cross-origin `<script>` and stylesheet `<link>` tags that lack a
 * Subresource Integrity (`integrity`) attribute. Without SRI, a compromised CDN
 * can serve malicious code that your page will execute. Same-origin resources
 * are ignored — SRI is about third-party origins.
 */
export const subresourceIntegrityCheck: Check = {
  id: 'subresource-integrity',
  title: 'Subresource Integrity',
  description: 'Detects cross-origin scripts/styles loaded without an integrity hash.',
  severity: 'low',
  passive: true,
  async run(ctx: CheckContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const res = await ctx.http.get('/');
    const contentType = res.headers['content-type'] ?? '';
    if (!contentType.includes('html')) return findings;

    const origin = ctx.baseUrl.origin;
    const offending = findUnprotected(res.body, origin);

    for (const url of offending) {
      findings.push(
        ctx.finding({
          key: url,
          title: 'Cross-origin resource loaded without Subresource Integrity',
          severity: 'low',
          description:
            `The page loads "${url}" from a third-party origin without an integrity hash. If that ` +
            'origin is compromised, it can serve arbitrary code/styles that the page trusts.',
          remediation:
            'Add an `integrity` (and `crossorigin`) attribute to cross-origin <script>/<link> tags, ' +
            'or self-host the resource.',
          references: ['https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity'],
          target: res.evidence.request.url,
          evidence: res.evidence,
        }),
      );
    }

    return findings;
  },
};

/** Return cross-origin script/link URLs that have no `integrity` attribute. */
function findUnprotected(html: string, origin: string): string[] {
  const tags = html.match(/<(?:script|link)\b[^>]*>/gi) ?? [];
  const out: string[] = [];
  for (const tag of tags) {
    if (/\bintegrity\s*=/i.test(tag)) continue;
    // Stylesheet links only (ignore <link rel="icon">, preconnect, etc.).
    if (/^<link/i.test(tag) && !/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const srcMatch = tag.match(/(?:src|href)\s*=\s*["']([^"']+)["']/i);
    const url = srcMatch?.[1];
    if (!url || !/^https?:\/\//i.test(url)) continue; // only absolute, cross-origin
    if (url.startsWith(origin)) continue; // same origin → SRI not required
    out.push(url);
  }
  return [...new Set(out)].slice(0, 10);
}
