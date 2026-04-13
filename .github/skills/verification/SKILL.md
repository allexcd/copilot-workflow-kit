---
description: >
  Verification-before-done discipline. Ensures no task is marked complete without
  concrete proof of correctness — tests, logs, diffs, or behavioral checks.
---

# Verification

Implements **§4 Verification Before Done** from `docs/workflow/workflow-orchestration.md`.

## When to Apply
- Before marking any task as complete
- Before presenting a fix or implementation to the user
- After every code change that could affect behavior

## Workflow
1. Run applicable checks: tests, lint, build, type checking
2. Diff behavior between main and your changes when relevant
3. Show concrete evidence (output, logs, screenshots)
4. Ask yourself: "Would a staff engineer approve this?"
5. Update `tasks/todo.md` review notes with results and evidence

## Verification Checklist
- [ ] Tests pass (or no applicable tests)
- [ ] Lint/build clean
- [ ] Behavioral diff reviewed
- [ ] Evidence documented in tasks/todo.md

## Rules
- Never mark done without concrete proof
- Run tests/lint/build as applicable
- Demonstrate correctness — don't just assert it
- If you can't prove it works, it's not done
