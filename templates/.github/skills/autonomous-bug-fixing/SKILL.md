---
name: autonomous-bug-fixing
description: >
  Autonomous bug fixing workflow. Use when given a bug report, failing test, or
  error log. Diagnose and fix without asking for hand-holding — zero context
  switching required from the user.
---

# Autonomous Bug Fixing

Implements **§6 Autonomous Bug Fixing** from `docs/workflow/workflow-orchestration.md`.

## When to Apply
- User reports a bug or error
- CI tests are failing
- Error logs or stack traces are provided
- Any defect that needs resolution

## Workflow
1. Gather evidence: read logs, errors, failing tests, stack traces
2. Reproduce or confirm the issue
3. Diagnose root cause — don't guess, trace the problem
4. Implement a minimal, root-cause fix
5. Verify the fix with concrete proof (tests pass, error resolved)
6. Present the fix with evidence

## Rules
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
- Always find the root cause — no band-aid fixes
- Provide verification proof before marking done
