---
name: refactoring
description: >
  Systematic code refactoring with code smell detection, safe transformation, and test verification.
  Use when the user asks to: refactor code, improve code quality, clean up code, reduce technical debt,
  fix code smells, simplify complex code, improve readability/maintainability, restructure code,
  extract methods/classes, reduce duplication, apply design patterns, or review code for quality issues.
  Also triggers on: "this code is messy", "hard to maintain", "too complex", "needs cleanup",
  "spaghetti code", "DRY violations", or any request to improve existing code structure without
  changing external behavior.
---

# Code Refactoring Skill

Systematic approach to improving code structure while preserving behavior. Follow the workflow below for every refactoring task.

## Core Workflow

### 1. Analyze — Detect Code Smells

Before changing anything, scan the code and identify smells.

**Load these references during analysis:**
- `references/code-smells.md` — structural smell catalog by category
- `references/metrics.md` — quantitative scoring (complexity, coupling, size thresholds)
- `references/security-smells.md` — security-relevant patterns (OWASP, secrets, language-specific)
- `references/prioritization.md` — ROI-based ranking to decide fix order

**Priority order for fixing smells:**
1. Security vulnerabilities (Critical/High from security-smells.md)
2. Correctness risks (mutable default args, unclosed resources)
3. High-impact structural smells (God Class, Long Method, Feature Envy)
4. Duplication (DRY violations, copy-paste patterns)
5. Naming and readability issues
6. Minor style issues

Score findings using metrics.md thresholds, then rank with prioritization.md. Report findings to the user with severity (critical/major/minor) before proceeding.

### 2. Safeguard — Ensure Tests Exist Before Refactoring

**Never refactor without a safety net.** Before applying any transformation:

1. **Check for existing tests.** Look for test files, test directories, CI configs.
2. **If tests exist:** Run them first. Confirm they pass. Record the baseline.
3. **If no tests exist:** Write characterization tests that capture current behavior before refactoring.

**Characterization test strategy:**
- Identify the public API / entry points of the code being refactored
- Write tests that exercise current behavior including edge cases
- For functions: test typical inputs, boundary values, error cases
- For classes: test public methods, state transitions, interactions
- For APIs: test request/response contracts
- Use the project's existing test framework; if none exists, choose the standard for the language (pytest for Python, Jest/Vitest for JS/TS, JUnit for Java, go test for Go, etc.)

```
# Pattern: Characterization test
def test_existing_behavior_description():
    """Captures current behavior before refactoring."""
    result = function_under_refactor(known_input)
    assert result == observed_current_output  # Lock in behavior
```

**Integration test additions when refactoring crosses boundaries:**
- If refactoring touches multiple modules/classes, add integration tests covering their interaction
- If refactoring changes internal interfaces, test the contracts between components
- If refactoring modifies data flow, test end-to-end data transformations

**Advanced testing strategies (suggest when appropriate):**
- **Property-based testing:** For pure functions and data transformations — generates random inputs to find edge cases (Hypothesis for Python, fast-check for JS/TS, QuickCheck for Haskell/Erlang)
- **Snapshot/approval testing:** For complex outputs (serialization, template rendering, CLI output) — captures output and flags changes for review
- **Contract testing:** For API boundaries and service interfaces — verifies request/response schemas remain compatible after refactoring
- **Mutation testing awareness:** After refactoring completes, suggest running mutation tests (mutmut for Python, Stryker for JS/TS) to validate test quality. If tests pass after code mutations, the tests are too weak.

### 3. Transform — Apply Refactoring Methods

Apply refactoring techniques from `references/refactoring-methods.md`.

**Conditional references (load only when relevant — skip for single-file mechanical refactorings like rename, extract method, remove dead code):**
- For architectural smells (God Class, Feature Envy, tight coupling, circular deps): also load `references/design-patterns.md` for smell-to-pattern mapping and YAGNI gate
- For multi-file/module refactoring: load `references/dependency-analysis.md` to understand import graph and verify boundaries before and after changes
- For migration refactorings (callback→async, class→functional, monolith→service, sync→async, ORM switch): load `references/migration-patterns.md` for step-by-step migration sequences

Key principles:

