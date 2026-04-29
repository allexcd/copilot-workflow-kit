'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('npm package contents', () => {
  it('ships runtime files without Jest test files', () => {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--cache', '/tmp/cwk-test-npm-cache'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const [pack] = JSON.parse(output);
    const files = pack.files.map((file) => file.path);

    expect(files).toContain('bin/cli.js');
    expect(files).toContain('src/git-mode.js');
    expect(files).toContain('src/utils.js');
    expect(files).toContain('src/commands/init.js');
    expect(files).toContain('src/commands/validate.js');
    expect(files).toContain('templates/.github/copilot-instructions.md');
    expect(files.some((file) => file.startsWith('src/__tests__/'))).toBe(false);
  });
});
