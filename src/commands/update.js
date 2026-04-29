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
const {
  GIT_MODE_EXCLUDE,
  GIT_MODE_IGNORE,
  GIT_MODE_TRACK,
  applyGitMode,
  deriveGitEntries,
  deriveKnownGitEntries,
  gitModeFromFlags,
  isGitRepo,
  normalizeGitMode,
  promptGitChoice,
} = require('../git-mode');

async function resolveUpdateGitMode(targetDir, manifest, lock, parsedFlags, dryRun) {
  const flagGitMode = gitModeFromFlags(parsedFlags);
  if (flagGitMode) { return { gitMode: flagGitMode, shouldApplyGitMode: !dryRun }; }

  const lockedGitMode = normalizeGitMode(lock.gitMode);
  if (lockedGitMode) { return { gitMode: lockedGitMode, shouldApplyGitMode: !dryRun }; }

  if (dryRun) {
    return { gitMode: null, shouldApplyGitMode: false, skippedMissingMode: false };
  }

  if (isGitRepo(targetDir) && process.stdin.isTTY) {
    console.log('');
    return {
      gitMode: await promptGitChoice(deriveGitEntries(manifest)),
      shouldApplyGitMode: true,
    };
  }

  if (isGitRepo(targetDir)) {
    return { gitMode: null, shouldApplyGitMode: false, skippedMissingMode: true };
  }

  return { gitMode: GIT_MODE_TRACK, shouldApplyGitMode: true };
}

function removeEmptyParents(targetDir, absPath) {
  let dir = path.dirname(absPath);
  while (dir !== targetDir && dir !== path.dirname(dir)) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
        continue;
      }
    } catch {
      // Directory cleanup is best-effort only.
    }
    break;
  }
}

/**
 * Update command — smart-update kit-managed files, skip user-owned.
 * @param {string[]} flags
 */
async function update(flags) {
  const parsedFlags = parseFlags(flags);
  const { force, dryRun } = parsedFlags;
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

  const newLockFiles = {};
  const gitResolution = await resolveUpdateGitMode(targetDir, manifest, lock, parsedFlags, dryRun);

  for (const entry of manifest.files) {
    const targetPath = path.join(targetDir, entry.path);
    const templatePath = getTemplatePath(entry.path);
    const lockMeta = lock.files[entry.path];
    const templateHash = hashFile(templatePath);

    // Existing user-owned files are never updated, but new user-owned manifest
    // entries are scaffolded once when the path is missing.
    if (entry.ownership === 'user-owned') {
      if (!lockMeta) {
        if (!fs.existsSync(targetPath)) {
          if (!dryRun) {
            const dir = path.dirname(targetPath);
            fs.mkdirSync(dir, { recursive: true });
            fs.copyFileSync(templatePath, targetPath);
            newLockFiles[entry.path] = {
              ownership: entry.ownership,
              hash: hashFile(targetPath),
            };
          }
          console.log(`${prefix}+     ${entry.path}  (created, user-owned)`);
          updated++;
        } else if (force) {
          if (!dryRun) {
            fs.copyFileSync(templatePath, targetPath);
            newLockFiles[entry.path] = {
              ownership: entry.ownership,
              hash: hashFile(targetPath),
            };
          }
          console.log(`${prefix}✓     ${entry.path}  (created, user-owned, forced)`);
          updated++;
        } else {
          newLockFiles[entry.path] = {
            ownership: entry.ownership,
            hash: templateHash,
          };
          console.log(`${prefix}⚠     ${entry.path}  (exists — skipped, use --force)`);
          warned++;
        }
      } else {
        newLockFiles[entry.path] = lockMeta;
      }
      userOwned++;
      continue;
    }

    // Kit-managed file: check if it exists and if it was modified
    if (!lockMeta && fs.existsSync(targetPath) && !force) {
      newLockFiles[entry.path] = {
        ownership: entry.ownership,
        hash: templateHash,
      };
      console.log(`${prefix}⚠     ${entry.path}  (exists — skipped, use --force)`);
      warned++;
      continue;
    }

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
    const lockedHash = lockMeta?.hash;

    // Already up-to-date
    if (currentHash === templateHash) {
      newLockFiles[entry.path] = {
        ownership: entry.ownership,
        hash: templateHash,
      };
      skipped++;
      continue;
    }

    // File was modified locally (hash differs from lock)
    if (lockedHash && currentHash !== lockedHash && !force) {
      console.log(`${prefix}⚠     ${entry.path}  (locally modified — skipped, use --force)`);
      newLockFiles[entry.path] = lockMeta;
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

  const manifestPaths = new Set((manifest.files || []).map((entry) => entry.path));
  for (const [filePath, meta] of Object.entries(lock.files)) {
    if (manifestPaths.has(filePath)) { continue; }

    const absPath = path.join(targetDir, filePath);
    if (!fs.existsSync(absPath)) { continue; }

    if (meta.ownership === 'user-owned') {
      console.log(`${prefix}skip  ${filePath}  (removed from kit, user-owned)`);
      skipped++;
      continue;
    }

    const locallyModified = meta.hash && hashFile(absPath) !== meta.hash;
    if (locallyModified && !force) {
      console.log(`${prefix}⚠     ${filePath}  (removed from kit, locally modified — kept)`);
      warned++;
      continue;
    }

    if (!dryRun) {
      fs.rmSync(absPath);
      removeEmptyParents(targetDir, absPath);
    }
    console.log(`${prefix}-     ${filePath}  (removed from kit)`);
    updated++;
  }

  let finalGitMode = gitResolution.gitMode;
  if (gitResolution.shouldApplyGitMode) {
    const result = applyGitMode(
      targetDir,
      gitResolution.gitMode,
      deriveGitEntries(manifest),
      deriveKnownGitEntries(manifest, lock),
    );
    finalGitMode = result.mode;
    if (result.skippedExclude) {
      console.log('  Note: --git-exclude skipped (not a git repository)');
    } else if (result.mode === GIT_MODE_EXCLUDE && result.applied) {
      console.log('  Git: paths written to .git/info/exclude (local only)');
    } else if (result.mode === GIT_MODE_IGNORE) {
      console.log('  Git: paths written to .gitignore');
    }
  }

  if (!dryRun) {
    const newLock = { ...lock, version, files: newLockFiles };
    if (finalGitMode) {
      newLock.gitMode = finalGitMode;
    } else {
      delete newLock.gitMode;
    }
    writeLockfile(targetDir, newLock);
  }

  console.log('');
  console.log(`  Done: ${updated} updated, ${skipped} up-to-date, ${warned} warnings, ${userOwned} user-owned`);
  if (warned > 0) {
    console.log('  Files with ⚠ were skipped. Use --force to overwrite them.');
  }
  if (gitResolution.skippedMissingMode) {
    console.log('  Git: skipped ignore/exclude changes because this old lockfile has no saved git mode.');
    console.log('  Run "copilot-workflow-kit update" in an interactive terminal to choose git handling.');
  }
  if (dryRun) {
    console.log('  This was a dry run — no files were modified.');
  }
  console.log('');
}

module.exports = update;
