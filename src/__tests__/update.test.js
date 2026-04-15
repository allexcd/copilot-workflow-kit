'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { LOCKFILE_NAME } = require('../../src/utils');

let tmpDir;
let mockTemplateDir;
const originalCwd = process.cwd;

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const mockManifest = {
  files: [
    { path: 'managed/file.md', ownership: 'kit-managed' },
    { path: 'user/file.md', ownership: 'user-owned' },
  ],
};

const TEMPLATE_CONTENT = 'template v2 content';
const ORIGINAL_CONTENT = 'template v1 content';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-update-'));
  mockTemplateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-tpl-'));

  // Create template files (representing the new kit version)
  fs.mkdirSync(path.join(mockTemplateDir, 'managed'), { recursive: true });
  fs.mkdirSync(path.join(mockTemplateDir, 'user'), { recursive: true });
  fs.writeFileSync(path.join(mockTemplateDir, 'managed', 'file.md'), TEMPLATE_CONTENT, 'utf8');
  fs.writeFileSync(path.join(mockTemplateDir, 'user', 'file.md'), 'user template', 'utf8');

  process.cwd = () => tmpDir;
  jest.spyOn(console, 'log').mockImplementation(() => {});

  jest.mock('../../src/utils', () => {
    const actual = jest.requireActual('../../src/utils');
    const mockPath = require('path');
    return {
      ...actual,
      loadManifest: () => mockManifest,
      getKitVersion: () => '2.0.0',
      getTemplatePath: (rel) => mockPath.join(mockTemplateDir, rel),
    };
  });
});

afterEach(() => {
  process.cwd = originalCwd;
  console.log.mockRestore();
  jest.restoreAllMocks();
  jest.resetModules();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(mockTemplateDir, { recursive: true, force: true });
});

function requireUpdate() {
  return require('../../src/commands/update');
}

function seedProject(fileContent, lockHash) {
  // Create the installed file
  fs.mkdirSync(path.join(tmpDir, 'managed'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), fileContent, 'utf8');

  // Write a lockfile tracking the original install
  const { writeLockfile } = jest.requireActual('../../src/utils');
  writeLockfile(tmpDir, {
    version: '1.0.0',
    files: {
      'managed/file.md': { ownership: 'kit-managed', hash: lockHash || hash(fileContent) },
      'user/file.md': { ownership: 'user-owned', hash: hash('user content') },
    },
  });
}

describe('update command', () => {
  it('exits early if no lockfile exists', async () => {
    const update = requireUpdate();
    await update([]);

    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('No .copilot-kit.lock found');
  });

  it('skips user-owned files', async () => {
    seedProject(ORIGINAL_CONTENT);
    // Also create user file with different content
    fs.mkdirSync(path.join(tmpDir, 'user'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'user', 'file.md'), 'my custom user content', 'utf8');

    const update = requireUpdate();
    await update([]);

    // User file should be untouched
    expect(fs.readFileSync(path.join(tmpDir, 'user', 'file.md'), 'utf8')).toBe('my custom user content');
  });

  it('updates kit-managed file when not locally modified', async () => {
    seedProject(ORIGINAL_CONTENT);

    const update = requireUpdate();
    await update([]);

    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe(TEMPLATE_CONTENT);
    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('(updated)');
  });

  it('warns and skips locally modified file without --force', async () => {
    // Install original, then user modifies it
    seedProject(ORIGINAL_CONTENT);
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'user modified this', 'utf8');

    const update = requireUpdate();
    await update([]);

    // File should still have user's modification
    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe('user modified this');
    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('locally modified');
  });

  it('overwrites locally modified file with --force', async () => {
    seedProject(ORIGINAL_CONTENT);
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'user modified this', 'utf8');

    const update = requireUpdate();
    await update(['--force']);

    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe(TEMPLATE_CONTENT);
  });

  it('restores deleted kit-managed files', async () => {
    seedProject(ORIGINAL_CONTENT);
    // Delete the managed file
    fs.unlinkSync(path.join(tmpDir, 'managed', 'file.md'));

    const update = requireUpdate();
    await update([]);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe(TEMPLATE_CONTENT);
    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('(restored)');
  });

  it('--dry-run prints actions but writes no files or lockfile', async () => {
    seedProject(ORIGINAL_CONTENT);
    const lockBefore = fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8');

    const update = requireUpdate();
    await update(['--dry-run']);

    // File should still have original content
    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe(ORIGINAL_CONTENT);
    // Lockfile should be unchanged
    expect(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8')).toBe(lockBefore);
    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('dry run');
  });
});
