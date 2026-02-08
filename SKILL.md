---
name: refactoring
description: >
  Systematic code refactoring with code smell detection, safe transformation, and test verification.
  Triggers: refactor code, improve code quality, clean up code, reduce technical debt, fix code smells,
  simplify complex code, improve readability, restructure code, extract methods/classes, reduce duplication,
  apply design patterns, review code quality, messy code, hard to maintain, too complex, needs cleanup,
  spaghetti code, DRY violations, cyclomatic complexity, coupling, cohesion.
---

# Code Refactoring Skill

Systematic approach to improving code structure while preserving behavior.

## Auto-Invocation Triggers

These are suggestion-only triggers — never auto-execute refactoring without explicit user request:

- User mentions "refactor", "clean up code", "code smells", "messy code", "too complex"
- User asks to "improve code quality", "reduce technical debt", "simplify code"
- File exceeds 300 lines or cyclomatic complexity >20 → suggest `/refactor:review` (read-only analysis only, never auto-apply)
- Code review identifies structural issues → suggest review, never auto-refactor

## Core Workflow

### 1. Analyze — Detect Code Smells

**Load config and history first:**
- If `.refactoring.yaml` exists: load and apply (see `REFERENCE.md > Project Configuration`)
- If `.refactoring-history.json` exists and tracking enabled: display trend summary

**Load references:** `references/code-smells.md`, `references/metrics.md`, `references/security-smells.md`, `references/prioritization.md`

**Priority order:** Security vulnerabilities → Correctness risks → Structural smells (God Class, Long Method, Feature Envy) → DRY violations → Naming/readability → Style

Score findings using metrics.md thresholds, rank with prioritization.md. Report severity (critical/major/minor) before proceeding.

**Architectural analysis (directory/module targets only):**
- Load `references/architecture/architectural-styles.md` → detect style + confidence
- Load `references/architecture/architectural-smells.md` → scan for arch-level smells
- For detailed detection algorithm, see `REFERENCE.md > Architectural Analysis Strategy`

### 2. Safeguard — Ensure Tests Exist

**Never refactor without a safety net.**

1. Check for existing tests (test files, CI configs)
2. If tests exist: run them, confirm pass, record baseline
3. If no tests: write characterization tests capturing current behavior

For detailed strategies (property-based, snapshot, contract, mutation testing), see `REFERENCE.md > Characterization Test Strategy`.

### 3. Transform — Apply Refactoring Methods

Load `references/refactoring-methods.md`. Conditional references (skip for simple mechanical refactorings):
- Architectural smells → load `references/design-patterns.md`
- Multi-file refactoring → load `references/dependency-analysis.md`
- Migration refactorings → load `references/migration-patterns.md`
- Architectural smells (directory targets) → load `references/architecture/architectural-patterns.md`

**Principles:** One refactoring at a time. Small steps. Preserve behavior. Note commit points after each successful transformation + test pass.

For common smell-to-refactoring sequences, see `REFERENCE.md > Common Transformation Sequences`.

### 4. Verify — Run Tests

After each transformation:
1. Run the full test suite. All tests must pass.
2. If any test fails: **revert immediately** (`git restore <changed-files>`) and investigate.
3. If all pass: proceed to next transformation or finalize.

**Final checklist:** All pre-existing tests pass, new characterization tests pass, no behavioral changes (unless intended), coverage not decreased, linting/type checking passes.

### 5. Report — Summarize Changes

Present severity summary, before/after metrics, methods applied, and remaining smells. For the full report template, see `REFERENCE.md > Report Template`.

**Session history:** Append entry to `.refactoring-history.json` (see `REFERENCE.md > Session History`).

## Language-Specific Guidance

Before analyzing, detect language conventions:
1. Identify language(s) from file extensions
2. Load `references/languages/_index.md` → find correct language file(s)
3. Load relevant language file(s), execute **Discovery** section
4. Use discovered conventions throughout analysis and transformation
5. Output: **Aligned Refactorings** (respect conventions) + **Convention Improvements** (suggest better practices)

Supports 16 languages: Python, JS/TS, Java, Go, Rust, PHP, Ruby, C#, Swift, Kotlin, C/C++, Dart, Scala, Elixir, Shell/Bash, Lua.

## Additional References

For detailed guidance on these topics, see `REFERENCE.md`:
- **Git Strategy** — suggest-only git practices (stash, branch, commit, squash)
- **Parallel Refactoring** — batch execution for directory targets with 3+ independent tasks
- **Project Configuration** — `.refactoring.yaml` schema, workflow overrides, command defaults, priority weights
- **Context Optimization** — strategies for efficient analysis of large codebases
- **Architectural Analysis** — style detection, arch-level smells and patterns (conditional on directory/module targets)

## Decision Rules

- **If unsure whether behavior changes:** Do NOT apply. Ask the user.
- **If tests cannot be written:** Apply only safe, mechanical refactorings (rename, extract constant). Flag risky ones for user review.
- **If codebase has no tests and is too large:** Focus on the specific area the user wants refactored. Write targeted tests for that area only.
- **If user asks for "quick cleanup":** Skip new tests but run existing ones. Apply only low-risk refactorings.
