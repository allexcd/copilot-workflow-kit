'use strict';

const { simpleDiff } = require('../../src/commands/diff');

describe('simpleDiff', () => {
  it('returns empty string when both inputs are identical', () => {
    const content = 'line one\nline two\nline three';
    expect(simpleDiff(content, content, 'file.md')).toBe('');
  });

  it('shows added lines when target is longer', () => {
    const current = 'line one';
    const template = 'line one\nline two\nline three';
    const result = simpleDiff(current, template, 'file.md');
    expect(result).toContain('+line two');
    expect(result).toContain('+line three');
    expect(result).not.toContain('-line one');
  });

  it('shows removed lines when current is longer', () => {
    const current = 'line one\nline two\nline three';
    const template = 'line one';
    const result = simpleDiff(current, template, 'file.md');
    expect(result).toContain('-line two');
    expect(result).toContain('-line three');
    expect(result).not.toContain('+line one');
  });

  it('shows both additions and removals for changed lines', () => {
    const current = 'hello\nworld';
    const template = 'hello\nearth';
    const result = simpleDiff(current, template, 'file.md');
    expect(result).toContain('-world');
    expect(result).toContain('+earth');
    expect(result).toContain(' hello');
  });

  it('includes unified diff headers with label', () => {
    const result = simpleDiff('old', 'new', 'my/file.md');
    expect(result).toContain('--- a/my/file.md');
    expect(result).toContain('+++ b/my/file.md');
  });

  it('handles completely different content', () => {
    const current = 'old line 1\nold line 2';
    const template = 'new line 1\nnew line 2';
    const result = simpleDiff(current, template, 'file.md');
    expect(result).toContain('-old line 1');
    expect(result).toContain('+new line 1');
    expect(result).toContain('-old line 2');
    expect(result).toContain('+new line 2');
  });
});
