## Workflow Orchestration

Use this workflow in Copilot Chat, Copilot CLI, custom agents, and Copilot coding agent sessions.

### 1. Plan Mode Default
- Enter plan mode for any non-trivial task (3+ steps, architectural decisions, migrations, or meaningful risk).
- Ground the plan in the repo first: read files, inspect tests, and identify existing conventions before asking questions.
- Include the verification approach in the plan, not after implementation.
- If execution drifts or new facts invalidate the plan, stop and re-plan before continuing.

### 2. Agent Strategy
- Use custom agents for focused work: `fast-implementer` for approved plans, `deep-reviewer` for design and edge-case review.
- Use Copilot coding agent for isolated branches, background tasks, and PR-sized work.
- Use Copilot cloud planning or deep research for broad investigation before implementation.
- Keep each delegated task self-contained with clear inputs, expected output, and files or areas of ownership.

### 3. Skills and Context
- Use skills when the task matches their `name` and `description` metadata.
- Keep repository instructions concise; put workflow depth in skills and docs.
- Use `tasks/todo.md` for active plans and `tasks/lessons.md` for durable correction patterns.
- Prefer installed skill management such as `gh skill` when available, and keep copied skills versioned through this kit.

### 4. Verification Before Done
- Never mark a task complete without proof: tests, lint/build output, logs, screenshots, or behavioral checks.
- Diff behavior against the base branch when changes are risky or user-facing.
- For cloud-agent or branch work, record the verification evidence in the PR or final response.
- If proof cannot be produced, clearly state what was not verified and why.

### 5. Demand Elegance
- For non-trivial changes, pause and ask whether the implementation can be simpler.
- If the fix is a band-aid, replace it with the minimal root-cause solution.
- Do not over-engineer simple fixes; elegance means low complexity and low blast radius.

### 6. Autonomous Bug Fixing
- When given a bug report, failing CI run, or error log, diagnose, fix, and prove the fix without asking for step-by-step help.
- Trace root cause before editing.
- Keep changes narrow unless the root cause is shared.

## Optional Copilot Hooks and Setup
- Add hooks only for small guardrails such as formatting, validation, or preventing unsafe commands; avoid broad hooks that surprise contributors.
- For Copilot coding agent environments that need dependencies, add `.github/workflows/copilot-setup-steps.yml` in the target repo.
- Keep setup steps deterministic, fast, and limited to what the agent needs to run tests or inspect the project.
