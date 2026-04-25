'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const init = require('../../src/commands/init');
const status = require('../../src/commands/status');
const diff = require('../../src/commands/diff');
const update = require('../../src/commands/update');
const uninstall = require('../../src/commands/uninstall');
const { LOCKFILE_NAME } = require('../../src/utils');

describe('install smoke flow', () => {
  let tmpDir;
  const originalCwd = process.cwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-smoke-'));
    process.cwd = () => tmpDir;
    jest.spyOn(console, 'log').mockImplementation(() => {});

    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
    fs.mkdirSync(path.join(tmpDir, '.github', 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '# Existing instructions\n', 'utf8');
  });

  afterEach(() => {
    process.cwd = originalCwd;
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs the installed project lifecycle without hiding unrelated .github files', async () => {
    await init(['--gitignore']);

    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), 'utf8')).toBe('# Existing instructions\n');

    expect(() => execFileSync('git', ['check-ignore', '.github/workflows/update-copilot-kit.yml'], { cwd: tmpDir })).not.toThrow();
    expect(() => execFileSync('git', ['check-ignore', '.github/workflows/ci.yml'], { cwd: tmpDir })).toThrow();

    await expect(status([])).resolves.toBeUndefined();
    await expect(diff([])).resolves.toBeUndefined();
    await expect(update(['--dry-run'])).resolves.toBeUndefined();
    await expect(uninstall(['--dry-run'])).resolves.toBeUndefined();
  });
});
