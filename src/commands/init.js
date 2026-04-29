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
  promptGitChoice,
} = require('../git-mode');

/**
 * Init command — scaffold all kit files into the current project.
 * @param {string[]} flags
 */
async function init(flags) {
  const parsedFlags = parseFlags(flags);
  const { force } = parsedFlags;
  const flagGitMode = gitModeFromFlags(parsedFlags);
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
      lockFiles[entry.path] = {
        ownership: entry.ownership,
        hash: entry.ownership === 'kit-managed' ? hashFile(templatePath) : hashFile(targetPath),
      };
      continue;
    }

    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(templatePath, targetPath);
    const hash = hashFile(targetPath);

    lockFiles[entry.path] = { ownership: entry.ownership, hash };

    const label = entry.ownership === 'user-owned' ? '(user-owned)' : '(kit-managed)';
    console.log(`  ✓     ${entry.path}  ${label}`);
    installed++;
  }

  // Determine git handling
  const inGitRepo = isGitRepo(targetDir);
  const gitEntries = deriveGitEntries(manifest);
  let gitChoice = flagGitMode;

  if (!gitChoice && inGitRepo && process.stdin.isTTY) {
    console.log('');
    gitChoice = await promptGitChoice(gitEntries);
  } else if (!gitChoice) {
    gitChoice = GIT_MODE_TRACK;
  }

  const gitResult = applyGitMode(targetDir, gitChoice, gitEntries, deriveKnownGitEntries(manifest, null));
  if (gitResult.skippedExclude) {
    console.log('  Note: --git-exclude skipped (not a git repository)');
  }

  writeLockfile(targetDir, { version, gitMode: gitResult.mode, files: lockFiles });

  console.log('');
  console.log(`  Done: ${installed} installed, ${skipped} skipped`);
  console.log(`  Kit version: ${version}`);

  if (gitResult.mode === GIT_MODE_EXCLUDE && gitResult.applied) {
    console.log('  Git: paths written to .git/info/exclude (local only)');
  } else if (gitResult.mode === GIT_MODE_IGNORE) {
    console.log('  Git: paths written to .gitignore');
  } else {
    console.log('  Lockfile: .copilot-kit.lock (commit this file)');
  }

  if (skipped > 0 && !force) {
    console.log('  Run with --force to overwrite existing files');
  }
  console.log('');
}

module.exports = init;
