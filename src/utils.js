'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOCKFILE_NAME = '.copilot-kit.lock';

/**
 * Load the kit manifest from the package.
 * @returns {{ files: Array<{ path: string, ownership: string }> }}
 */
function loadManifest() {
  const manifestPath = path.join(__dirname, '..', 'kit-manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * Get the kit version from package.json.
 * @returns {string}
 */
function getKitVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

/**
 * Get the path to a template file bundled with the package.
 * @param {string} relativePath
 * @returns {string}
 */
function getTemplatePath(relativePath) {
  return path.join(__dirname, '..', 'templates', relativePath);
}

/**
 * SHA-256 hash of file contents.
 * @param {string} filePath
 * @returns {string}
 */
function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Read the lockfile from the target directory.
 * @param {string} targetDir
 * @returns {{ version: string, files: Record<string, { ownership: string, hash: string }> } | null}
 */
function readLockfile(targetDir) {
  const lockPath = path.join(targetDir, LOCKFILE_NAME);
  if (!fs.existsSync(lockPath)) {return null;}
  return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
}

/**
 * Write the lockfile to the target directory.
 * @param {string} targetDir
 * @param {{ version: string, files: Record<string, { ownership: string, hash: string }> }} lockData
 */
function writeLockfile(targetDir, lockData) {
  const lockPath = path.join(targetDir, LOCKFILE_NAME);
  fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + '\n', 'utf8');
}

/**
 * Parse CLI flags.
 * @param {string[]} flags
 * @returns {{ force: boolean, dryRun: boolean, all: boolean, gitExclude: boolean, gitignore: boolean, gitTrack: boolean }}
 */
function parseFlags(flags) {
  return {
    force: flags.includes('--force') || flags.includes('-f'),
    dryRun: flags.includes('--dry-run'),
    all: flags.includes('--all'),
    gitExclude: flags.includes('--git-exclude'),
    gitignore: flags.includes('--gitignore'),
    gitTrack: flags.includes('--git-track'),
  };
}

module.exports = {
  LOCKFILE_NAME,
  loadManifest,
  getKitVersion,
  getTemplatePath,
  hashFile,
  readLockfile,
  writeLockfile,
  parseFlags,
};
