import type { Logger } from './types.js';
import { colors } from './util/colors.js';

export interface LoggerOptions {
  /** Suppress everything except warnings/errors. */
  quiet?: boolean;
  /** Emit debug output. */
  verbose?: boolean;
}

/**
 * Default logger. Writes human output to stderr so that stdout can be reserved
 * for machine-readable report output (JSON/SARIF) when piping.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const { quiet = false, verbose = false } = options;
  return {
    info(message) {
      if (!quiet) process.stderr.write(`${colors.cyan('•')} ${message}\n`);
    },
    warn(message) {
      process.stderr.write(`${colors.yellow('!')} ${message}\n`);
    },
    debug(message) {
      if (verbose) process.stderr.write(`${colors.gray(`  ${message}`)}\n`);
    },
  };
}

/** A logger that discards everything — handy for library use and tests. */
export const silentLogger: Logger = {
  info() {},
  warn() {},
  debug() {},
};
