'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  loadManifest,
  getKitVersion,
  getTemplatePath,
  hashFile,
  readLockfile,
  writeLockfile,
  parseFlags,
} = require('../utils');

function isGitRepo(targetDir) {
  return fs.existsSync(path.join(targetDir, '.git'));
}

function deriveGitEntries(manifest) {
  const entries = new Set();
  for (const file of manifest.files) {
    entries.add(file.path);
  }
  entries.add('.copilot-kit.lock');
  return Array.from(entries);
}

function promptGitChoice(entries) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log('  How should git handle the installed files?');
    console.log('');
    console.log('  Paths affected:');
    entries.forEach((e) => console.log(`    ${e}`));
    console.log('');
    console.log('  [1] Exclude locally   — write to .git/info/exclude (your clone only)');
    console.log('  [2] Add to .gitignore — shared with the team via .gitignore');
    console.log('  [3] Track in git      — commit files with the repo');
    console.log('');

    rl.question('  Choice [1/2/3]: ', (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === '1') { resolve('git-exclude'); }
      else if (choice === '2') { resolve('gitignore'); }
      else { resolve('git-track'); }
    });
  });
}

function applyGitExclude(targetDir, entries) {
  const excludePath = path.join(targetDir, '.git', 'info', 'exclude');
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  const marker = '# copilot-workflow-kit';
  const existing = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
  if (!existing.includes(marker)) {
    fs.appendFileSync(excludePath, `\n${marker}\n${entries.join('\n')}\n`, 'utf8');
  }
}

function applyGitignore(targetDir, entries) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const marker = '# copilot-workflow-kit';
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!existing.includes(marker)) {
    fs.appendFileSync(gitignorePath, `\n${marker}\n${entries.join('\n')}\n`, 'utf8');
  }
}

/**
 * Init command — scaffold all kit files into the current project.
 * @param {string[]} flags
 */
async function init(flags) {
  const { force, gitExclude, gitignore, gitTrack } = parseFlags(flags);
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

  writeLockfile(targetDir, { version, files: lockFiles });

  // Determine git handling
  const inGitRepo = isGitRepo(targetDir);
  let gitChoice = null;

  if (gitExclude) {
    gitChoice = 'git-exclude';
  } else if (gitignore) {
    gitChoice = 'gitignore';
  } else if (gitTrack) {
    gitChoice = 'git-track';
  } else if (inGitRepo && process.stdin.isTTY) {
    console.log('');
    gitChoice = await promptGitChoice(deriveGitEntries(manifest));
  }

  if (gitChoice === 'git-exclude') {
    if (inGitRepo) {
      applyGitExclude(targetDir, deriveGitEntries(manifest));
    } else {
      console.log('  Note: --git-exclude skipped (not a git repository)');
      gitChoice = 'git-track';
    }
  } else if (gitChoice === 'gitignore') {
    applyGitignore(targetDir, deriveGitEntries(manifest));
  }

  console.log('');
  console.log(`  Done: ${installed} installed, ${skipped} skipped`);
  console.log(`  Kit version: ${version}`);

  if (gitChoice === 'git-exclude') {
    console.log('  Git: paths written to .git/info/exclude (local only)');
  } else if (gitChoice === 'gitignore') {
    console.log('  Git: paths appended to .gitignore');
  } else {
    console.log('  Lockfile: .copilot-kit.lock (commit this file)');
  }

  if (skipped > 0 && !force) {
    console.log('  Run with --force to overwrite existing files');
  }
  console.log('');
}

module.exports = init;
