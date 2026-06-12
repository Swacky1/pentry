import type { RouteSpec } from '../types.js';

interface Layer {
  route?: { path?: string | string[]; methods?: Record<string, boolean> };
  name?: string;
  handle?: { stack?: Layer[] };
  regexp?: { source?: string; fast_slash?: boolean };
}

interface ExpressApp {
  _router?: { stack?: Layer[] };
  router?: { stack?: Layer[] };
  stack?: Layer[];
}

/**
 * Discover routes from an Express application instance. Handles directly-defined
 * routes and best-effort recovery of mounted-router prefixes.
 *
 * ```ts
 * import { discoverExpressRoutes } from '@red_official/pentry';
 * const routes = discoverExpressRoutes(app);
 * await scan({ target: `http://localhost:${port}`, routes });
 * ```
 *
 * Mount-prefix recovery relies on Express's internal regexps and is best-effort;
 * if a prefix can't be parsed the sub-routes are still discovered without it.
 */
export function discoverExpressRoutes(app: ExpressApp): RouteSpec[] {
  const stack = app?._router?.stack ?? app?.router?.stack ?? app?.stack;
  if (!Array.isArray(stack)) {
    throw new Error(
      'discoverExpressRoutes: could not find the Express router stack — pass your Express `app`.',
    );
  }
  const out: RouteSpec[] = [];
  walk(stack, '', out);

  const seen = new Set<string>();
  return out.filter((r) => {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function walk(stack: Layer[], prefix: string, out: RouteSpec[]): void {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path ?? ''];
      const methods = Object.keys(layer.route.methods ?? {}).filter((m) => m !== '_all');
      for (const p of paths) {
        const full = normalize(prefix + p);
        for (const method of methods.length ? methods : ['get']) {
          out.push({ path: full, method: method.toUpperCase() });
        }
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      walk(layer.handle.stack, prefix + extractMount(layer), out);
    }
  }
}

/** Recover a mounted router's path prefix from its regexp (best effort). */
function extractMount(layer: Layer): string {
  const re = layer.regexp;
  if (!re || re.fast_slash || !re.source) return '';
  // e.g. "^\\/api\\/?(?=\\/|$)" → "/api"
  const m = re.source.match(/^\^\\\/(.+?)\\\/\?\(\?=/);
  if (!m || !m[1]) return '';
  return `/${m[1].replace(/\\(.)/g, '$1')}`;
}

function normalize(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, '/');
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}
