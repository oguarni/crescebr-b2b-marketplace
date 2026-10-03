const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))['lint-staged'];

for (const workspace of ['frontend', 'backend']) {
  test(`staged ${workspace} TypeScript is checked by its workspace ESLint config`, () => {
    const pattern = Object.keys(config).find(key => key.startsWith(`${workspace}/`));
    assert.ok(pattern, `Missing ${workspace} lint-staged rule`);
    const command = config[pattern].find(task => task.includes('eslint'));
    assert.ok(command, `Missing ${workspace} ESLint command`);

    // Place a real TypeScript fixture under the workspace so ignored-file
    // warnings from the root config cannot masquerade as a successful lint.
    const directory = mkdtempSync(path.join(root, workspace, '.lint-staged-check-'));
    try {
      const fixture = path.join(directory, 'fixture.ts');
      writeFileSync(fixture, 'export const value: number = 1;\nconst lintStageUnused = 2;\n');
      const [executable, ...args] = command.split(' ');
      const result = spawnSync(executable, [...args, fixture], {
        cwd: root,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });

      assert.equal(result.error, undefined);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /lintStageUnused.*no-unused-vars/);
      assert.doesNotMatch(result.stdout, /File ignored/);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
}
