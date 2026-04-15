#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

const COMMANDS = {
  init: '../src/commands/init.js',
  update: '../src/commands/update.js',
  status: '../src/commands/status.js',
  diff: '../src/commands/diff.js',
  uninstall: '../src/commands/uninstall.js',
};

function printHelp() {
  console.log(`
  copilot-workflow-kit — Workflow orchestration for GitHub Copilot

  Usage:
    copilot-workflow-kit <command> [options]
    cwk <command> [options]

  Commands:
    init           Scaffold kit files into the current project
    update         Update kit-managed files to the latest version
    status         Show the state of each kit file
    diff           Show differences between installed and latest kit files
    uninstall      Remove kit-installed files and the lockfile

  Options:
    --force        Overwrite files even if locally modified (init, update)
    --dry-run      Show what would change without writing (update, uninstall)
    --all          Include user-owned files in diff output (diff) / remove user-owned files (uninstall)
    --help, -h     Show this help message
    --version, -v  Show version

  Examples:
    npx copilot-workflow-kit init
    npx copilot-workflow-kit update --dry-run
    npx copilot-workflow-kit status
    npx copilot-workflow-kit diff --all
    npx copilot-workflow-kit uninstall
    npx copilot-workflow-kit uninstall --all --dry-run
`);
}

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

if (!COMMANDS[command]) {
  console.error(`  Unknown command: ${command}\n`);
  printHelp();
  process.exit(1);
}

const run = require(COMMANDS[command]);
run(flags).catch((err) => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
});
