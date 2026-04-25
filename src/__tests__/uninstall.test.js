'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { LOCKFILE_NAME } = require('../../src/utils');

let tmpDir;
const originalCwd = process.cwd;

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Seed a project that looks like `init` already ran:
 * - managed/file.md  (kit-managed)
 * - user/file.md     (user-owned)
 * - .copilot-kit.lock
 */
function seedProject() {
  fs.mkdirSync(path.join(tmpDir, 'managed'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'user'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'managed content', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'user', 'file.md'), 'user content', 'utf8');

  const { writeLockfile } = jest.requireActual('../../src/utils');
  writeLockfile(tmpDir, {
    version: '1.0.0',
    files: {
      'managed/file.md': { ownership: 'kit-managed', hash: hash('managed content') },
      'user/file.md': { ownership: 'user-owned', hash: hash('user content') },
    },
  });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-uninstall-'));
  process.cwd = () => tmpDir;
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.cwd = originalCwd;
  console.log.mockRestore();
  jest.restoreAllMocks();
  jest.resetModules();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function requireUninstall() {
  return require('../../src/commands/uninstall');
}

describe('uninstall command', () => {
  it('exits gracefully when no lockfile exists', async () => {
    const uninstall = requireUninstall();
    await uninstall([]);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Nothing to uninstall');
  });

  it('removes kit-managed files but keeps user-owned files by default', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall([]);

    // Kit-managed file should be removed
    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(false);
    // User-owned file should still exist
    expect(fs.existsSync(path.join(tmpDir, 'user', 'file.md'))).toBe(true);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('removed');
    expect(output).toContain('skip');
    expect(output).toContain('user-owned');
  });

  it('keeps locally modified kit-managed files and lockfile by default', async () => {
    seedProject();
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'modified managed content', 'utf8');

    const uninstall = requireUninstall();
    await uninstall([]);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(true);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('locally modified');
    expect(output).toContain('--force');
  });

  it('removes locally modified kit-managed files with --force', async () => {
    seedProject();
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'modified managed content', 'utf8');

    const uninstall = requireUninstall();
    await uninstall(['--force']);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(false);
  });

  it('removes user-owned files when --all is passed', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall(['--all']);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'user', 'file.md'))).toBe(false);
  });

  it('removes the lockfile after uninstall', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall([]);

    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(false);
  });

  it('cleans up empty parent directories', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall(['--all']);

    // Both managed/ and user/ should be removed since they are now empty
    expect(fs.existsSync(path.join(tmpDir, 'managed'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'user'))).toBe(false);
  });

  it('does not remove directories that still contain other files', async () => {
    seedProject();
    // Add an unrelated file inside the managed/ directory
    fs.writeFileSync(path.join(tmpDir, 'managed', 'other.md'), 'unrelated', 'utf8');

    const uninstall = requireUninstall();
    await uninstall([]);

    // managed/ directory should still exist because of other.md
    expect(fs.existsSync(path.join(tmpDir, 'managed'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'managed', 'other.md'))).toBe(true);
    // But the kit-managed file itself should be gone
    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(false);
  });

  it('--dry-run prints actions but removes nothing', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall(['--dry-run']);

    // All files and lockfile should still exist
    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'user', 'file.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(true);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('would remove');
    expect(output).toContain('Dry run');
  });

  it('skips files that are already missing', async () => {
    seedProject();
    // Delete a file before running uninstall
    fs.unlinkSync(path.join(tmpDir, 'managed', 'file.md'));

    const uninstall = requireUninstall();
    await uninstall([]);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('not found');
    // Should still remove the lockfile
    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(false);
  });

  it('leaves zero kit artifacts after --all uninstall', async () => {
    seedProject();

    const uninstall = requireUninstall();
    await uninstall(['--all']);

    // Only the tmp root dir should remain, with no children
    const remaining = fs.readdirSync(tmpDir);
    expect(remaining).toEqual([]);
  });
});
