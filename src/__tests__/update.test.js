'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { LOCKFILE_NAME } = require('../../src/utils');
const { KIT_BLOCK_BEGIN } = require('../../src/git-mode');

let tmpDir;
let mockTemplateDir;
const originalCwd = process.cwd;
const originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const baseManifestFiles = [
  { path: 'managed/file.md', ownership: 'kit-managed' },
  { path: 'user/file.md', ownership: 'user-owned' },
];
const mockManifest = { files: [] };

const TEMPLATE_CONTENT = 'template v2 content';
const ORIGINAL_CONTENT = 'template v1 content';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-update-'));
  mockTemplateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-tpl-'));
  mockManifest.files = baseManifestFiles.map((entry) => ({ ...entry }));

  // Create template files (representing the new kit version)
  writeTemplate('managed/file.md', TEMPLATE_CONTENT);
  writeTemplate('user/file.md', 'user template');

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
  if (originalStdinIsTTY) {
    Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTTY);
  } else {
    delete process.stdin.isTTY;
  }
  jest.restoreAllMocks();
  jest.resetModules();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(mockTemplateDir, { recursive: true, force: true });
});

function requireUpdate() {
  return require('../../src/commands/update');
}

function writeTemplate(relativePath, content) {
  const absPath = path.join(mockTemplateDir, relativePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
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

  it('uses saved gitignore mode and refreshes entries for new files', async () => {
    seedProject(ORIGINAL_CONTENT);
    const lockPath = path.join(tmpDir, LOCKFILE_NAME);
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.gitMode = 'gitignore';
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
    mockManifest.files.push({ path: 'managed/new.md', ownership: 'kit-managed' });
    writeTemplate('managed/new.md', 'new managed content');
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), [
      'node_modules/',
      '# copilot-workflow-kit',
      'managed/file.md',
      '.copilot-kit.lock',
      'dist/',
      '',
    ].join('\n'), 'utf8');

    const update = requireUpdate();
    await update([]);

    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'new.md'), 'utf8')).toBe('new managed content');
    const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain(KIT_BLOCK_BEGIN);
    expect(gitignore).toContain('managed/new.md');
    expect(gitignore.split(KIT_BLOCK_BEGIN).length - 1).toBe(1);
    const nextLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    expect(nextLock.gitMode).toBe('gitignore');
    expect(nextLock.files['managed/new.md']).toBeDefined();
  });

  it('prompts for git mode on old interactive git installs', async () => {
    fs.mkdirSync(path.join(tmpDir, '.git', 'info'), { recursive: true });
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    jest.doMock('readline', () => ({
      createInterface: () => ({
        question: (_prompt, cb) => cb('2'),
        close: jest.fn(),
      }),
    }));
    seedProject(ORIGINAL_CONTENT);

    const update = requireUpdate();
    await update([]);

    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    expect(lock.gitMode).toBe('gitignore');
    expect(fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8')).toContain(KIT_BLOCK_BEGIN);
  });

  it('skips git changes for old non-interactive git installs', async () => {
    fs.mkdirSync(path.join(tmpDir, '.git', 'info'), { recursive: true });
    seedProject(ORIGINAL_CONTENT);

    const update = requireUpdate();
    await update([]);

    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    expect(lock.gitMode).toBeUndefined();
    expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '.git', 'info', 'exclude'))).toBe(false);
    expect(console.log.mock.calls.map(c => c[0]).join('\n')).toContain('old lockfile has no saved git mode');
  });

  it('scaffolds new user-owned files once when they are missing', async () => {
    mockManifest.files.push({ path: 'user/new.md', ownership: 'user-owned' });
    writeTemplate('user/new.md', 'new user content');
    seedProject(ORIGINAL_CONTENT);

    const update = requireUpdate();
    await update([]);

    expect(fs.readFileSync(path.join(tmpDir, 'user', 'new.md'), 'utf8')).toBe('new user content');
    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    expect(lock.files['user/new.md']).toBeDefined();
  });

  it('does not overwrite existing new manifest paths without --force', async () => {
    mockManifest.files.push({ path: 'managed/new.md', ownership: 'kit-managed' });
    writeTemplate('managed/new.md', 'new managed content');
    seedProject(ORIGINAL_CONTENT);
    fs.writeFileSync(path.join(tmpDir, 'managed', 'new.md'), 'existing user content', 'utf8');

    const update = requireUpdate();
    await update([]);

    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'new.md'), 'utf8')).toBe('existing user content');
    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    expect(lock.files['managed/new.md'].hash).toBe(hash('new managed content'));
  });

  it('removes obsolete unmodified kit-managed files from disk and lockfile', async () => {
    seedProject(ORIGINAL_CONTENT);
    const obsoletePath = path.join(tmpDir, 'managed', 'obsolete.md');
    fs.writeFileSync(obsoletePath, 'obsolete kit content', 'utf8');
    const lockPath = path.join(tmpDir, LOCKFILE_NAME);
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.files['managed/obsolete.md'] = {
      ownership: 'kit-managed',
      hash: hash('obsolete kit content'),
    };
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');

    const update = requireUpdate();
    await update([]);

    expect(fs.existsSync(obsoletePath)).toBe(false);
    const nextLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    expect(nextLock.files['managed/obsolete.md']).toBeUndefined();
  });

  it('keeps obsolete locally modified kit-managed files but stops tracking them', async () => {
    seedProject(ORIGINAL_CONTENT);
    const obsoletePath = path.join(tmpDir, 'managed', 'obsolete.md');
    fs.writeFileSync(obsoletePath, 'user changed obsolete kit content', 'utf8');
    const lockPath = path.join(tmpDir, LOCKFILE_NAME);
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.files['managed/obsolete.md'] = {
      ownership: 'kit-managed',
      hash: hash('obsolete kit content'),
    };
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');

    const update = requireUpdate();
    await update([]);

    expect(fs.readFileSync(obsoletePath, 'utf8')).toBe('user changed obsolete kit content');
    const nextLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    expect(nextLock.files['managed/obsolete.md']).toBeUndefined();
    expect(console.log.mock.calls.map(c => c[0]).join('\n')).toContain('removed from kit, locally modified');
  });
});
