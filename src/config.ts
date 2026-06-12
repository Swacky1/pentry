import type { IgnoreRule, PentryConfig, ResolvedConfig, RouteSpec, Severity } from './types.js';

/** Identity helper for config files: `export default defineConfig({ ... })`. */
export function defineConfig(config: PentryConfig): PentryConfig {
  return config;
}

const DEFAULTS = {
  failOn: 'medium' as Severity,
  allowExternal: false,
  timeout: 10_000,
  concurrency: 6,
  maxBodyCapture: 64 * 1024,
};

/**
 * Thrown when a scan would target a host the user hasn't authorized. Pentry is
 * a tool you point at your *own* app; attacking third-party hosts without
 * permission is both unethical and, in most places, illegal. The default-deny
 * gate makes "only test what you own" the path of least resistance.
 */
export class UnauthorizedTargetError extends Error {
  constructor(host: string) {
    super(
      `Refusing to scan non-local target "${host}". Pentry only scans loopback/private ` +
        `addresses by default. If you own this target and are authorized to test it, ` +
        `set { allowExternal: true } (or pass --allow-external).`,
    );
    this.name = 'UnauthorizedTargetError';
  }
}

/** Apply defaults and normalize user config into a {@link ResolvedConfig}. */
export function resolveConfig(config: PentryConfig): ResolvedConfig {
  if (!config.target) {
    throw new Error('Pentry: `target` is required (e.g. "http://localhost:3000").');
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(config.target);
  } catch {
    throw new Error(`Pentry: invalid target URL "${config.target}".`);
  }

  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
    throw new Error(`Pentry: target must be http(s), got "${baseUrl.protocol}".`);
  }

  const allowExternal = config.allowExternal ?? DEFAULTS.allowExternal;
  if (!allowExternal && !isLocalHost(baseUrl.hostname)) {
    throw new UnauthorizedTargetError(baseUrl.hostname);
  }

  const routes = normalizeRoutes(config.routes);

  return {
    target: config.target,
    baseUrl,
    routes,
    checks: config.checks ?? [],
    exclude: config.exclude ?? [],
    ignore: normalizeIgnore(config.ignore),
    overrides: config.overrides ?? {},
    baseline: config.baseline,
    failOn: config.failOn ?? DEFAULTS.failOn,
    allowExternal,
    timeout: config.timeout ?? DEFAULTS.timeout,
    concurrency: Math.max(1, config.concurrency ?? DEFAULTS.concurrency),
    auth: config.auth,
    maxBodyCapture: config.maxBodyCapture ?? DEFAULTS.maxBodyCapture,
  };
}

/**
 * Normalize ignore entries. A bare string is treated as matching either a
 * fingerprint or a check ID (preserving the original simple behavior); object
 * rules are passed through.
 */
function normalizeIgnore(ignore: Array<string | IgnoreRule> = []): IgnoreRule[] {
  return ignore.map((entry) =>
    typeof entry === 'string' ? { fingerprint: entry, check: entry } : entry,
  );
}

function normalizeRoutes(routes: Array<string | RouteSpec> = []): Required<RouteSpec>[] {
  const specs = routes.map((route) => (typeof route === 'string' ? { path: route } : route));
  // Always include the base path so passive header checks have something to hit.
  if (!specs.some((r) => r.path === '/')) specs.unshift({ path: '/' });

  const seen = new Set<string>();
  const out: Required<RouteSpec>[] = [];
  for (const spec of specs) {
    const method = (spec.method ?? 'GET').toUpperCase();
    const path = spec.path.startsWith('/') ? spec.path : `/${spec.path}`;
    const key = `${method} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path, method, protected: spec.protected ?? false });
  }
  return out;
}

/**
 * Returns true for loopback and RFC1918 private addresses, plus `localhost` and
 * the `*.localhost` / `*.local` / `*.test` development TLDs.
 */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.test')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;

  // IPv4 ranges
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 169 && b === 254) return true; // link-local
  }

  // IPv6 unique-local / link-local
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;

  return false;
}
