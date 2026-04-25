'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { LOCKFILE_NAME } = require('../../src/utils');

let tmpDir;
let mockTemplateDir;
const originalCwd = process.cwd;

// Minimal 2-file manifest for testing
const mockManifest = {
  files: [
    { path: 'managed/file.md', ownership: 'kit-managed' },
    { path: 'user/file.md', ownership: 'user-owned' },
  ],
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-init-'));
  mockTemplateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-tpl-'));

  // Create template files
  fs.mkdirSync(path.join(mockTemplateDir, 'managed'), { recursive: true });
  fs.mkdirSync(path.join(mockTemplateDir, 'user'), { recursive: true });
  fs.writeFileSync(path.join(mockTemplateDir, 'managed', 'file.md'), 'managed content', 'utf8');
  fs.writeFileSync(path.join(mockTemplateDir, 'user', 'file.md'), 'user content', 'utf8');

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

function requireInit() {
  return require('../../src/commands/init');
}

describe('init command', () => {
  it('scaffolds all files and writes lockfile on first run', async () => {
    const init = requireInit();
    await init([]);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'user', 'file.md'))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, 'managed', 'file.md'), 'utf8')).toBe('managed content');

    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    expect(lock.version).toBe('2.0.0');
    expect(lock.files['managed/file.md'].ownership).toBe('kit-managed');
    expect(lock.files['user/file.md'].ownership).toBe('user-owned');
  });

  it('exits early if lockfile exists and --force is not passed', async () => {
    const { writeLockfile } = jest.requireActual('../../src/utils');
    writeLockfile(tmpDir, { version: '1.0.0', files: {} });

    const init = requireInit();
    await init([]);

    // Files should NOT be scaffolded
    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(false);
    const output = console.log.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('already initialized');
  });

  it('re-scaffolds with --force even if lockfile exists', async () => {
    const { writeLockfile } = jest.requireActual('../../src/utils');
    writeLockfile(tmpDir, { version: '1.0.0', files: {} });

    const init = requireInit();
    await init(['--force']);

    expect(fs.existsSync(path.join(tmpDir, 'managed', 'file.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'user', 'file.md'))).toBe(true);
  });

  it('skips existing files without --force but still tracks them in lockfile', async () => {
    // Pre-create one file with different content
    fs.mkdirSync(path.join(tmpDir, 'managed'), { recursive: true });
    const targetPath = path.join(tmpDir, 'managed', 'file.md');
    fs.writeFileSync(targetPath, 'my custom content', 'utf8');

    const init = requireInit();
    await init([]);

    // File should keep custom content (not overwritten)
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('my custom content');

    // But kit-managed skipped files should track the template baseline, so
    // future updates preserve the existing file as locally modified.
    const lock = JSON.parse(fs.readFileSync(path.join(tmpDir, LOCKFILE_NAME), 'utf8'));
    const { hashFile } = jest.requireActual('../../src/utils');
    const templatePath = path.join(mockTemplateDir, 'managed', 'file.md');
    expect(lock.files['managed/file.md']).toBeDefined();
    expect(lock.files['managed/file.md'].ownership).toBe('kit-managed');
    expect(lock.files['managed/file.md'].hash).toBe(hashFile(templatePath));
    expect(lock.files['managed/file.md'].hash).not.toBe(hashFile(targetPath));
  });

  describe('git handling', () => {
    it('--git-exclude writes to .git/info/exclude when in a git repo', async () => {
      fs.mkdirSync(path.join(tmpDir, '.git', 'info'), { recursive: true });

      const init = requireInit();
      await init(['--git-exclude']);

      const excludePath = path.join(tmpDir, '.git', 'info', 'exclude');
      expect(fs.existsSync(excludePath)).toBe(true);
      const content = fs.readFileSync(excludePath, 'utf8');
      expect(content).toContain('# copilot-workflow-kit');
      expect(content).toContain('.copilot-kit.lock');
    });

    it('--git-exclude skips and warns when not in a git repo', async () => {
      const init = requireInit();
      await init(['--git-exclude']);

      const output = console.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('not a git repository');
      expect(output).toContain('commit this file');
    });

    it('--gitignore appends to .gitignore', async () => {
      const init = requireInit();
      await init(['--gitignore']);

      const gitignorePath = path.join(tmpDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('# copilot-workflow-kit');
      expect(content).toContain('managed/file.md');
      expect(content).toContain('user/file.md');
      expect(content).toContain('.copilot-kit.lock');
      const lines = content.split('\n');
      expect(lines).not.toContain('managed/');
      expect(lines).not.toContain('user/');
    });

    it('--gitignore does not hide unrelated sibling files', async () => {
      execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
      const init = requireInit();
      await init(['--gitignore']);

      fs.writeFileSync(path.join(tmpDir, 'managed', 'other.md'), 'unrelated', 'utf8');

      expect(() => execFileSync('git', ['check-ignore', 'managed/file.md'], { cwd: tmpDir })).not.toThrow();
      expect(() => execFileSync('git', ['check-ignore', 'managed/other.md'], { cwd: tmpDir })).toThrow();
    });

    it('--gitignore appends to existing .gitignore without duplicating', async () => {
      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n', 'utf8');

      const init = requireInit();
      await init(['--gitignore']);

      const content = fs.readFileSync(gitignorePath, 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('# copilot-workflow-kit');

      // Run again — should not duplicate the block
      jest.resetModules();
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
      const init2 = require('../../src/commands/init');
      await init2(['--gitignore']);

      const content2 = fs.readFileSync(gitignorePath, 'utf8');
      expect(content2.split('# copilot-workflow-kit').length - 1).toBe(1);
    });

    it('--git-track shows commit lockfile message and writes no git files', async () => {
      const init = requireInit();
      await init(['--git-track']);

      const output = console.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('commit this file');
      expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, '.git'))).toBe(false);
    });

    it('no git flag and non-TTY defaults to git-track: writes no git files', async () => {
      const init = requireInit();
      await init([]);

      const output = console.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('commit this file');
      expect(fs.existsSync(path.join(tmpDir, '.gitignore'))).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, '.git'))).toBe(false);
    });
  });
});
