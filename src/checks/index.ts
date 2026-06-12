import type { Check } from '../types.js';
import { accessControlCheck } from './access-control.js';
import { cacheControlCheck } from './cache-control.js';
import { cookiesCheck } from './cookies.js';
import { corsCheck } from './cors.js';
import { errorDisclosureCheck } from './error-disclosure.js';
import { exposedResourcesCheck } from './exposed-resources.js';
import { graphqlIntrospectionCheck } from './graphql-introspection.js';
import { httpMethodsCheck } from './http-methods.js';
import { infoDisclosureCheck } from './info-disclosure.js';
import { reflectedInputCheck } from './reflected-input.js';
import { securityHeadersCheck } from './security-headers.js';
import { subresourceIntegrityCheck } from './subresource-integrity.js';
import { transportSecurityCheck } from './transport-security.js';

/**
 * Built-in checks, in a sensible default run order (passive/low-risk first).
 * Add new checks here to ship them with Pentry.
 */
export const builtInChecks: Check[] = [
  securityHeadersCheck,
  cookiesCheck,
  cacheControlCheck,
  infoDisclosureCheck,
  subresourceIntegrityCheck,
  corsCheck,
  transportSecurityCheck,
  httpMethodsCheck,
  accessControlCheck,
  reflectedInputCheck,
  errorDisclosureCheck,
  exposedResourcesCheck,
  graphqlIntrospectionCheck,
];

export {
  accessControlCheck,
  cacheControlCheck,
  cookiesCheck,
  corsCheck,
  errorDisclosureCheck,
  exposedResourcesCheck,
  graphqlIntrospectionCheck,
  httpMethodsCheck,
  infoDisclosureCheck,
  reflectedInputCheck,
  securityHeadersCheck,
  subresourceIntegrityCheck,
  transportSecurityCheck,
};

/** Look up a built-in check by ID. */
export function getCheck(id: string): Check | undefined {
  return builtInChecks.find((check) => check.id === id);
}
