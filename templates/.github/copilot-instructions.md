# Repository-wide Copilot Instructions

## Workflow
Follow the workflow orchestration defined in `docs/workflow/workflow-orchestration.md`.

### Mandatory Behaviors
- **Plan first** for non-trivial tasks (3+ steps or architectural decisions). Write plan to `tasks/todo.md`.
- **Verify before done** with concrete proof — tests, logs, diffs, or behavioral checks.
- **Demand elegance** for non-trivial changes. Skip for simple, obvious fixes.
- **Self-improve** after any correction — update `tasks/lessons.md` with a prevention rule.
- **Use subagents** to keep the main context clean. One task per subagent.
- **Fix bugs autonomously** — don't ask for hand-holding. Diagnose, fix, prove.

### Task Tracking
- Track progress in `tasks/todo.md` with checkable items.
- After any correction, update `tasks/lessons.md`.
- Review `tasks/lessons.md` at session start.

### Output Contract (non-trivial tasks)
1. Plan
2. Implementation summary
3. Verification evidence
4. Risks/follow-ups

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
