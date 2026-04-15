'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  loadManifest,
  getKitVersion,
  getTemplatePath,
  hashFile,
  readLockfile,
  writeLockfile,
  parseFlags,
} = require('../utils');

/**
 * Init command — scaffold all kit files into the current project.
 * @param {string[]} flags
 */
async function init(flags) {
  const { force } = parseFlags(flags);
  const targetDir = process.cwd();
  const manifest = loadManifest();
  const version = getKitVersion();
  const existingLock = readLockfile(targetDir);

  if (existingLock && !force) {
    console.log(`\n  Kit already initialized (v${existingLock.version}).`);
    console.log('  Run "copilot-workflow-kit update" to update kit-managed files.');
    console.log('  Run "copilot-workflow-kit init --force" to re-scaffold all files.\n');
    return;
  }

  let installed = 0;
  let skipped = 0;
  const lockFiles = {};

  console.log('');
  console.log('  copilot-workflow-kit init');
  console.log('  ========================');
  console.log('');

  for (const entry of manifest.files) {
    const targetPath = path.join(targetDir, entry.path);
    const templatePath = getTemplatePath(entry.path);

    if (fs.existsSync(targetPath) && !force) {
      console.log(`  skip  ${entry.path}  (exists, ${entry.ownership})`);
      skipped++;
      // Still track existing file in lockfile
      lockFiles[entry.path] = {
        ownership: entry.ownership,
        hash: hashFile(targetPath),
      };
      continue;
    }

    // Ensure target directory exists
    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });

    // Copy template to target
    fs.copyFileSync(templatePath, targetPath);
    const hash = hashFile(targetPath);

    lockFiles[entry.path] = {
      ownership: entry.ownership,
      hash,
    };

    const label = entry.ownership === 'user-owned' ? '(user-owned)' : '(kit-managed)';
    console.log(`  ✓     ${entry.path}  ${label}`);

    // Ensure hook is executable when scaffolded
    if (entry.path === '.githooks/pre-push' && !force) {
      try {
        fs.chmodSync(targetPath, 0o755);
      } catch {
        // non-fatal
      }
    }

    installed++;
  }

  // Configure local Git hooks path for pre-push branch name validation
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    try {
      execSync('git config core.hooksPath .githooks', { cwd: targetDir, stdio: 'ignore' });
      console.log('  ✓     git hooks enabled via core.hooksPath=.githooks');
    } catch {
      console.log('  ⚠     could not set git hooksPath automatically (run: git config core.hooksPath .githooks)');
    }
  }

  // Write lockfile
  writeLockfile(targetDir, { version, files: lockFiles });

  console.log('');
  console.log(`  Done: ${installed} installed, ${skipped} skipped`);
  console.log(`  Kit version: ${version}`);
  console.log(`  Lockfile: .copilot-kit.lock (commit this file)`);
  if (skipped > 0 && !force) {
    console.log('  Run with --force to overwrite existing files');
  }
  console.log('');
}

module.exports = init;
