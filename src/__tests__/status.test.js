'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

let tmpDir;
let mockTemplateDir;
const originalCwd = process.cwd;

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const TEMPLATE_CONTENT = 'template content';

const mockManifest = {
  files: [
    { path: 'managed/file.md', ownership: 'kit-managed' },
    { path: 'user/file.md', ownership: 'user-owned' },
  ],
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-status-'));
  mockTemplateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-tpl-'));

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

function requireStatus() {
  return require('../../src/commands/status');
}

function seedLock(files) {
  const { writeLockfile } = jest.requireActual('../../src/utils');
  writeLockfile(tmpDir, { version: '1.0.0', files });
}

function getOutput() {
  return console.log.mock.calls.map(c => c[0]).join('\n');
}

describe('status command', () => {
  it('exits early if no lockfile exists', async () => {
    const status = requireStatus();
    await status([]);

    expect(getOutput()).toContain('No .copilot-kit.lock found');
  });

  it('shows kit-managed file as up-to-date when hash matches template', async () => {
    fs.mkdirSync(path.join(tmpDir, 'managed'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), TEMPLATE_CONTENT, 'utf8');
    seedLock({
      'managed/file.md': { ownership: 'kit-managed', hash: hash(TEMPLATE_CONTENT) },
    });

    const status = requireStatus();
    await status([]);

    expect(getOutput()).toContain('✓');
    expect(getOutput()).toContain('managed/file.md');
  });

  it('shows kit-managed file as locally modified when hash differs from lock', async () => {
    const originalContent = 'original content';
    fs.mkdirSync(path.join(tmpDir, 'managed'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'managed', 'file.md'), 'user changed this', 'utf8');
    seedLock({
      'managed/file.md': { ownership: 'kit-managed', hash: hash(originalContent) },
    });

    const status = requireStatus();
    await status([]);

    expect(getOutput()).toContain('⚠');
    expect(getOutput()).toContain('locally modified');
  });

  it('shows kit-managed file as missing when file does not exist', async () => {
    seedLock({
      'managed/file.md': { ownership: 'kit-managed', hash: hash('something') },
    });

    const status = requireStatus();
    await status([]);

    expect(getOutput()).toContain('✗');
    expect(getOutput()).toContain('missing');
  });

  it('shows user-owned file with correct status for existing and missing', async () => {
    fs.mkdirSync(path.join(tmpDir, 'user'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'user', 'file.md'), 'user content', 'utf8');
    seedLock({
      'user/file.md': { ownership: 'user-owned', hash: hash('user content') },
    });

    const status = requireStatus();
    await status([]);

    expect(getOutput()).toContain('●');
    expect(getOutput()).toContain('user-owned');
  });
});
