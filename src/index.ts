/**
 * Pentry — security tests for your web app, in your test suite.
 *
 * Public API surface. Import `scan` for the common case; the rest is here for
 * advanced use (custom checks, custom reporters, direct config handling).
 */

export { scan, Scanner, silentLogger } from './scanner.js';
export type { ScanOptions } from './scanner.js';

export { ScanReport } from './report.js';
export type { ReportFormat } from './report.js';

export { defineConfig, resolveConfig, isLocalHost, UnauthorizedTargetError } from './config.js';

export { builtInChecks, getCheck } from './checks/index.js';
export {
  securityHeadersCheck,
  cookiesCheck,
  infoDisclosureCheck,
  corsCheck,
  httpMethodsCheck,
  accessControlCheck,
  reflectedInputCheck,
} from './checks/index.js';

export { createLogger } from './logger.js';
export { SEVERITIES, SEVERITY_ORDER } from './types.js';

export type {
  Check,
  CheckContext,
  Finding,
  FindingInput,
  Evidence,
  RequestEvidence,
  ResponseEvidence,
  PentryConfig,
  ResolvedConfig,
  RouteSpec,
  AuthConfig,
  Severity,
  SeveritySummary,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  Logger,
} from './types.js';
