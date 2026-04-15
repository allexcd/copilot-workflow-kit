'use strict';

const fs = require('fs');
const path = require('path');
const {
  readLockfile,
  parseFlags,
} = require('../utils');

/**
 * Uninstall command — remove kit-installed files from the current project.
 *
 * By default only kit-managed files are removed. Pass --all to also remove
 * user-owned files. The lockfile is removed last.
 *
 * @param {string[]} flags
 */
async function uninstall(flags) {
  const { force: _force, dryRun, all } = parseFlags(flags);
  const targetDir = process.cwd();
  const lock = readLockfile(targetDir);

  console.log('');
  console.log('  copilot-workflow-kit uninstall');
  console.log('  ==============================');
  console.log('');

  if (!lock) {
    console.log('  Nothing to uninstall — no lockfile found (.copilot-kit.lock).\n');
    return;
  }

  const entries = Object.entries(lock.files);
  let removed = 0;
  let skipped = 0;
  const removedDirs = new Set();

  for (const [filePath, meta] of entries) {
    const absPath = path.join(targetDir, filePath);
    const ownership = meta.ownership;

    if (ownership === 'user-owned' && !all) {
      console.log(`  skip  ${filePath}  (user-owned, use --all to remove)`);
      skipped++;
      continue;
    }

    if (!fs.existsSync(absPath)) {
      console.log(`  skip  ${filePath}  (not found)`);
      skipped++;
      continue;
    }

    const label = ownership === 'user-owned' ? '(user-owned)' : '(kit-managed)';
    if (dryRun) {
      console.log(`  would remove  ${filePath}  ${label}`);
    } else {
      fs.rmSync(absPath);
      console.log(`  ✓  removed  ${filePath}  ${label}`);
      removedDirs.add(path.dirname(absPath));
    }
    removed++;
  }

  // Clean up directories that are now empty, deepest first
  if (!dryRun && removedDirs.size > 0) {
    const sorted = [...removedDirs].sort((a, b) => b.length - a.length);
    for (const dir of sorted) {
      try {
        const entries = fs.readdirSync(dir);
        if (entries.length === 0 && dir !== targetDir) {
          fs.rmdirSync(dir);
          // Also check the parent
          const parent = path.dirname(dir);
          if (parent !== targetDir && parent !== dir) {
            removedDirs.add(parent);
          }
        }
      } catch {
        // ignore — directory may have already been removed or be non-empty
      }
    }
  }

  // Remove the lockfile
  const lockPath = path.join(targetDir, '.copilot-kit.lock');
  if (!dryRun) {
    fs.rmSync(lockPath);
    console.log(`  ✓  removed  .copilot-kit.lock`);
  } else {
    console.log(`  would remove  .copilot-kit.lock`);
  }

  console.log('');
  if (dryRun) {
    console.log(`  Dry run: ${removed} file(s) would be removed, ${skipped} skipped`);
  } else {
    console.log(`  Done: ${removed} file(s) removed, ${skipped} skipped`);
  }
  if (skipped > 0 && !all) {
    console.log('  Run with --all to also remove user-owned files');
  }
  console.log('');
}

module.exports = uninstall;
