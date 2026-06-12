import type { RouteSpec } from '../types.js';
import { discoverExpressRoutes } from './express.js';
import { discoverOpenApiRoutes } from './openapi.js';

export { discoverExpressRoutes } from './express.js';
export { discoverOpenApiRoutes } from './openapi.js';

/**
 * Auto-detect the input type and discover routes. Accepts an Express `app` or an
 * OpenAPI/Swagger document. For anything else, call the specific adapter.
 */
export function discoverRoutes(input: unknown): RouteSpec[] {
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if ('paths' in obj && ('openapi' in obj || 'swagger' in obj)) {
      return discoverOpenApiRoutes(obj);
    }
    if ('_router' in obj || 'router' in obj || Array.isArray(obj.stack)) {
      return discoverExpressRoutes(obj);
    }
  }
  throw new Error(
    'discoverRoutes: unrecognized input. Pass an Express app or an OpenAPI document, ' +
      'or call discoverExpressRoutes / discoverOpenApiRoutes directly.',
  );
}
