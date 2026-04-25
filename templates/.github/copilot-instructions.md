# Repository-Wide Copilot Instructions

Follow `docs/workflow/workflow-orchestration.md` in Copilot Chat, Copilot CLI, custom agents, and Copilot coding agent sessions.

## Mandatory Behaviors
- Plan first for non-trivial tasks (3+ steps, architectural decisions, migrations, or meaningful risk).
- Ground plans in repository facts before asking questions.
- Verify before done with concrete proof: tests, logs, diffs, screenshots, or behavioral checks.
- Demand elegance for non-trivial changes; keep simple fixes simple.
- Capture corrections in `tasks/lessons.md` with a prevention rule.
- Use skills and agents when their metadata matches the task.
- Fix bugs autonomously: diagnose, implement, and prove the root-cause fix.

## Task Tracking
- Track active plans and progress in `tasks/todo.md`.
- Review `tasks/lessons.md` before starting related work.
- For Copilot coding agent branches or PRs, include verification evidence in the final summary or PR notes.

## Output Contract
For non-trivial tasks, return:
1. Plan
2. Implementation summary
3. Verification evidence
4. Risks or follow-ups

## Core Principles
- Simplicity first: minimal code impact and low blast radius.
- Root cause over symptoms: no temporary fixes unless explicitly requested.
- Respect existing conventions before adding new abstractions.
