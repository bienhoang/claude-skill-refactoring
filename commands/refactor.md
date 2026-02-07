---
description: ⚡⚡ Systematic code refactoring [INTELLIGENT ROUTING]
argument-hint: [target]
---

**Analyze target and route to the best refactoring command:**
<target>$ARGUMENTS</target>

## Decision Tree

**0. Empty arguments:**
- If `$ARGUMENTS` is empty → Use `AskUserQuestion`:
  - "What would you like to refactor? Provide a file path, directory, or description."

**1. Check for review intent:**
- If `$ARGUMENTS` contains action keywords: "review", "analyze", "audit", "scan", "assess", "inspect", "report" as standalone words (not inside file paths)
- Or if `$ARGUMENTS` starts with `--review`
→ `/refactor:review <target>` (strip the keyword, pass remaining as target)
- **Note:** If target is a `.md` plan file AND contains a review keyword (e.g., "review my plan.md"), prefer plan routing (Step 2) — the user likely wants to execute the plan, not review it

**2. Check for existing plan:**
- If `$ARGUMENTS` is a path to a `.md` plan file → `/refactor:implement <path>`
- If active refactoring plan exists in `./plans/` matching "refactor" → `/refactor:implement`

**3. Route by scope:**

**A) Single File** (target is a file path like `src/utils.ts`, `lib/helpers.js`)
→ `/refactor:fast <target>`

**B) Small Scope** (target mentions specific function, class, or method)
→ `/refactor:fast <target>`

**C) Multi-file list or glob patterns** (e.g., `src/*.ts`, `file1.js file2.js`)
→ `/refactor:plan <target>`

**D) Directory / Module** (target is a directory like `src/services/`, `lib/`)
→ `/refactor:plan <target>`

**E) Large Scope** (keywords: architecture, system, module, large, entire, whole, codebase)
→ `/refactor:plan <target>`

**F) Ambiguous** (cannot determine scope from arguments)
→ Use `AskUserQuestion` with options:
  - "/refactor:review — Read-only analysis report"
  - "/refactor:fast — Quick autonomous refactoring"
  - "/refactor:plan — Brainstorm & plan first"
  - "/refactor:implement — Execute with review-then-apply"

## Notes
- Always pass the full `$ARGUMENTS` to the selected variant
- If unclear, ask user for clarification before routing
- If a subagent fails during routing, report the error and ask user to choose variant manually
