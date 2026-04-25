#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
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
  if (type === 'major') { return `${major + 1}.0.0`; }
  if (type === 'minor') { return `${major}.${minor + 1}.0`; }
  return `${major}.${minor}.${patch + 1}`;
}

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const status = run('git status --porcelain');
  if (status) {
    console.error('\n  Error: Working tree has uncommitted changes. Commit or stash them first.\n');
    console.error(status);
    process.exit(1);
  }

  const currentBranch = run('git rev-parse --abbrev-ref HEAD');
  if (currentBranch !== 'main') {
    console.error(`\n  Error: Must be on main branch to create a release (currently on "${currentBranch}").\n`);
    process.exit(1);
  }

  checkDependencies();

  // Fetch tags so git describe sees the latest remote tags
  run('git fetch --tags');

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

  // Use latest git tag as base version to stay in sync with previous releases.
  // git tag --sort=-v:refname finds the highest semver tag regardless of whether
  // it is reachable from HEAD (unlike git describe which requires reachability).
  let current = pkg.version;
  const latestTag = run('git tag --sort=-v:refname')
    .split('\n')
    .find((t) => /^v\d/.test(t));
  if (latestTag) {
    const latestVersion = latestTag.replace(/^v/, '');
    if (latestVersion !== pkg.version) {
      console.log(`\n  ⚠  package.json (${pkg.version}) is behind latest tag (${latestTag}) — using tag as base`);
    }
    current = latestVersion;
  }

  console.log(`\n  Current version: ${current}`);
  console.log('  Bump type: patch | minor | major\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const input = (await prompt(rl, '  Bump type (patch): ')).trim() || 'patch';
  rl.close();

  if (!['patch', 'minor', 'major'].includes(input)) {
    console.error(`\n  Invalid bump type: "${input}". Must be patch, minor, or major.\n`);
    process.exit(1);
  }

  const next = bumpVersion(current, input);
  const tag = `v${next}`;
  const branch = `chore/release-v${next.replace(/\./g, '-')}`;

  console.log(`\n  ${current} → ${next} (${tag})`);
  console.log(`  Branch: ${branch}\n`);

  // Create release branch
  run(`git checkout -b ${branch}`);

  // Bump version in package.json and package-lock.json
  pkg.version = next;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  run('npm install --package-lock-only --ignore-scripts');
  console.log(`  ✓  package.json + package-lock.json → ${next}`);

  // Commit
  run('git add package.json package-lock.json');
  run(`git commit -m "chore: release ${tag}"`);
  console.log(`  ✓  commit: chore: release ${tag}`);

  // Push branch
  run(`git push -u origin ${branch}`);
  console.log(`  ✓  pushed branch: ${branch}`);

  // Open PR — write body to a temp file to avoid shell escaping issues
  const prBody = `Bump version to ${next}.\n\nOnce merged, CI will create the ${tag} tag and trigger npm publish.`;
  const prBodyPath = path.join(os.tmpdir(), `cwk-release-${next}.md`);
  fs.writeFileSync(prBodyPath, prBody, 'utf8');
  try {
    run(`gh pr create --title "chore: release ${tag}" --body-file "${prBodyPath}" --base main`);
  } finally {
    fs.unlinkSync(prBodyPath);
  }
  console.log(`  ✓  PR opened against main`);

  console.log('\n  Done. Merge the PR to trigger tagging and npm publish.\n');
}

main().catch((err) => {
  console.error(`\n  Release failed: ${err.message}\n`);
  process.exit(1);
});
