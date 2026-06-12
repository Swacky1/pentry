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

  const filtered = applyIgnores(allFindings, resolved.ignore);
  return new ScanReport(filtered, resolved, checks);
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
  return checks;
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

function applyIgnores(findings: Finding[], ignore: string[]): Finding[] {
  if (ignore.length === 0) return findings;
  const ignored = new Set(ignore);
  return findings.filter((f) => !ignored.has(f.fingerprint) && !ignored.has(f.checkId));
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export { silentLogger };
