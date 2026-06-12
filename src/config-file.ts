import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PentryConfig } from './types.js';

/** Config filenames Pentry auto-discovers, in precedence order. */
export const CONFIG_FILENAMES = [
  'pentry.config.js',
  'pentry.config.mjs',
  'pentry.config.cjs',
  'pentry.config.json',
  'pentry.config.ts',
];

/** Find the first config file present in `cwd`, or undefined. */
export function findConfigFile(cwd: string = process.cwd()): string | undefined {
  for (const name of CONFIG_FILENAMES) {
    const path = resolvePath(cwd, name);
    if (existsSync(path)) return path;
  }
  return undefined;
}

/**
 * Load a Pentry config file. JSON is parsed directly; `.js`/`.mjs`/`.cjs` are
 * imported and must `export default` (typically `defineConfig({...})`).
 *
 * `.ts` config is supported only when the process is run under a TypeScript-aware
 * loader (e.g. `tsx`, or a runner like Vitest) — Pentry ships no TS runtime of
 * its own to stay dependency-free, so we attempt the import and surface a clear
 * error if the runtime can't handle it.
 */
export async function loadConfigFile(file: string): Promise<Partial<PentryConfig>> {
  const path = resolvePath(process.cwd(), file);
  if (!existsSync(path)) throw new Error(`Config file not found: ${file}`);

  if (path.endsWith('.json')) {
    return JSON.parse(readFileSync(path, 'utf8')) as Partial<PentryConfig>;
  }

  let mod: { default?: Partial<PentryConfig> };
  try {
    mod = (await import(pathToFileURL(path).href)) as { default?: Partial<PentryConfig> };
  } catch (error) {
    if (path.endsWith('.ts')) {
      throw new Error(
        `Could not load TypeScript config "${file}". Run Pentry under a TS-aware runtime ` +
          `(e.g. \`tsx\`) or use a .js/.mjs/.json config. Original error: ${describe(error)}`,
        { cause: error },
      );
    }
    throw error;
  }

  if (!mod.default) {
    throw new Error(`Config file "${file}" must have a default export (e.g. defineConfig({...})).`);
  }
  return mod.default;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
