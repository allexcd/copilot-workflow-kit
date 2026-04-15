'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadManifest,
  getTemplatePath,
  readLockfile,
  parseFlags,
} = require('../utils');

/**
 * Produce a simple unified-style diff between two strings.
 * @param {string} a
 * @param {string} b
 * @param {string} label
 * @returns {string}
 */
function simpleDiff(a, b, label) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const output = [];
  output.push(`--- a/${label}`);
  output.push(`+++ b/${label}`);

  const maxLen = Math.max(linesA.length, linesB.length);
  let hasChanges = false;

  for (let i = 0; i < maxLen; i++) {
    const lineA = i < linesA.length ? linesA[i] : undefined;
    const lineB = i < linesB.length ? linesB[i] : undefined;

    if (lineA === lineB) {
      output.push(` ${lineA}`);
    } else {
      hasChanges = true;
      if (lineA !== undefined) {output.push(`-${lineA}`);}
      if (lineB !== undefined) {output.push(`+${lineB}`);}
    }
  }

  return hasChanges ? output.join('\n') : '';
}

/**
 * Diff command — show differences between installed and template kit files.
 * @param {string[]} flags
 */
async function diff(flags) {
  const { all } = parseFlags(flags);
  const targetDir = process.cwd();
  const manifest = loadManifest();
  const lock = readLockfile(targetDir);

  if (!lock) {
    console.log('\n  No .copilot-kit.lock found. Run "copilot-workflow-kit init" first.\n');
    return;
  }

  let diffCount = 0;

  for (const entry of manifest.files) {
    // Skip user-owned unless --all
    if (entry.ownership === 'user-owned' && !all) {continue;}

    const targetPath = path.join(targetDir, entry.path);
    const templatePath = getTemplatePath(entry.path);

    if (!fs.existsSync(targetPath)) {
      console.log(`\n  ${entry.path}: missing (would be created by init/update)`);
      diffCount++;
      continue;
    }

    const currentContent = fs.readFileSync(targetPath, 'utf8');
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    if (currentContent === templateContent) {continue;}

    const label = entry.ownership === 'user-owned' ? `${entry.path} (user-owned)` : entry.path;
    const result = simpleDiff(currentContent, templateContent, label);
    if (result) {
      console.log('');
      console.log(result);
      diffCount++;
    }
  }

  if (diffCount === 0) {
    console.log('\n  All files are up-to-date. No differences found.\n');
  } else {
    console.log(`\n  ${diffCount} file(s) with differences.\n`);
  }
}

module.exports = diff;
module.exports.simpleDiff = simpleDiff;
