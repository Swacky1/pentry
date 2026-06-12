#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { scan } from './scanner.js';
import { UnauthorizedTargetError } from './config.js';
import { findConfigFile, loadConfigFile } from './config-file.js';
import { createBaseline, writeBaseline, DEFAULT_BASELINE_PATH } from './baseline.js';
import { scaffoldInit } from './init.js';
import { createLogger, silentLogger } from './logger.js';
import { colors } from './util/colors.js';
import type { ReportFormat } from './report.js';
import type { PentryConfig, Severity } from './types.js';

const VERSION = '1.0.0';

const HELP = `
${colors.bold('Pentry')} — security tests for your web app.

${colors.bold('Usage')}
  pentry scan <target> [options]
  pentry <target> [options]
  pentry init
  pentry baseline <target> [--output <file>]

${colors.bold('Commands')}
  scan        Scan a target and report findings (default)
  init        Scaffold a pentry config + a starter security test
  baseline    Record current findings so only NEW issues fail later runs

${colors.bold('Examples')}
  pentry scan http://localhost:3000
  pentry scan http://localhost:3000 --routes /api/users,/api/admin --fail-on high
  pentry scan http://localhost:3000 --format markdown --output report.md
  pentry scan http://localhost:3000 --baseline pentry-baseline.json
  pentry init
  pentry baseline http://localhost:3000

${colors.bold('Options')}
  --routes <list>       Comma-separated paths to test (e.g. /api/a,/api/b)
  --fail-on <severity>  Min severity that exits non-zero: info|low|medium|high|critical (default: medium)
  --format <fmt>        Output format: console|json|sarif|junit|markdown|html (default: console)
  --output <file>       Write the report to a file instead of stdout
  --only <ids>          Run only these check IDs (comma-separated)
  --exclude <ids>       Skip these check IDs (comma-separated)
  --ignore <list>       Suppress finding fingerprints or check IDs (comma-separated)
  --baseline <file>     Treat findings in this baseline as accepted (only new ones fail)
  --timeout <ms>        Per-request timeout in milliseconds (default: 10000)
  --allow-external      Permit scanning non-local targets (you must be authorized)
  --config <file>       Load options from a JS/JSON config file
  --quiet               Only print the report, no progress logs
  --verbose             Print debug logs
  -h, --help            Show this help
  -v, --version         Show version

${colors.dim('Pentry only scans loopback/private targets unless --allow-external is set.')}
`;

interface CliArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function list(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Resolve file config from --config or auto-discovery. */
async function resolveFileConfig(configFlag: unknown): Promise<Partial<PentryConfig>> {
  if (typeof configFlag === 'string') return loadConfigFile(configFlag);
  const discovered = findConfigFile();
  return discovered ? loadConfigFile(discovered) : {};
}

/** Merge file config + CLI flags into a PentryConfig. */
function buildConfig(
  target: string,
  fileConfig: Partial<PentryConfig>,
  flags: Record<string, string | boolean>,
): PentryConfig {
  return {
    ...fileConfig,
    target,
    routes: list(flags.routes) ?? fileConfig.routes,
    checks: list(flags.only) ?? fileConfig.checks,
    exclude: list(flags.exclude) ?? fileConfig.exclude,
    ignore: list(flags.ignore) ?? fileConfig.ignore,
    baseline: typeof flags.baseline === 'string' ? flags.baseline : fileConfig.baseline,
    failOn: (flags['fail-on'] as Severity) ?? fileConfig.failOn,
    allowExternal: flags['allow-external'] === true || fileConfig.allowExternal,
    timeout: flags.timeout ? Number(flags.timeout) : fileConfig.timeout,
  };
}

async function runInit(): Promise<number> {
  const result = scaffoldInit();
  for (const file of result.created) process.stdout.write(`${colors.green('+')} created ${file}\n`);
  for (const file of result.skipped)
    process.stdout.write(`${colors.gray('•')} skipped ${file} (already exists)\n`);
  process.stdout.write(
    `\nDetected runner: ${colors.bold(result.runner)}. ` +
      `Start your app, then run your tests (or \`pentry scan\`).\n`,
  );
  return 0;
}

async function runBaseline(
  target: string,
  fileConfig: Partial<PentryConfig>,
  flags: Record<string, string | boolean>,
): Promise<number> {
  const config = buildConfig(target, fileConfig, flags);
  const report = await scan(config, { logger: silentLogger });
  const outPath = typeof flags.output === 'string' ? flags.output : DEFAULT_BASELINE_PATH;
  // Date is only used to stamp the file; acceptable in the CLI runtime.
  writeBaseline(outPath, createBaseline(report, new Date().toISOString()));
  process.stdout.write(
    `${colors.green('✓')} Wrote baseline with ${report.findings.length} finding(s) to ${outPath}.\n` +
      `Future scans with --baseline ${outPath} will only fail on NEW findings.\n`,
  );
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const { positional, flags } = parseArgs(argv);

  if (flags.help || flags.h) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (flags.version || flags.v) {
    process.stdout.write(`pentry ${VERSION}\n`);
    return 0;
  }

  const command = positional[0];
  if (command === 'init') return runInit();

  const fileConfig = await resolveFileConfig(flags.config);

  if (command === 'baseline') {
    const target = positional[1] ?? fileConfig.target;
    if (!target) return missingTarget();
    return runBaseline(target, fileConfig, flags);
  }

  // `pentry scan <target>` or `pentry <target>`.
  const args = command === 'scan' ? positional.slice(1) : positional;
  const target = args[0] ?? fileConfig.target;
  if (!target) return missingTarget();

  const config = buildConfig(target, fileConfig, flags);
  const format = ((flags.format as ReportFormat) ?? 'console') as ReportFormat;
  const logger = createLogger({
    quiet: flags.quiet === true || format !== 'console',
    verbose: flags.verbose === true,
  });

  const report = await scan(config, { logger });
  const output = report.format(format);

  if (typeof flags.output === 'string') {
    writeFileSync(flags.output, output, 'utf8');
    logger.info(`Report written to ${flags.output}`);
  } else {
    process.stdout.write(`${output}\n`);
  }

  // Non-zero exit when new findings meet the fail threshold — this gates CI.
  return report.ok ? 0 : 1;
}

function missingTarget(): number {
  process.stderr.write(colors.red('Error: no target specified.\n\n'));
  process.stdout.write(`${HELP}\n`);
  return 2;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof UnauthorizedTargetError) {
      process.stderr.write(`${colors.red('✗')} ${error.message}\n`);
      process.exit(2);
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${colors.red('✗ Pentry failed:')} ${message}\n`);
    process.exit(2);
  });
