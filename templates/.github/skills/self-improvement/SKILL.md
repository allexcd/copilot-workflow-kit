---
name: self-improvement
description: >
  Self-improvement loop triggered after any user correction. Captures mistakes
  as prevention rules in tasks/lessons.md so the same error is never repeated.
---

# Self-Improvement

Implements **§3 Self-Improvement Loop** from `docs/workflow/workflow-orchestration.md`.

## When to Trigger
- After ANY correction from the user
- After a reviewer flags an issue
- When you catch your own mistake mid-task

## Workflow
1. Identify the root cause of the mistake
2. Open `tasks/lessons.md`
3. Add a new entry using the template below
4. Write a concrete prevention rule (not vague advice)
5. Review existing lessons at session start for the relevant project

## Lesson Entry Template
```markdown
- Date: YYYY-MM-DD
- Issue: What went wrong
- Correction from user/reviewer: What they said
- Root cause: Why it happened
- Prevention rule: Specific rule to prevent recurrence
```

## Rules
- Every correction becomes a lesson — no exceptions
- Prevention rules must be specific and actionable
- Ruthlessly iterate on lessons until mistake rate drops
- Review lessons at the start of each session
