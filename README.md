# Copilot Workflow Kit

[![CI](https://github.com/allexcd/copilot-workflow-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/allexcd/copilot-workflow-kit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/copilot-workflow-kit)](https://www.npmjs.com/package/copilot-workflow-kit)
[![npm downloads](https://img.shields.io/npm/dm/copilot-workflow-kit)](https://www.npmjs.com/package/copilot-workflow-kit)
[![License: MIT](https://img.shields.io/npm/l/copilot-workflow-kit)](LICENSE)
[![Node.js >=20](https://img.shields.io/node/v/copilot-workflow-kit)](https://www.npmjs.com/package/copilot-workflow-kit)
[![GitHub stars](https://img.shields.io/github/stars/allexcd/copilot-workflow-kit?style=social)](https://github.com/allexcd/copilot-workflow-kit)

A workflow orchestration kit for GitHub Copilot across VS Code, Copilot Chat, Copilot CLI, custom agents, and Copilot coding agent sessions. Structured rules, agents, skills, and prompts make Copilot plan before building, verify before closing, and self-improve after corrections.

## Install

Run this inside your project directory:

```bash
npx copilot-workflow-kit init
```

This scaffolds all kit files into your project and creates a `.copilot-kit.lock` file to track versions. Run `cwk validate` any time you want to check the bundled metadata and installed lockfile shape.

### Git handling

If you are in a git repository, the installer prompts you to choose how git should handle the installed files:

```
  [1] Exclude locally   — write to .git/info/exclude (your clone only)
  [2] Add to .gitignore — shared with the team via .gitignore
  [3] Track in git      — commit the files with the repo
```

You can skip the prompt by passing a flag directly:

```bash
npx copilot-workflow-kit init --git-exclude  # local-only exclusion via .git/info/exclude
npx copilot-workflow-kit init --gitignore    # add to .gitignore (affects the whole team)
npx copilot-workflow-kit init --git-track    # no git exclusion, commit files with the repo
```

Git exclusions are written as exact installed file paths. Existing files such as `.github/workflows/ci.yml` stay visible to git.
The selected git handling mode is saved in `.copilot-kit.lock` so future updates can apply the same choice to newly added kit files.

If you chose `--git-track` (or ran in a non-interactive environment), commit the scaffolded files:

```bash
git add .github/ AGENTS.md docs/ tasks/ .copilot-kit.lock
git commit -m "chore: add copilot-workflow-kit"
```

## Update

When a new kit version is published:

```bash
npx copilot-workflow-kit@latest update
```

The update command uses a **file ownership model** to preserve your customizations:

| Tier | Behavior | Files |
|------|----------|-------|
| **Kit-managed** | Auto-updated to latest version | Skills, agents, prompts, workflow docs |
| **User-owned** | Never overwritten by update | `copilot-instructions.md`, `AGENTS.md`, `backend.instructions.md`, `tasks/*` |

Kit-managed files that you modified locally are skipped with a warning. Use `--force` to overwrite them.
When a new kit version adds files, `update` installs missing kit-managed files and scaffolds missing user-owned files once. If the path already exists in your project, it is kept unless you pass `--force`.

`update` reuses the git handling mode saved by `init` and refreshes the kit block in `.gitignore` or `.git/info/exclude` when needed. Older lockfiles that do not have a saved git mode prompt once in an interactive terminal; non-interactive runs still update files, but skip git ignore/exclude changes and print a warning.

```bash
npx copilot-workflow-kit@latest update --dry-run  # Preview changes without writing
npx copilot-workflow-kit@latest update --force     # Force-update locally modified files
```

### Automated updates via GitHub Actions

The `init` command scaffolds a GitHub Actions workflow at `.github/workflows/update-copilot-kit.yml`. It runs weekly, checks for new kit versions on npm, and opens a PR with only kit-managed file changes. No setup required — it works out of the box once committed.

## Uninstall

To remove all kit-installed files from your project:

```bash
npx copilot-workflow-kit uninstall
```

By default this removes only **kit-managed** files (skills, agents, prompts, workflow docs) and the `.copilot-kit.lock` lockfile. **User-owned** files are left untouched. Locally modified kit-managed files are also kept by default; use `--force` only when you want to remove them too.

To remove everything — including user-owned files like `AGENTS.md`, `tasks/*`, and `copilot-instructions.md`:

```bash
npx copilot-workflow-kit uninstall --all
```

Preview what would be removed without deleting anything:

```bash
npx copilot-workflow-kit uninstall --dry-run
npx copilot-workflow-kit uninstall --all --dry-run
```

Force-remove locally modified kit-managed files:

```bash
npx copilot-workflow-kit uninstall --force
```

Empty directories left behind after file removal are cleaned up automatically. Directories that still contain other (non-kit) files are preserved.
Uninstall also removes Copilot Workflow Kit blocks from `.gitignore` and `.git/info/exclude`. During `--all`, locally modified user-owned files require confirmation before deletion; non-interactive runs keep them unless `--force` is passed.

## Validate

Check the kit manifest, bundled templates, required skill and agent metadata, and any installed lockfile:

```bash
npx copilot-workflow-kit validate
```

This is useful before publishing the package or after manually editing bundled templates.

## CLI Commands

| Command | Purpose |
|---------|---------|
| `cwk init` | Scaffold all kit files — prompts for git handling if in a git repo |
| `cwk init --git-exclude` | Scaffold and write installed paths to `.git/info/exclude` (local only) |
| `cwk init --gitignore` | Scaffold and append installed paths to `.gitignore` |
| `cwk init --git-track` | Scaffold only — no git exclusion, commit files with the repo |
| `cwk init --force` | Re-scaffold all files, overwriting any existing ones |
| `cwk update` | Update kit-managed files to the latest version |
| `cwk update --dry-run` | Preview updates without writing any files |
| `cwk update --force` | Force-update even locally modified kit-managed files |
| `cwk update --git-exclude` | Update and write installed paths to `.git/info/exclude` |
| `cwk update --gitignore` | Update and write installed paths to `.gitignore` |
| `cwk update --git-track` | Update without writing git ignore/exclude files |
| `cwk status` | Show the state of each kit file (up-to-date, modified, outdated) |
| `cwk diff` | Show differences between installed and latest kit files |
| `cwk diff --all` | Include user-owned files in diff output (suggested changes) |
| `cwk validate` | Validate manifest/template parity, metadata, and lockfile shape |
| `cwk uninstall` | Remove kit-managed files and the lockfile |
| `cwk uninstall --all` | Also remove user-owned files (full cleanup) |
| `cwk uninstall --dry-run` | Preview what would be removed without deleting |
| `cwk uninstall --force` | Remove locally modified kit-managed files too |

`cwk` is an alias for `copilot-workflow-kit`.

## Customizing the Kit

**User-owned files** are yours to modify freely. They are scaffolded once and never touched by `update`:

- `.github/copilot-instructions.md` — Add project-specific rules
- `.github/instructions/backend.instructions.md` — Adapt to your language/framework
- `AGENTS.md` — Add project-specific agent defaults
- `tasks/todo.md`, `tasks/lessons.md` — Used during development

**Kit-managed files** receive upstream improvements automatically. If you need to customize a skill, agent, or prompt:

1. Create a *new* file alongside the kit version (e.g., `.github/skills/my-custom-skill/SKILL.md`)
2. Leave kit-managed originals untouched so `update` continues to work

This way your customizations live alongside the kit without conflicts.

## File Map

| Files | Purpose | Ownership |
|---|---|---|
| `.github/copilot-instructions.md` | Repository-wide Copilot behavior | User-owned |
| `.github/instructions/backend.instructions.md` | Language/framework code rules | User-owned |
| `AGENTS.md` | Default instructions for agents | User-owned |
| `.github/agents/*.agent.md` | Custom Copilot agents for implementation and review | Kit-managed |
| `.github/skills/*/SKILL.md` | Reusable workflows with required skill metadata | Kit-managed |
| `.github/prompts/*.prompt.md` | Task kickoff, verification, and elegance prompts | Kit-managed |
| `docs/workflow/workflow-orchestration.md` | Full workflow rules for Chat, CLI, and cloud agent sessions | Kit-managed |
| `tasks/todo.md` | Active plan and verification checklist | User-owned |
| `tasks/lessons.md` | Correction patterns and prevention rules | User-owned |
| `.github/workflows/update-copilot-kit.yml` | Weekly automated kit update PR | User-owned |
| `.copilot-kit.lock` | Installed file hashes and ownership | Generated |

## Compatibility

Uses repository files that Copilot can auto-load:
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/prompts/*.prompt.md`
- `AGENTS.md`

Also includes:
- `.github/agents/*.agent.md` custom-agent definitions with `name`, `description`, and tool aliases.
- `.github/skills/*/SKILL.md` Agent Skill definitions with `name` and `description` frontmatter.
- Optional guidance for Copilot coding agent setup via `.github/workflows/copilot-setup-steps.yml`; add this file in your project only when the cloud agent needs custom dependencies or setup steps.
- Optional hook guidance in `docs/workflow/workflow-orchestration.md`; hooks are not scaffolded by default because they should be small, explicit guardrails.

## Complementary Tools

**GitHub CLI Agent Skills** — Newer GitHub CLI versions include `gh skill` for managing Copilot Agent Skills. Use `gh skill --help` when your installed `gh` supports it. The command is not available in GitHub CLI `2.89.0`; install a newer release before relying on it in setup docs or automation.

**[caveman](https://github.com/JuliusBrussee/caveman)** — Reduces LLM output tokens by ~65% via terse responses. Orthogonal to this kit.

```bash
npx skills add JuliusBrussee/caveman -a github-copilot
```

**[graphify](https://github.com/safishamsi/graphify)** — Reduces LLM input tokens via knowledge graph. 71x fewer tokens per query on large codebases.

```bash
pip install graphifyy && graphify install --platform copilot
```

## Contributing

### Commit Types

The following types are used in branch names, PR titles, and commit messages:

| Type | When to use |
|------|-------------|
| `feat` | Adding a new feature or capability |
| `fix` | Fixing a bug or broken behavior |
| `chore` | Maintenance, configuration, or tooling — no production code change |
| `docs` | Documentation only — no code changes |
| `refactor` | Restructuring code without changing its external behavior |
| `test` | Adding, updating, or fixing tests |
| `perf` | A change that improves performance |
| `ci` | Changes to CI/CD configuration or pipeline |
| `build` | Changes that affect the build system or dependencies |
| `revert` | Reverting a previous commit |
| `hotfix` | Urgent fix that needs to go out immediately |

### Branch Names

Branches must follow this pattern:

```
<type>/<short-description>
```

| Type | When to use |
|------|-------------|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `chore` | Maintenance, config, tooling — no production code change |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `hotfix` | Urgent fix going directly toward release |

Rules:
- Lowercase and hyphens only — no uppercase, no underscores, no spaces
- Description must be between 2 and 5 words
- Keep it descriptive enough to understand at a glance

Examples:
```
feat/add-oauth-login
fix/token-expiry-crash
chore/update-deps
docs/improve-readme
refactor/simplify-update-logic
test/add-status-unit-tests
hotfix/fix-broken-publish
```

### PR Titles

Pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): [TICKET-123] - <short description>
```

| Part | Required | Example |
|------|----------|---------|
| `type` | Yes | `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `revert` |
| `(scope)` | No | `(auth)`, `(api)`, `(cli)` — the area of the codebase affected |
| `[TICKET-123]` | No | Your issue or ticket reference |
| `short description` | Yes | Lowercase, no trailing period, imperative tense |

Rules:
- Description must be lowercase and must not end with a period
- Total title must be 72 characters or fewer
- Use imperative tense: "add feature", not "added feature" or "adding feature"
- Scope is optional but encouraged when the change targets a specific area

Both formats pass CI validation:
```
# without scope — works fine when the change spans multiple areas
docs: update contributing section with naming conventions

# with scope — preferred when the change targets a specific file or module
docs(readme): update contributing section with naming conventions
```

More examples:
```
feat(auth): [PROJ-123] - add OAuth2 login with Google
fix(api): [PROJ-456] - handle null response from payment service
chore(deps): bump lodash to 4.17.21
docs(readme): update contributing section with naming conventions
refactor(cli): simplify flag parsing logic
test(update): add unit tests for hash-based state machine
```

### Commit Messages

Commit messages follow the same format as PR titles.

```
<type>(<scope>): [TICKET-123] - <short description>

Optional body explaining WHY the change was made, if not obvious from the subject.
```

Rules:
- Subject line: 50 characters or fewer
- Body: add only when the *why* is not obvious — "what" is visible in the diff, "why" is not
- Separate subject and body with a blank line
- Wrap the body at 72 characters per line
- Use imperative tense in the subject: "fix crash", not "fixed crash"
- Scope is optional — use it when the change targets a specific file or module

Both formats are valid:
```
# without scope
docs: update contributing section with naming conventions

# with scope — clearer when a specific area is affected
docs(readme): update contributing section with naming conventions
```

More examples:
```
feat(auth): [PROJ-123] - add OAuth2 login with Google

fix(api): [PROJ-456] - handle null response from payment service

Switched to optional chaining on the response body to avoid crashes
when the payment provider returns a 204 with no content.

chore(deps): bump lodash from 4.17.20 to 4.17.21

docs(readme): update contributing section with naming conventions
```

### Merging Rules

| Rule | When enforced |
|------|---------------|
| Branch name pattern | On `git push` — push rejected immediately |
| PR title format | On PR open/edit — CI check blocks merge |
| Lint | On PR open + every new commit — CI check blocks merge |
| Tests (Node 18, 20, 22) | On PR open + every new commit — CI check blocks merge |
| Build / pack check | On PR open + every new commit — CI check blocks merge |
| 1 approval required | At merge time |
| Stale approval on new push | At merge time — approval dismissed, re-review required |
| No direct push to `main` | On `git push` — push rejected immediately |

These rules are enforced by:
- `.github/workflows/branch-ruleset.yml` — applies a GitHub Ruleset via API (branch naming, push protection, required status checks, approvals)
- `.github/workflows/pr-title.yml` — validates PR title format on every PR
- `.github/workflows/ci.yml` — runs lint, tests, and build checks
