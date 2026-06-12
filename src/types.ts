/**
 * Core type definitions for Pentry.
 *
 * Everything in the public API is expressed in terms of these types. They are
 * intentionally framework-agnostic: a "target" is just a base URL plus optional
 * routes, and a "check" is a small unit of logic that probes that target and
 * returns findings.
 */

/** Severity levels, ordered from least to most serious. */
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** Numeric ranking used to compare severities (higher = more serious). */
export const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** All severities, ordered low → high. */
export const SEVERITIES: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];

/** A captured HTTP request, stored as evidence on a finding. */
export interface RequestEvidence {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** A captured HTTP response, stored as evidence on a finding. */
export interface ResponseEvidence {
  status: number;
  headers: Record<string, string>;
  /** A truncated snippet of the response body (see `maxBodyCapture`). */
  bodySnippet?: string;
}

/**
 * Reproducible proof for a finding: the exact request Pentry sent and the
 * response that demonstrates the issue. Every finding should carry evidence so
 * a human can verify it without re-running the scan.
 */
export interface Evidence {
  request: RequestEvidence;
  response: ResponseEvidence;
}

/** A single security issue discovered during a scan. */
export interface Finding {
  /** ID of the check that produced this finding (e.g. `security-headers`). */
  checkId: string;
  /** Short, human-readable title. */
  title: string;
  severity: Severity;
  /** What the issue is and why it matters. */
  description: string;
  /** Concrete, actionable fix guidance. */
  remediation: string;
  /** External references (OWASP, CWE, MDN, …). */
  references: string[];
  /** The URL the finding relates to. */
  target: string;
  /** Stable identifier used for ignoring/deduplicating (checkId + target + a discriminator). */
  fingerprint: string;
  /** Reproducible proof, when applicable. */
  evidence?: Evidence;
}

/** Declarative description of a route to test. */
export interface RouteSpec {
  /** Path relative to the target base URL, e.g. `/api/users`. */
  path: string;
  /** HTTP method (defaults to `GET`). */
  method?: string;
  /**
   * When true, Pentry expects this route to require authentication and will
   * flag it if it responds with data while unauthenticated.
   */
  protected?: boolean;
}

/** How to authenticate "legitimate" requests when a route is protected. */
export interface AuthConfig {
  /** Headers attached to authenticated requests (e.g. `Authorization`). */
  headers?: Record<string, string>;
  /** A `Cookie` header value attached to authenticated requests. */
  cookie?: string;
}

/** User-facing configuration accepted by `scan()` and the CLI. */
export interface PentryConfig {
  /** Base URL of the app under test, e.g. `http://localhost:3000`. */
  target: string;
  /** Routes to probe, as paths or full specs. The base path `/` is always tested. */
  routes?: Array<string | RouteSpec>;
  /** Allowlist of check IDs to run. Defaults to all built-in checks. */
  checks?: string[];
  /** Check IDs to skip. Applied after `checks`. */
  exclude?: string[];
  /** Finding fingerprints (or check IDs) to suppress from results. */
  ignore?: string[];
  /** Minimum severity that should cause a non-zero exit / failed assertion. */
  failOn?: Severity;
  /**
   * Permit scanning non-local targets. Off by default — Pentry refuses to
   * attack anything that isn't loopback/private unless you opt in.
   */
  allowExternal?: boolean;
  /** Per-request timeout in milliseconds. */
  timeout?: number;
  /** Credentials for authenticated requests. */
  auth?: AuthConfig;
  /** Max bytes of a response body to capture as evidence. */
  maxBodyCapture?: number;
}

/** Fully-resolved configuration with all defaults applied. */
export interface ResolvedConfig {
  target: string;
  baseUrl: URL;
  routes: Required<RouteSpec>[];
  checks: string[];
  exclude: string[];
  ignore: string[];
  failOn: Severity;
  allowExternal: boolean;
  timeout: number;
  auth?: AuthConfig;
  maxBodyCapture: number;
}

/** Options for an outgoing HTTP request issued by a check. */
export interface HttpRequestOptions {
  method?: string;
  /** Path (resolved against the base URL) or an absolute URL. */
  path: string;
  headers?: Record<string, string>;
  body?: string;
  /** Attach configured auth credentials to this request. */
  includeAuth?: boolean;
}

/** Normalized HTTP response returned to checks. */
export interface HttpResponse {
  status: number;
  /** Response headers with lower-cased keys. */
  headers: Record<string, string>;
  /** Individual `Set-Cookie` values (not flattened). */
  setCookies: string[];
  /** Response body (truncated to `maxBodyCapture`). */
  body: string;
  /** Evidence object derived from this request/response pair. */
  evidence: Evidence;
}

/** Minimal logger interface used throughout Pentry. */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

/** HTTP client handed to checks. Implemented by `FetchHttpClient`. */
export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
  get(path: string, options?: Omit<HttpRequestOptions, 'path' | 'method'>): Promise<HttpResponse>;
  resolve(path: string): string;
}

/** Fields a check supplies; `checkId`, `target`, and `fingerprint` are filled in for it. */
export type FindingInput = Omit<Finding, 'checkId' | 'fingerprint'> & {
  /** Optional discriminator to make the fingerprint unique within a check/target. */
  key?: string;
};

/** Everything a check needs to do its work. */
export interface CheckContext {
  http: HttpClient;
  config: ResolvedConfig;
  baseUrl: URL;
  routes: Required<RouteSpec>[];
  log: Logger;
  /** Build a fully-formed finding from the parts a check cares about. */
  finding(input: FindingInput): Finding;
}

/**
 * A check is the unit of security testing. Built-in checks are plain objects;
 * users can author their own and register them via the `checks` API.
 */
export interface Check {
  /** Stable, kebab-case identifier. */
  id: string;
  /** Human-readable name. */
  title: string;
  /** One-line description of what the check looks for. */
  description: string;
  /** Default severity for findings (individual findings may override). */
  severity: Severity;
  /**
   * Passive checks only observe normal responses. Active checks send crafted
   * (but non-destructive) requests. Both are safe to run against your own app.
   */
  passive: boolean;
  run(ctx: CheckContext): Promise<Finding[]>;
}

/** Summary counts of findings by severity. */
export type SeveritySummary = Record<Severity, number>;
