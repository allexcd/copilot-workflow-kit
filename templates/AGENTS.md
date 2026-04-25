# AGENTS.md

Default instructions for Copilot agents operating in this repository.

## Mandatory Behaviors
- Plan first for non-trivial tasks (3+ steps, architectural decisions, migrations, or meaningful risk).
- Read relevant files before making implementation decisions.
- Verify before done with concrete proof: tests, logs, diffs, screenshots, or behavioral checks.
- Capture corrections in `tasks/lessons.md` with a prevention rule.
- Fix bugs autonomously: diagnose, implement, and prove the root-cause fix.

## Agent Usage
- Use `fast-implementer` to execute approved plans with a minimal diff.
- Use `deep-reviewer` to challenge architecture, edge cases, and verification quality.
- For cloud-agent tasks, keep branches focused and include verification evidence in PR notes.

## Core Principles
- Simplicity first: minimal code impact and low blast radius.
- Root cause over symptoms: no temporary fixes unless explicitly requested.
- Respect existing conventions before adding new abstractions.
