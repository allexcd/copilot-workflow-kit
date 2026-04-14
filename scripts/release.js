#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function checkDependencies() {
  try {
    run('gh --version');
  } catch {
    console.error('\n  Error: gh CLI is not installed or not in PATH.');
    console.error('  Install it from https://cli.github.com and run "gh auth login" first.\n');
    process.exit(1);
  }
  try {
    run('gh auth status');
  } catch {
    console.error('\n  Error: gh CLI is not authenticated. Run "gh auth login" first.\n');
    process.exit(1);
  }
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function getReleaseNotes(prevTag) {
  try {
    const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
    const log = run(`git log ${range} --oneline --no-merges`);
    return log || 'No changes.';
  } catch {
    return 'No changes.';
  }
}

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  // Check git working tree is clean
  const status = run('git status --porcelain');
  if (status) {
    console.error('\n  Error: Working tree has uncommitted changes. Commit or stash them first.\n');
    console.error(status);
    process.exit(1);
  }

  checkDependencies();

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const current = pkg.version;

  console.log(`\n  Current version: ${current}`);
  console.log('  bump type: patch | minor | major\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const input = (await prompt(rl, '  Bump type (patch): ')).trim() || 'patch';
  rl.close();

  if (!['patch', 'minor', 'major'].includes(input)) {
    console.error(`\n  Invalid bump type: "${input}". Must be patch, minor, or major.\n`);
    process.exit(1);
  }

  const next = bumpVersion(current, input);
  const tag = `v${next}`;

  console.log(`\n  ${current} → ${next} (${tag})\n`);

  // Determine previous tag for release notes
  let prevTag;
  try {
    prevTag = run('git describe --tags --abbrev=0');
  } catch {
    prevTag = null;
  }

  const notes = getReleaseNotes(prevTag);

  // Bump version in package.json
  pkg.version = next;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  ✓  package.json → ${next}`);

  // Commit
  run('git add package.json');
  run(`git commit -m "chore: release ${tag}"`);
  console.log(`  ✓  commit: chore: release ${tag}`);

  // Tag
  run(`git tag -a ${tag} -m "${tag}"`);
  console.log(`  ✓  tag: ${tag}`);

  // Push
  run('git push');
  run('git push --tags');
  console.log('  ✓  pushed commit + tag');

  // GitHub release
  const notesArg = notes.replace(/'/g, "'\\''");
  run(`gh release create ${tag} --title "${tag}" --notes '${notesArg}'`);
  console.log(`  ✓  GitHub release: ${tag}`);

  console.log('\n  Done. Run "npm publish" to publish to npm.\n');
}

main().catch((err) => {
  console.error(`\n  Release failed: ${err.message}\n`);
  process.exit(1);
});
