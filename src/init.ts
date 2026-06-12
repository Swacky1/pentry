import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

export interface InitResult {
  created: string[];
  skipped: string[];
  runner: 'vitest' | 'jest' | 'node';
}

const CONFIG_FILENAME = 'pentry.config.json';
const TEST_FILENAME = 'pentry.security.test.mjs';

/**
 * Scaffold a starter Pentry setup: a config file and a security test wired to
 * the detected test runner. Never overwrites existing files — already-present
 * files are reported as skipped.
 */
export function scaffoldInit(
  cwd: string = process.cwd(),
  target = 'http://localhost:3000',
): InitResult {
  const runner = detectRunner(cwd);
  const created: string[] = [];
  const skipped: string[] = [];

  const configPath = resolvePath(cwd, CONFIG_FILENAME);
  if (existsSync(configPath)) {
    skipped.push(CONFIG_FILENAME);
  } else {
    writeFileSync(configPath, `${JSON.stringify(configTemplate(target), null, 2)}\n`, 'utf8');
    created.push(CONFIG_FILENAME);
  }

  const testPath = resolvePath(cwd, TEST_FILENAME);
  if (existsSync(testPath)) {
    skipped.push(TEST_FILENAME);
  } else {
    writeFileSync(testPath, testTemplate(runner, target), 'utf8');
    created.push(TEST_FILENAME);
  }

  return { created, skipped, runner };
}

function detectRunner(cwd: string): InitResult['runner'] {
  try {
    const pkg = JSON.parse(readFileSync(resolvePath(cwd, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
  } catch {
    // no package.json or unreadable — fall back to node:test
  }
  return 'node';
}

function configTemplate(target: string) {
  return {
    target,
    routes: ['/'],
    failOn: 'high',
  };
}

function testTemplate(runner: InitResult['runner'], target: string): string {
  if (runner === 'node') {
    return `import { test } from 'node:test';
import { scan } from '@red_official/pentry';

test('app has no security regressions', async () => {
  const report = await scan({ target: '${target}', failOn: 'high' });
  report.assert();
});
`;
  }
  // vitest and jest share the same globals here.
  const importLine = runner === 'vitest' ? "import { test } from 'vitest';\n" : '';
  return `${importLine}import { scan } from '@red_official/pentry';

test('app has no security regressions', async () => {
  const report = await scan({ target: '${target}', failOn: 'high' });
  report.assert();
});
`;
}
