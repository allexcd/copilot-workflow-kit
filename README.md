# VS Code / GitHub Copilot Compatibility Notes

This kit uses currently supported repository files that Copilot auto-loads:
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
