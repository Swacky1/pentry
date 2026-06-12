#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { scan } from './scanner.js';
import { UnauthorizedTargetError } from './config.js';
import { createLogger } from './logger.js';
import { colors } from './util/colors.js';
import type { ReportFormat } from './report.js';
import type { PentryConfig, Severity } from './types.js';

const VERSION = '0.1.0';

const HELP = `
${colors.bold('Pentry')} — security tests for your web app.

${colors.bold('Usage')}
  pentry scan <target> [options]
  pentry <target> [options]

${colors.bold('Examples')}
  pentry scan http://localhost:3000
  pentry scan http://localhost:3000 --routes /api/users,/api/admin --fail-on high
  pentry scan http://localhost:3000 --format sarif --output results.sarif
  pentry --config pentry.config.json

${colors.bold('Options')}
  --routes <list>       Comma-separated paths to test (e.g. /api/a,/api/b)
  --fail-on <severity>  Min severity that exits non-zero: info|low|medium|high|critical (default: medium)
  --format <fmt>        Output format: console|json|sarif|junit (default: console)
  --output <file>       Write the report to a file instead of stdout
  --only <ids>          Run only these check IDs (comma-separated)
  --exclude <ids>       Skip these check IDs (comma-separated)
  --ignore <list>       Suppress finding fingerprints or check IDs (comma-separated)
  --timeout <ms>        Per-request timeout in milliseconds (default: 10000)
  --allow-external      Permit scanning non-local targets (you must be authorized)
  --config <file>       Load options from a JSON/JS config file
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
      const key = arg.slice(1);
      flags[key] = true;
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

async function loadConfigFile(file: string): Promise<Partial<PentryConfig>> {
  const path = resolvePath(process.cwd(), file);
  if (!existsSync(path)) throw new Error(`Config file not found: ${file}`);
  if (path.endsWith('.json')) {
    return JSON.parse(readFileSync(path, 'utf8')) as Partial<PentryConfig>;
  }
  const mod = (await import(pathToFileURL(path).href)) as {
    default?: Partial<PentryConfig>;
  };
  if (!mod.default) throw new Error(`Config file "${file}" must have a default export.`);
  return mod.default;
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

  // `pentry scan <target>` or `pentry <target>`.
  const args = positional[0] === 'scan' ? positional.slice(1) : positional;

  let fileConfig: Partial<PentryConfig> = {};
  if (typeof flags.config === 'string') {
    fileConfig = await loadConfigFile(flags.config);
  } else if (existsSync(resolvePath(process.cwd(), 'pentry.config.json'))) {
    fileConfig = await loadConfigFile('pentry.config.json');
  }

  const target = args[0] ?? fileConfig.target;
  if (!target) {
    process.stderr.write(colors.red('Error: no target specified.\n\n'));
    process.stdout.write(`${HELP}\n`);
    return 2;
  }

  const config: PentryConfig = {
    ...fileConfig,
    target,
    routes: list(flags.routes) ?? fileConfig.routes,
    checks: list(flags.only) ?? fileConfig.checks,
    exclude: list(flags.exclude) ?? fileConfig.exclude,
    ignore: list(flags.ignore) ?? fileConfig.ignore,
    failOn: (flags['fail-on'] as Severity) ?? fileConfig.failOn,
    allowExternal: flags['allow-external'] === true || fileConfig.allowExternal,
    timeout: flags.timeout ? Number(flags.timeout) : fileConfig.timeout,
  };

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

  // Non-zero exit when findings meet the fail threshold — this is what makes
  // Pentry gate a CI pipeline.
  return report.ok ? 0 : 1;
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
