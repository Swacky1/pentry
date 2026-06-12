import type { RouteSpec } from '../types.js';

interface OpenApiDoc {
  openapi?: string;
  swagger?: string;
  paths?: Record<string, Record<string, unknown> | undefined>;
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Derive routes from an OpenAPI / Swagger document. Path templates like
 * `/users/{id}` are turned into concrete URLs (`/users/1`) so they can actually
 * be requested. Framework-agnostic — works with any spec you can `import` or
 * fetch.
 *
 * ```ts
 * import spec from './openapi.json' assert { type: 'json' };
 * const routes = discoverOpenApiRoutes(spec);
 * await scan({ target: 'http://localhost:3000', routes });
 * ```
 */
export function discoverOpenApiRoutes(spec: OpenApiDoc): RouteSpec[] {
  const paths = spec?.paths ?? {};
  const out: RouteSpec[] = [];

  for (const [rawPath, item] of Object.entries(paths)) {
    if (!item || typeof item !== 'object') continue;
    const path = concretize(rawPath);
    for (const method of METHODS) {
      if (method in item) out.push({ path, method: method.toUpperCase() });
    }
  }
  return out;
}

/** Replace `{param}` and `:param` templates with a sample value. */
function concretize(path: string): string {
  const replaced = path.replace(/\{[^}]+\}/g, '1').replace(/:[^/]+/g, '1');
  return replaced.startsWith('/') ? replaced : `/${replaced}`;
}
