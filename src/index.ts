/**
 * Pentry — security tests for your web app, in your test suite.
 *
 * Public API surface. Import `scan` for the common case; the rest is here for
 * advanced use (custom checks, custom reporters, direct config handling).
 */

export { scan, Scanner, silentLogger } from './scanner.js';
export type { ScanOptions } from './scanner.js';

export { ScanReport } from './report.js';
export type { ReportFormat, ScanReportOptions } from './report.js';

export { defineConfig, resolveConfig, isLocalHost, UnauthorizedTargetError } from './config.js';
export { findConfigFile, loadConfigFile, CONFIG_FILENAMES } from './config-file.js';

export { loadBaseline, createBaseline, writeBaseline, DEFAULT_BASELINE_PATH } from './baseline.js';
export type { BaselineFile } from './baseline.js';

export { scaffoldInit } from './init.js';
export type { InitResult } from './init.js';

export { discoverRoutes, discoverExpressRoutes, discoverOpenApiRoutes } from './discovery/index.js';

export { pentryMatchers } from './matchers.js';

export { builtInChecks, getCheck } from './checks/index.js';
export {
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
  CheckOverride,
  IgnoreRule,
  Severity,
  SeveritySummary,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  Logger,
} from './types.js';
