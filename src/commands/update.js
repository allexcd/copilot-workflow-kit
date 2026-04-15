'use strict';

const fs = require('fs');
const path = require('path');
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
 * Update command — smart-update kit-managed files, skip user-owned.
 * @param {string[]} flags
 */
async function update(flags) {
  const { force, dryRun } = parseFlags(flags);
  const targetDir = process.cwd();
  const manifest = loadManifest();
  const version = getKitVersion();
  const lock = readLockfile(targetDir);

  if (!lock) {
    console.log('\n  No .copilot-kit.lock found. Run "copilot-workflow-kit init" first.\n');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let warned = 0;
  let userOwned = 0;

  const prefix = dryRun ? '  (dry-run) ' : '  ';

  console.log('');
  console.log(`  copilot-workflow-kit update${dryRun ? ' --dry-run' : ''}`);
  console.log('  ============================');
  console.log(`  Installed: v${lock.version} → Available: v${version}`);
  console.log('');

  const newLockFiles = { ...lock.files };

  for (const entry of manifest.files) {
    const targetPath = path.join(targetDir, entry.path);
    const templatePath = getTemplatePath(entry.path);

    // User-owned files are never updated
    if (entry.ownership === 'user-owned') {
      userOwned++;
      continue;
    }

    // Kit-managed file: check if it exists and if it was modified
    if (!fs.existsSync(targetPath)) {
      // File was deleted by user — re-create it
      if (!dryRun) {
        const dir = path.dirname(targetPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(templatePath, targetPath);
        newLockFiles[entry.path] = {
          ownership: entry.ownership,
          hash: hashFile(targetPath),
        };
      }
      console.log(`${prefix}+     ${entry.path}  (restored)`);
      updated++;
      continue;
    }

    const currentHash = hashFile(targetPath);
    const lockedHash = lock.files[entry.path]?.hash;
    const templateHash = hashFile(templatePath);

    // Already up-to-date
    if (currentHash === templateHash) {
      skipped++;
      continue;
    }

    // File was modified locally (hash differs from lock)
    if (lockedHash && currentHash !== lockedHash && !force) {
      console.log(`${prefix}⚠     ${entry.path}  (locally modified — skipped, use --force)`);
      warned++;
      continue;
    }

    // Safe to update: file matches lock hash or --force
    if (!dryRun) {
      fs.copyFileSync(templatePath, targetPath);
      newLockFiles[entry.path] = {
        ownership: entry.ownership,
        hash: hashFile(targetPath),
      };
    }
    console.log(`${prefix}✓     ${entry.path}  (updated)`);
    updated++;
  }

  if (!dryRun) {
    writeLockfile(targetDir, { version, files: newLockFiles });
  }

  console.log('');
  console.log(`  Done: ${updated} updated, ${skipped} up-to-date, ${warned} warnings, ${userOwned} user-owned (skipped)`);
  if (warned > 0) {
    console.log('  Files with ⚠ were locally modified. Use --force to overwrite them.');
  }
  if (dryRun) {
    console.log('  This was a dry run — no files were modified.');
  }
  console.log('');
}

module.exports = update;
