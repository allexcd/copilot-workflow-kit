'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadManifest,
  getKitVersion,
  getTemplatePath,
  hashFile,
  readLockfile,
} = require('../utils');

/**
 * Status command — show the state of each kit file.
 * @param {string[]} flags
 */
async function status(flags) {
  const targetDir = process.cwd();
  const manifest = loadManifest();
  const version = getKitVersion();
  const lock = readLockfile(targetDir);

  if (!lock) {
    console.log('\n  No .copilot-kit.lock found. Run "copilot-workflow-kit init" first.\n');
    return;
  }

  console.log('');
  console.log('  copilot-workflow-kit status');
  console.log('  ===========================');
  console.log(`  Installed: v${lock.version} | Kit: v${version}`);
  console.log('');

  let upToDate = 0;
  let modified = 0;
  let outdated = 0;
  let missing = 0;
  let userOwnedCount = 0;

  for (const entry of manifest.files) {
    const targetPath = path.join(targetDir, entry.path);
    const templatePath = getTemplatePath(entry.path);

    // User-owned files
    if (entry.ownership === 'user-owned') {
      if (fs.existsSync(targetPath)) {
        console.log(`  ●     ${entry.path}  (user-owned)`);
      } else {
        console.log(`  ○     ${entry.path}  (user-owned, missing)`);
      }
      userOwnedCount++;
      continue;
    }

    // Kit-managed files
    if (!fs.existsSync(targetPath)) {
      console.log(`  ✗     ${entry.path}  (missing)`);
      missing++;
      continue;
    }

    const currentHash = hashFile(targetPath);
    const lockedHash = lock.files[entry.path]?.hash;
    const templateHash = hashFile(templatePath);

    if (currentHash === templateHash) {
      console.log(`  ✓     ${entry.path}`);
      upToDate++;
    } else if (lockedHash && currentHash !== lockedHash) {
      console.log(`  ⚠     ${entry.path}  (locally modified)`);
      modified++;
    } else {
      console.log(`  ✗     ${entry.path}  (outdated)`);
      outdated++;
    }
  }

  console.log('');
  console.log(`  ✓ ${upToDate} up-to-date | ⚠ ${modified} modified | ✗ ${outdated} outdated | ${missing} missing | ● ${userOwnedCount} user-owned`);
  if (outdated > 0 || missing > 0) {
    console.log('  Run "copilot-workflow-kit update" to update kit-managed files.');
  }
  console.log('');
}

module.exports = status;
