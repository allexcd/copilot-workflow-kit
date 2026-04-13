#!/bin/bash
set -e

# copilot-workflow-kit installer
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/allexcd/copilot-workflow-kit/main/install.sh)
#   bash install.sh [--force]

REPO="allexcd/copilot-workflow-kit"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
  esac
done

# Files to install (relative to repo root)
# Excludes: README.md, install.sh (kit-only files)
KIT_FILES=(
  ".github/copilot-instructions.md"
  ".github/instructions/backend.instructions.md"
  ".github/agents/deep-reviewer.agent.md"
  ".github/agents/fast-implementer.agent.md"
  ".github/prompts/elegant-fix.prompt.md"
  ".github/prompts/kickoff.prompt.md"
  ".github/prompts/verify-and-close.prompt.md"
  ".github/skills/autonomous-bug-fixing/SKILL.md"
  ".github/skills/demand-elegance/SKILL.md"
  ".github/skills/plan-mode/SKILL.md"
  ".github/skills/self-improvement/SKILL.md"
  ".github/skills/subagent-strategy/SKILL.md"
  ".github/skills/verification/SKILL.md"
  "AGENTS.md"
  "docs/workflow/workflow-orchestration.md"
  "tasks/todo.md"
  "tasks/lessons.md"
)

installed=0
skipped=0
failed=0

echo ""
echo "  copilot-workflow-kit installer"
echo "  ==============================="
echo ""

for file in "${KIT_FILES[@]}"; do
  target="./${file}"

  if [ -f "$target" ] && [ "$FORCE" -eq 0 ]; then
    echo "  skip  ${file}  (exists)"
    skipped=$((skipped + 1))
    continue
  fi

  dir="$(dirname "$target")"
  mkdir -p "$dir"

  if curl -fsSL "${BASE_URL}/${file}" -o "$target" 2>/dev/null; then
    echo "  ✓     ${file}"
    installed=$((installed + 1))
  else
    echo "  ✗     ${file}  (download failed)"
    failed=$((failed + 1))
  fi
done

echo ""
echo "  Done: ${installed} installed, ${skipped} skipped, ${failed} failed"
if [ "$skipped" -gt 0 ] && [ "$FORCE" -eq 0 ]; then
  echo "  Run with --force to overwrite existing files"
fi
echo ""
