import { loadBaseline } from './baseline.js';
import { builtInChecks } from './checks/index.js';
import { resolveConfig } from './config.js';
import { FetchHttpClient } from './http/client.js';
import { createLogger, silentLogger } from './logger.js';
import { ScanReport } from './report.js';
import type {
  Check,
  CheckContext,
  Finding,
  FindingInput,
  IgnoreRule,
  Logger,
  PentryConfig,
  ResolvedConfig,
} from './types.js';

export interface ScanOptions {
  /** Additional, user-authored checks to run alongside (or instead of) built-ins. */
  checks?: Check[];
  /** Replace the built-in check set entirely with `checks`. */
  replaceChecks?: boolean;
  /** Custom logger. Defaults to a stderr logger; pass `silentLogger` to silence. */
  logger?: Logger;
  /** Baselined fingerprints (overrides loading from `config.baseline`). */
  baseline?: Set<string>;
}

/**
 * Run a security scan against a target and resolve to a {@link ScanReport}.
 *
 * ```ts
 * import { scan } from '@red_official/pentry';
 *
 * const report = await scan({ target: 'http://localhost:3000' });
 * report.assert(); // throws if anything at/above failOn was found
 * ```
 */
export async function scan(config: PentryConfig, options: ScanOptions = {}): Promise<ScanReport> {
  const resolved = resolveConfig(config);
  const logger = options.logger ?? createLogger();
  const http = new FetchHttpClient(resolved);

  const checks = selectChecks(resolved, options);
  logger.info(`Scanning ${resolved.target} with ${checks.length} check(s)…`);

  const allFindings: Finding[] = [];
  for (const check of checks) {
    logger.debug(`running check: ${check.id}`);
    const ctx = createContext(check, resolved, http, logger);
    try {
      const findings = await check.run(ctx);
      allFindings.push(...findings);
    } catch (error) {
      logger.warn(`check "${check.id}" errored and was skipped: ${describeError(error)}`);
    }
  }

  const overridden = applyOverrides(allFindings, resolved);
  const filtered = applyIgnores(overridden, resolved.ignore, new Date(), logger);
  const baseline =
    options.baseline ?? (resolved.baseline ? loadBaseline(resolved.baseline) : new Set<string>());
  return new ScanReport(filtered, resolved, checks, { baseline });
}

/** Lower-level entry point that returns the raw report; mirrors `scan`. */
export class Scanner {
  constructor(
    private readonly config: PentryConfig,
    private readonly options: ScanOptions = {},
  ) {}

  run(): Promise<ScanReport> {
    return scan(this.config, this.options);
  }
}

function selectChecks(config: ResolvedConfig, options: ScanOptions): Check[] {
  const base = options.replaceChecks ? [] : builtInChecks;
  let checks = [...base, ...(options.checks ?? [])];

  if (config.checks.length > 0) {
    const allow = new Set(config.checks);
    checks = checks.filter((c) => allow.has(c.id));
  }
  if (config.exclude.length > 0) {
    const deny = new Set(config.exclude);
    checks = checks.filter((c) => !deny.has(c.id));
  }
  // A check disabled via `overrides[id].enabled = false` is dropped too.
  checks = checks.filter((c) => config.overrides[c.id]?.enabled !== false);
  return checks;
}

/** Remap finding severities per `overrides[checkId].severity`. */
function applyOverrides(findings: Finding[], config: ResolvedConfig): Finding[] {
  return findings.map((f) => {
    const severity = config.overrides[f.checkId]?.severity;
    return severity ? { ...f, severity } : f;
  });
}

function createContext(
  check: Check,
  config: ResolvedConfig,
  http: FetchHttpClient,
  logger: Logger,
): CheckContext {
  return {
    http,
    config,
    baseUrl: config.baseUrl,
    routes: config.routes,
    log: logger,
    finding(input: FindingInput): Finding {
      const { key, ...rest } = input;
      const target = rest.target || config.target;
      return {
        ...rest,
        checkId: check.id,
        fingerprint: `${check.id}:${target}:${key ?? rest.title}`,
      };
    },
  };
}

function applyIgnores(
  findings: Finding[],
  ignore: IgnoreRule[],
  now: Date,
  logger: Logger,
): Finding[] {
  if (ignore.length === 0) return findings;

  // An ignore rule with an `expires` date in the past no longer applies.
  const active = ignore.filter((rule) => {
    if (!rule.expires) return true;
    const ts = Date.parse(rule.expires);
    if (Number.isNaN(ts)) {
      logger.warn(`ignore rule has invalid expires date "${rule.expires}" — treating as active`);
      return true;
    }
    const live = ts >= now.getTime();
    if (!live) logger.debug(`ignore rule expired (${rule.expires}); finding will resurface`);
    return live;
  });

  return findings.filter((f) => !active.some((rule) => matchesIgnore(f, rule)));
}

function matchesIgnore(finding: Finding, rule: IgnoreRule): boolean {
  if (rule.fingerprint && finding.fingerprint === rule.fingerprint) return true;
  if (rule.check && finding.checkId === rule.check) return true;
  return false;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export { silentLogger };
