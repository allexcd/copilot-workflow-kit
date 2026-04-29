'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const GIT_MODE_EXCLUDE = 'git-exclude';
const GIT_MODE_IGNORE = 'gitignore';
const GIT_MODE_TRACK = 'git-track';
const VALID_GIT_MODES = new Set([GIT_MODE_EXCLUDE, GIT_MODE_IGNORE, GIT_MODE_TRACK]);

const KIT_BLOCK_BEGIN = '# copilot-workflow-kit begin';
const KIT_BLOCK_END = '# copilot-workflow-kit end';
const LEGACY_KIT_MARKER = '# copilot-workflow-kit';

function isGitRepo(targetDir) {
  return fs.existsSync(path.join(targetDir, '.git'));
}

function deriveGitEntries(manifest) {
  const entries = new Set();
  for (const file of manifest.files || []) {
    entries.add(file.path);
  }
  entries.add('.copilot-kit.lock');
  return Array.from(entries);
}

function deriveKnownGitEntries(manifest, lock) {
  const entries = new Set(deriveGitEntries(manifest));
  for (const filePath of Object.keys(lock?.files || {})) {
    entries.add(filePath);
  }
  entries.add('.copilot-kit.lock');
  return Array.from(entries);
}

function gitModeFromFlags({ gitExclude, gitignore, gitTrack }) {
  const choices = [];
  if (gitExclude) { choices.push(GIT_MODE_EXCLUDE); }
  if (gitignore) { choices.push(GIT_MODE_IGNORE); }
  if (gitTrack) { choices.push(GIT_MODE_TRACK); }

  if (choices.length > 1) {
    throw new Error('Choose only one git handling flag: --git-exclude, --gitignore, or --git-track');
  }
  return choices[0] || null;
}

function normalizeGitMode(gitMode) {
  if (!gitMode) { return null; }
  if (!VALID_GIT_MODES.has(gitMode)) {
    throw new Error(`Invalid git mode in .copilot-kit.lock: ${gitMode}`);
  }
  return gitMode;
}

function promptGitChoice(entries) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log('  How should git handle the installed files?');
    console.log('');
    console.log('  Paths affected:');
    entries.forEach((entry) => console.log(`    ${entry}`));
    console.log('');
    console.log('  [1] Exclude locally   — write to .git/info/exclude (your clone only)');
    console.log('  [2] Add to .gitignore — shared with the team via .gitignore');
    console.log('  [3] Track in git      — commit files with the repo');
    console.log('');

    rl.question('  Choice [1/2/3]: ', (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === '1') { resolve(GIT_MODE_EXCLUDE); }
      else if (choice === '2') { resolve(GIT_MODE_IGNORE); }
      else { resolve(GIT_MODE_TRACK); }
    });
  });
}

function stripKitBlocks(content, knownEntries) {
  if (!content) { return ''; }

  const known = new Set(knownEntries);
  const lines = content.split(/\r?\n/);
  const output = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === KIT_BLOCK_BEGIN) {
      while (i < lines.length && lines[i].trim() !== KIT_BLOCK_END) {
        i++;
      }
      continue;
    }

    if (trimmed === LEGACY_KIT_MARKER) {
      i++;
      while (i < lines.length) {
        const candidate = lines[i].trim();
        if (candidate === '' || known.has(candidate)) {
          i++;
          continue;
        }
        break;
      }
      i--;
      continue;
    }

    output.push(line);
  }

  let cleaned = output.join('\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/g, '\n');
  return cleaned.trim() === '' ? '' : cleaned;
}

function writeKitBlock(filePath, entries, knownEntries) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const cleaned = stripKitBlocks(existing, knownEntries);
  const block = `${KIT_BLOCK_BEGIN}\n${entries.join('\n')}\n${KIT_BLOCK_END}\n`;
  const next = cleaned ? `${cleaned.replace(/\n+$/g, '\n')}\n${block}` : block;
  fs.writeFileSync(filePath, next, 'utf8');
}

function removeKitBlock(filePath, knownEntries) {
  if (!fs.existsSync(filePath)) { return false; }
  const existing = fs.readFileSync(filePath, 'utf8');
  const hasKitBlock = existing
    .split(/\r?\n/)
    .some((line) => [KIT_BLOCK_BEGIN, LEGACY_KIT_MARKER].includes(line.trim()));
  if (!hasKitBlock) { return false; }

  const next = stripKitBlocks(existing, knownEntries);
  if (next === existing) { return false; }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function applyGitMode(targetDir, gitMode, entries, knownEntries) {
  const mode = normalizeGitMode(gitMode) || GIT_MODE_TRACK;

  if (mode === GIT_MODE_EXCLUDE) {
    if (!isGitRepo(targetDir)) {
      return { mode: GIT_MODE_TRACK, applied: false, skippedExclude: true };
    }

    writeKitBlock(path.join(targetDir, '.git', 'info', 'exclude'), entries, knownEntries);
    return { mode, applied: true };
  }

  if (mode === GIT_MODE_IGNORE) {
    writeKitBlock(path.join(targetDir, '.gitignore'), entries, knownEntries);
    return { mode, applied: true };
  }

  return { mode, applied: false };
}

function removeGitModeBlocks(targetDir, knownEntries) {
  return {
    gitignore: removeKitBlock(path.join(targetDir, '.gitignore'), knownEntries),
    gitExclude: removeKitBlock(path.join(targetDir, '.git', 'info', 'exclude'), knownEntries),
  };
}

module.exports = {
  GIT_MODE_EXCLUDE,
  GIT_MODE_IGNORE,
  GIT_MODE_TRACK,
  VALID_GIT_MODES,
  KIT_BLOCK_BEGIN,
  KIT_BLOCK_END,
  LEGACY_KIT_MARKER,
  isGitRepo,
  deriveGitEntries,
  deriveKnownGitEntries,
  gitModeFromFlags,
  normalizeGitMode,
  promptGitChoice,
  stripKitBlocks,
  writeKitBlock,
  removeKitBlock,
  applyGitMode,
  removeGitModeBlocks,
};
