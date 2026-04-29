'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  KIT_BLOCK_BEGIN,
  KIT_BLOCK_END,
  removeKitBlock,
  stripKitBlocks,
  writeKitBlock,
} = require('../../src/git-mode');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-git-mode-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('git mode helpers', () => {
  it('does not rewrite files that have no kit block', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/', 'utf8');

    expect(removeKitBlock(gitignorePath, ['managed/file.md'])).toBe(false);
    expect(fs.readFileSync(gitignorePath, 'utf8')).toBe('node_modules/');
  });

  it('replaces legacy kit blocks with bounded blocks', () => {
    const gitignorePath = path.join(tmpDir, '.gitignore');
    fs.writeFileSync(gitignorePath, [
      'node_modules/',
      '# copilot-workflow-kit',
      'managed/file.md',
      '.copilot-kit.lock',
      'dist/',
      '',
    ].join('\n'), 'utf8');

    writeKitBlock(gitignorePath, ['managed/new.md', '.copilot-kit.lock'], [
      'managed/file.md',
      'managed/new.md',
      '.copilot-kit.lock',
    ]);

    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).toContain(KIT_BLOCK_BEGIN);
    expect(content).toContain(KIT_BLOCK_END);
    expect(content).toContain('managed/new.md');
    expect(content).not.toContain('managed/file.md');
  });

  it('strips bounded kit blocks and preserves unrelated content', () => {
    const content = [
      'node_modules/',
      KIT_BLOCK_BEGIN,
      'managed/file.md',
      '.copilot-kit.lock',
      KIT_BLOCK_END,
      'dist/',
      '',
    ].join('\n');

    expect(stripKitBlocks(content, ['managed/file.md', '.copilot-kit.lock'])).toBe('node_modules/\ndist/\n');
  });
});
