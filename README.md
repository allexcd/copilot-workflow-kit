# Copilot Workflow Kit

A workflow orchestration kit for GitHub Copilot in VS Code. Structured rules, agents, skills, and prompts that make Copilot plan before building, verify before closing, and self-improve after corrections.

## Install

Run this inside your project directory:

```bash
npx copilot-workflow-kit init
```

This scaffolds all kit files into your project and creates a `.copilot-kit.lock` file to track versions.

Commit the scaffolded files:

```bash
git add .github/copilot-instructions.md \
        .github/instructions/ \
        .github/agents/ \
        .github/prompts/ \
        .github/skills/ \
        .github/workflows/update-copilot-kit.yml \
        AGENTS.md docs/ tasks/ .copilot-kit.lock
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

```bash
npx copilot-workflow-kit@latest update --dry-run  # Preview changes
npx copilot-workflow-kit@latest update --force     # Force-update modified files
```

### Automated updates via GitHub Actions

The `init` command scaffolds a GitHub Actions workflow at `.github/workflows/update-copilot-kit.yml`. It runs weekly, checks for new kit versions on npm, and opens a PR with only kit-managed file changes. No setup required — it works out of the box once committed.

## CLI Commands

| Command | Purpose |
|---------|---------|
| `cwk init` | Scaffold all kit files into the project |
| `cwk update` | Update kit-managed files to the latest version |
| `cwk status` | Show the state of each kit file (up-to-date, modified, outdated) |
| `cwk diff` | Show differences between installed and latest kit files |
| `cwk diff --all` | Include user-owned files in diff output (suggested changes) |

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

## What's Included

| Category | Files | Ownership |
|---|---|---|
| Workflow rules | `docs/workflow/workflow-orchestration.md` | Kit-managed |
| Instructions | `.github/copilot-instructions.md`, `.github/instructions/backend.instructions.md` | User-owned |
| Agents | `.github/agents/deep-reviewer.agent.md`, `.github/agents/fast-implementer.agent.md` | Kit-managed |
| Prompts | `.github/prompts/kickoff.prompt.md`, `.github/prompts/verify-and-close.prompt.md`, `.github/prompts/elegant-fix.prompt.md` | Kit-managed |
| Skills | `.github/skills/{autonomous-bug-fixing,demand-elegance,plan-mode,self-improvement,subagent-strategy,verification}/SKILL.md` | Kit-managed |
| Task tracking | `tasks/todo.md`, `tasks/lessons.md` | User-owned |
| Root config | `AGENTS.md` | User-owned |
| CI | `.github/workflows/update-copilot-kit.yml` | User-owned |

## Compatibility

Uses repository files that Copilot auto-loads:
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/prompts/*.prompt.md`
- `AGENTS.md`

## Releasing a New Version

Requires the [`gh` CLI](https://cli.github.com) to be installed and authenticated (`gh auth login`).

```bash
npm run release
```

The script will:
1. Prompt for a version bump — `patch`, `minor`, or `major`
2. Update `package.json` with the new version
3. Commit and tag (`v1.x.x`)
4. Push the commit and tag to GitHub
5. Create a GitHub release with notes generated from git log

Then publish to npm manually:

```bash
npm publish
```

### Automated npm publish via GitHub Actions

To publish automatically when a tag is pushed, add `.github/workflows/publish.yml` to this repo:

```yaml
name: Publish to npm
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add your npm token to GitHub → Settings → Secrets → `NPM_TOKEN`. With this in place, `npm run release` triggers a publish automatically — no manual `npm publish` needed.

## Complementary Tools

**[caveman](https://github.com/JuliusBrussee/caveman)** — Reduces LLM output tokens by ~65% via terse responses. Orthogonal to this kit.

```bash
npx skills add JuliusBrussee/caveman -a github-copilot
```

**[graphify](https://github.com/safishamsi/graphify)** — Reduces LLM input tokens via knowledge graph. 71x fewer tokens per query on large codebases.

```bash
pip install graphifyy && graphify install --platform copilot
```
