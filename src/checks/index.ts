import type { Check } from '../types.js';
import { accessControlCheck } from './access-control.js';
import { cookiesCheck } from './cookies.js';
import { corsCheck } from './cors.js';
import { httpMethodsCheck } from './http-methods.js';
import { infoDisclosureCheck } from './info-disclosure.js';
import { reflectedInputCheck } from './reflected-input.js';
import { securityHeadersCheck } from './security-headers.js';

/**
 * Built-in checks, in a sensible default run order (passive/low-risk first).
 * Add new checks here to ship them with Pentry.
 */
export const builtInChecks: Check[] = [
  securityHeadersCheck,
  cookiesCheck,
  infoDisclosureCheck,
  corsCheck,
  httpMethodsCheck,
  accessControlCheck,
  reflectedInputCheck,
];

export {
  accessControlCheck,
  cookiesCheck,
  corsCheck,
  httpMethodsCheck,
  infoDisclosureCheck,
  reflectedInputCheck,
  securityHeadersCheck,
};

/** Look up a built-in check by ID. */
export function getCheck(id: string): Check | undefined {
  return builtInChecks.find((check) => check.id === id);
}
