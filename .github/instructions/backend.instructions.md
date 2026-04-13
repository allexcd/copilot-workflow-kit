---
applyTo: "**/*.{ts,tsx,js,jsx,py,go,java,cs,rb,rs}"
---

# Backend Code Instructions

## Code Change Rules
- Root cause first — no band-aid fixes.
- Minimal diff — only touch what's necessary.
- Verify with tests, lint, and build where applicable.
- Run existing test suites before and after changes.
- Follow existing code style and conventions in the file.

## Quality Standards
- No temporary fixes or workarounds.
- Handle errors at system boundaries only.
- Keep changes simple and minimal-impact.
- If tests exist, they must pass before marking done.
