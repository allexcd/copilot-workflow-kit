# Copilot Workflow Kit

A workflow orchestration kit for GitHub Copilot in VS Code. Structured rules, agents, skills, and prompts that make Copilot plan before building, verify before closing, and self-improve after corrections.

## Install

Run this inside your project directory:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/allexcd/copilot-workflow-kit/main/install.sh)
```

Re-run with `--force` to update existing files:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/allexcd/copilot-workflow-kit/main/install.sh) --force
```

Or use this repo as a [GitHub template](https://github.com/allexcd/copilot-workflow-kit/generate) for new projects.

## What's Included

| Category | Files | Purpose |
|---|---|---|
| Workflow rules | `docs/workflow/workflow-orchestration.md` | Core methodology — plan mode, verification, subagents, elegance, self-improvement, autonomous bug fixing |
| Instructions | `.github/copilot-instructions.md`, `.github/instructions/backend.instructions.md` | Auto-loaded rules for every Copilot conversation |
| Agents | `.github/agents/deep-reviewer.agent.md`, `fast-implementer.agent.md` | Specialized agents for code review and execution |
| Prompts | `.github/prompts/kickoff.prompt.md`, `verify-and-close.prompt.md`, `elegant-fix.prompt.md` | Reusable slash-command prompts |
| Skills | `.github/skills/*/SKILL.md` | Domain-specific behaviors (plan-mode, verification, demand-elegance, self-improvement, subagent-strategy, autonomous-bug-fixing) |
| Task tracking | `tasks/todo.md`, `tasks/lessons.md` | Plan tracking and self-improvement log |
| Root config | `AGENTS.md` | Default instructions for all agents |

## Compatibility

Uses currently supported repository files that Copilot auto-loads:
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/prompts/*.prompt.md`
- `AGENTS.md`

If VS Code Chat Customizations "Agents/Skills/Hooks" UI does not auto-populate from repo,
that UI may be local-profile managed in your build. The above files still work as repo-level guidance.

## Complementary Tools

**[caveman](https://github.com/JuliusBrussee/caveman)** — Reduces LLM output tokens by ~65% by switching to terse "caveman-speak" responses, without sacrificing technical accuracy. Orthogonal to this workflow kit — pair them freely.

Install for Copilot:
```
npx skills add JuliusBrussee/caveman -a github-copilot
```

**[graphify](https://github.com/safishamsi/graphify)** — Reduces LLM input tokens by building a knowledge graph from your codebase (code, docs, PDFs, images, video). Agents navigate by graph structure instead of scanning raw files — 71x fewer tokens per query on large corpora. Run it on your own projects, not on this config repo.

Install for Copilot:
```
pip install graphifyy && graphify install --platform copilot
```
