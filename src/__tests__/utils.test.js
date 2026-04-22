'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  LOCKFILE_NAME,
  readLockfile,
  writeLockfile,
  parseFlags,
} = require('../../src/utils');

describe('parseFlags', () => {
  it('returns all false for empty flags', () => {
    expect(parseFlags([])).toEqual({ force: false, dryRun: false, all: false, gitExclude: false, gitignore: false, gitTrack: false });
  });

  it('detects --force', () => {
    expect(parseFlags(['--force']).force).toBe(true);
  });

  it('detects -f shorthand for force', () => {
    expect(parseFlags(['-f']).force).toBe(true);
  });

  it('detects --dry-run', () => {
    expect(parseFlags(['--dry-run']).dryRun).toBe(true);
  });

  it('detects --all', () => {
    expect(parseFlags(['--all']).all).toBe(true);
  });

  it('detects --git-exclude', () => {
    expect(parseFlags(['--git-exclude']).gitExclude).toBe(true);
  });

  it('detects --gitignore', () => {
    expect(parseFlags(['--gitignore']).gitignore).toBe(true);
  });

  it('detects --git-track', () => {
    expect(parseFlags(['--git-track']).gitTrack).toBe(true);
  });
});

describe('readLockfile / writeLockfile roundtrip', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no lockfile exists, and roundtrips data correctly after write', () => {
    expect(readLockfile(tmpDir)).toBe(null);

    const data = {
      version: '1.0.0',
      files: {
        'some/file.md': { ownership: 'kit-managed', hash: 'abc123' },
      },
    };
    writeLockfile(tmpDir, data);
    expect(fs.existsSync(path.join(tmpDir, LOCKFILE_NAME))).toBe(true);
    expect(readLockfile(tmpDir)).toEqual(data);
  });
});
