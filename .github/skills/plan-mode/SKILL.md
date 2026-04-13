---
description: >
  Plan-first workflow for non-trivial tasks. Use when a task involves 3+ steps,
  architectural decisions, or significant risk. Produces a checkable plan in
  tasks/todo.md before any implementation begins.
---

# Plan Mode

Implements **§1 Plan Mode Default** from `docs/workflow/workflow-orchestration.md`.

## When to Enter Plan Mode
- Any task with 3+ steps or architectural decisions
- When verification steps need to be designed upfront
- When ambiguity exists — write detailed specs first

## Workflow
1. Analyze the task and break it into checkable steps
2. Write the plan to `tasks/todo.md` with checkable items
3. Include a verification plan section
4. Present the plan to the user before implementing
5. If execution drifts from the plan, STOP and re-plan immediately

## Plan Template (tasks/todo.md)
```markdown
## Current Task
- [ ] Step 1: ...
- [ ] Step 2: ...

## Verification Plan
- [ ] Test/check A
- [ ] Test/check B

## Review Notes
- Result:
- Evidence:
- Follow-ups:
```

## Rules
- Never skip planning for non-trivial work
- Re-plan immediately if something goes sideways — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
