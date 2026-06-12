/**
 * Tiny zero-dependency ANSI color helper.
 *
 * Respects the `NO_COLOR` convention (https://no-color.org) and disables itself
 * when stdout is not a TTY (e.g. piped to a file or CI log without color
 * support). Keeping this in-house avoids a runtime dependency — a deliberate
 * choice for a security tool where every transitive package is attack surface.
 */

const enabled =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  Boolean(process.stdout && process.stdout.isTTY);

function wrap(open: number, close: number) {
  return (text: string): string => (enabled ? `[${open}m${text}[${close}m` : text);
}

export const colors = {
  enabled,
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  underline: wrap(4, 24),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
  bgRed: wrap(41, 49),
};