- **One refactoring at a time.** Apply a single transformation, verify tests pass, then proceed.
- **Small steps.** Break large refactorings into a sequence of small, safe transformations.
- **Preserve behavior.** The external observable behavior must not change (unless the user explicitly requests behavior changes alongside refactoring).
- **Commit points.** After each successful transformation + test pass, note it as a safe rollback point.

**Common transformation sequences:**

| Smell | Refactoring Sequence |
|-------|---------------------|
| Long Method | Extract Method → Introduce Parameter Object (if many params) |
| God Class | Extract Class → Move Method → Delegate |
| Feature Envy | Move Method → Extract Method if partial envy |
| Duplicate Code | Extract Method → Pull Up Method (if in siblings) |
| Long Parameter List | Introduce Parameter Object → Replace Params with Method |
| Switch Statements | Replace Conditional with Polymorphism |
| Data Clumps | Extract Class → Introduce Parameter Object |
| Primitive Obsession | Replace Primitive with Value Object |
| Deep Nesting | Replace Nested Conditional with Guard Clauses → Extract Method |

### 4. Verify — Run Tests and Validate

After each transformation:
1. Run the full test suite. All tests must pass.
2. If any test fails: **revert immediately** and investigate.
3. If all tests pass: proceed to the next transformation or finalize.

**Final verification checklist:**
- All pre-existing tests pass
- New characterization tests pass
- No behavioral changes (unless explicitly intended)
- Code coverage has not decreased
- Linting/type checking passes (if configured)

### 5. Report — Summarize Changes

Present to the user:
- Code smells found (with severity)
- Refactoring methods applied and why
- Before/after comparison of key metrics (complexity, duplication, line count)
- Test results summary
- Any remaining smells or suggested follow-up refactorings

## Language-Specific Guidance

### Discovery Workflow
Before analyzing code, detect language conventions:
1. Identify language(s) from file extensions
2. Load `references/languages/_index.md` to find correct language file(s)
3. Load the relevant language file(s) from `references/languages/`
4. Execute the **Discovery** section — scan for config files, infer conventions
5. Use discovered conventions throughout analysis and transformation phases
6. Output two sections: **Aligned Refactorings** (respect conventions) + **Convention Improvements** (suggest better practices with reasoning)

Read the appropriate language file(s) from `references/languages/` for language-specific refactoring patterns covering Python, JavaScript/TypeScript, Java, Go, Rust, PHP, Ruby, C#, Swift, and Kotlin.

## Git Strategy

Suggest (never force) these git practices to the user:

- **Before starting:** If uncommitted changes exist, suggest `git stash --include-untracked` to save work-in-progress
- **For planned refactorings:** Suggest creating a feature branch: `git checkout -b refactor/<target-name>`
- **Commit per refactoring:** After each successful transformation + test pass, suggest committing: `git commit -m 'refactor: <what-changed>'`
- **Conventional commits:** Use `refactor:` prefix for all refactoring commits
- **After completion:** If work was stashed, remind user to `git stash pop`
- **Squash option:** For many small commits, mention `git rebase -i` to squash before merging

**Important:** These are suggestions only. Follow the user's existing git workflow. Never auto-stash, auto-commit, or auto-branch without user confirmation.

## Parallel Refactoring

For directory-level refactoring with many independent tasks:

1. **Detect independence:** After Analyze, check dependency graph (via `references/dependency-analysis.md`) for tasks with no shared file dependencies
2. **Group into batches:** Tasks that touch different files can run in parallel batches
3. **Execute:** Dispatch one subagent per batch for parallel execution
4. **Merge and verify:** Collect results, run full test suite to catch interaction issues
5. **Fallback:** If dependency analysis is unavailable or unclear, default to sequential execution

Only parallelize when: target is a directory/module (not single file), 3+ independent tasks identified, and no shared file dependencies within batches.

## Decision Rules

- **If unsure whether behavior changes:** Do NOT apply. Ask the user.
- **If tests cannot be written** (e.g., tightly coupled to external systems): Apply only safe, mechanical refactorings (rename, extract constant, reorder parameters). Flag risky refactorings for user review.
- **If the codebase has no tests and is too large to characterize:** Focus on the specific area the user wants refactored. Write targeted tests for that area only.
- **If the user asks for "quick cleanup":** Skip writing new tests but still run existing ones. Apply only low-risk refactorings (rename, extract method, remove dead code).
