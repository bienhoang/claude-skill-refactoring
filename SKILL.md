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

**Load project config and history (if they exist):**
- If `.refactoring.yaml` exists: load it, apply config sections (see Project Configuration below for full schema and behavior)
- If `.refactoring-history.json` exists and `workflow.history_tracking` is not `false` in config: display trend summary to user before analysis

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

Present to the user using this structure:

```
## Refactoring Report: [target]

### Dependency Graph (multi-file targets only)
​```mermaid
graph LR
  A[ModuleA] --> B[ModuleB]
  B --> C[ModuleC]
​```

### Severity Summary
| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | Resolved |
| Major | 3 | 2 Resolved, 1 Remaining |
| Minor | 5 | 3 Resolved, 2 Deferred |

### Metrics (Before → After)
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Avg Cyclomatic | 18 | 11 | -39% |
| Lines of Code | 450 | 380 | -16% |

### Methods Applied
[List each refactoring technique and why it was chosen]

### Remaining Smells
[Any deferred or new issues for follow-up]
```

Optionally offer to save report to `./reports/refactoring-report-{YYYY-MM-DD-HHMM}.md`.

**Session history:** Append session entry to `.refactoring-history.json` (create file if it doesn't exist). Include timestamp, target, command, smells found/fixed counts, methods applied, and before/after metrics.

## Language-Specific Guidance

### Discovery Workflow
Before analyzing code, detect language conventions:
1. Identify language(s) from file extensions
2. Load `references/languages/_index.md` to find correct language file(s)
3. Load the relevant language file(s) from `references/languages/`
4. Execute the **Discovery** section — scan for config files, infer conventions
5. Use discovered conventions throughout analysis and transformation phases
6. Output two sections: **Aligned Refactorings** (respect conventions) + **Convention Improvements** (suggest better practices with reasoning)

Read the appropriate language file(s) from `references/languages/` for language-specific refactoring patterns covering 16 languages: Python, JS/TS, Java, Go, Rust, PHP, Ruby, C#, Swift, Kotlin, C/C++, Dart, Scala, Elixir, Shell/Bash, and Lua.

## Git Strategy

Suggest (never force) these git practices to the user:

- **Before starting:** If uncommitted changes exist, suggest `git stash --include-untracked` to save work-in-progress
- **For planned refactorings:** Suggest creating a feature branch: `git checkout -b refactor/<target-name>`
- **Commit per refactoring:** After each successful transformation + test pass, suggest committing: `git commit -m 'refactor: <what-changed>'`
- **Conventional commits:** Use `refactor:` prefix for all refactoring commits
- **After completion:** If work was stashed, remind user to `git stash pop`
- **Squash option:** For many small commits, mention `git rebase -i` to squash before merging

**Important:** These are suggestions only. Follow the user's existing git workflow. Never auto-stash, auto-commit, or auto-branch without user confirmation. If `workflow.git_suggestions` is `false` in `.refactoring.yaml`, suppress all git suggestions in this section.

## Parallel Refactoring

For directory-level refactoring with many independent tasks:

1. **Detect independence:** After Analyze, check dependency graph (via `references/dependency-analysis.md`) for tasks with no shared file dependencies
2. **Group into batches:** Tasks that touch different files can run in parallel batches
3. **Execute:** Dispatch one subagent per batch for parallel execution
4. **Merge and verify:** Collect results, run full test suite to catch interaction issues
5. **Fallback:** If dependency analysis is unavailable or unclear, default to sequential execution

Only parallelize when: target is a directory/module (not single file), 3+ independent tasks identified, and no shared file dependencies within batches. If `workflow.parallel` is `false` in `.refactoring.yaml`, always use sequential execution regardless of independence.

## Project Configuration

Optional project-level customization via `.refactoring.yaml` in project root. All sections and fields are optional — missing fields use skill defaults. No config file = default behavior.

```yaml
# .refactoring.yaml — all fields optional

# Analysis thresholds (override metrics.md defaults)
thresholds:
  max_method_lines: 20       # default: ≤20 good, 20-50 acceptable, 50+ refactor
  max_class_lines: 250       # default: 250 (good), 500+ triggers refactor
  max_file_lines: 500        # default: 500 (good), 1000+ triggers split
  max_parameters: 5          # default: 5, 6+ triggers refactor
  max_cyclomatic_complexity: 10  # default: 10 (low risk), 25+ critical
  max_cognitive_complexity: 10   # default: 10 (good), 15+ triggers refactor

# Custom smell detectors (added to built-in catalog)
custom_smells:
  - name: "Raw SQL"
    pattern: "query.*\\+"     # regex matched against code text
    severity: critical         # critical | major | minor

# File exclusion patterns (filter analysis results, not discovery)
ignore:
  - "**/generated/**"
  - "**/migrations/**"
  - "**/vendor/**"

# Override built-in smell severity levels
severity_overrides:
  Long Method: minor
  Duplicate Code: major

# Workflow behavior
workflow:
  skip_phases: []             # safeguard | verify | report (analyze/transform not skippable)
  parallel: true              # enable parallel refactoring for directory targets
  git_suggestions: true       # suggest stash/commit/branch operations
  history_tracking: true      # read/write .refactoring-history.json
  report_format: markdown     # markdown (full) | minimal (metrics + counts only)
  save_reports: false         # auto-save reports without prompting

# Per-command defaults (CLI flags override these)
commands:
  fast:
    default_flags: []         # e.g., ["--safe"] to always write characterization tests
  review:
    save_report: false        # auto-save review reports
  plan:
    branch_prefix: "refactor/"  # git branch prefix for suggestions
  implement:
    commit_per_step: true     # suggest commit after each transformation

# Priority scoring weights (tune ROI formula)
priority:
  severity_weight: 1          # multiplier for Severity in formula
  frequency_weight: 1         # multiplier for Frequency in formula
  impact_weight: 1            # multiplier for Impact in formula
  effort_divisor: 1           # multiplier for Effort divisor in formula
```

**Loading:** At start of Analyze (after Scout), check for `.refactoring.yaml`. If found, read as text and apply each section:
- `thresholds` → override metrics.md default values
- `custom_smells` → add to built-in smell detection list
- `ignore` → filter analysis results (Scout still reads broadly for context)
- `severity_overrides` → change built-in smell severity levels
- `workflow` → control phase execution, features, and report behavior (see Workflow Overrides below)
- `commands` → set per-command defaults (see Command Defaults below)
- `priority` → tune ROI scoring formula weights (see Priority Weights below)

**Validation:** Warn on malformed YAML or unrecognized fields, continue with valid fields + defaults. Thresholds must be positive numbers. Severity values must be `critical`, `major`, or `minor`. `skip_phases` values must be `safeguard`, `verify`, or `report`. Priority weights must be positive numbers (>0). `default_flags` must be a list of strings.

**Precedence:** CLI flags > `.refactoring.yaml` > skill defaults. Explicit user input always wins.

### Workflow Overrides

When `.refactoring.yaml` contains a `workflow` section:

- **`skip_phases`** — Skip named phases during refactoring. Only `safeguard`, `verify`, and `report` can be skipped. `analyze` and `transform` are always executed.
  - If `safeguard` skipped: emit warning "⚠️ Safeguard phase skipped by config — no test safety net."
  - If `verify` skipped: emit warning "⚠️ Verify phase skipped by config — changes not test-verified."
  - If `report` skipped: still write session history (unless `history_tracking` is false).
- **`parallel`** — When `false`, always use sequential execution even for directory targets with independent tasks.
- **`git_suggestions`** — When `false`, suppress all git stash/commit/branch suggestions.
- **`history_tracking`** — When `false`, do not read or write `.refactoring-history.json`.
- **`report_format: minimal`** — Abbreviated report: severity counts + metrics table only (no dependency graph, no methods list, no remaining smells section).
- **`save_reports`** — When `true`, auto-save reports to `./reports/` without prompting.

### Command Defaults

Per-command defaults from `commands` section are applied before CLI flags. CLI flags always win (explicit user intent overrides config).

- **`commands.fast.default_flags`** — List of flags applied as if the user typed them. Example: `["--safe"]` makes every `/refactor:fast` run write characterization tests by default. If user passes `--no-tests` explicitly, it overrides `--safe` from config.
- **`commands.review.save_report`** — When `true`, auto-save review reports without asking.
- **`commands.plan.branch_prefix`** — Custom prefix for git branch suggestions (default: `refactor/`).
- **`commands.implement.commit_per_step`** — When `false`, suppress commit suggestions after each transformation.

### Priority Weights

The ROI scoring formula from `references/prioritization.md` can be tuned via `priority` weights:

```
Default:  Score = (Severity x Frequency x Impact) / Effort
Weighted: Score = (Severity*sw x Frequency*fw x Impact*iw) / (Effort*ed)
```

Where `sw`, `fw`, `iw`, `ed` are the weight values from config (all default to 1 = equal weight). Higher weight = more influence on final score. Example: `severity_weight: 3` triples severity's contribution to priority score.

## Session History

Optional trend tracking via `.refactoring-history.json` in project root (suggest adding to `.gitignore`):

```json
{
  "version": 1,
  "sessions": [{
    "timestamp": "2026-02-08T10:30:00Z",
    "target": "src/services/",
    "command": "refactor:fast",
    "smells_found": { "critical": 2, "major": 5, "minor": 8 },
    "smells_fixed": { "critical": 2, "major": 4, "minor": 3 },
    "methods_applied": ["Extract Method", "Move Method"],
    "metrics": { "before": { "avg_complexity": 18 }, "after": { "avg_complexity": 11 } }
  }]
}
```

**Reading:** At start of Analyze, if history exists and `workflow.history_tracking` is not `false` in `.refactoring.yaml`, display trend summary: "Previous session: X smells found, Y fixed. Trend: [improving/stable/declining]." Trend logic compares last two sessions: improving = smells_found decreased, stable = within ±20%, declining = smells_found increased.
**Writing:** At end of Report, append session entry. Create file if it doesn't exist. Skip if `workflow.history_tracking` is `false` in config.
**Append-only.** Never delete entries. Git-friendly (one entry per session).

## Context Optimization

Strategies for efficient analysis of large codebases:

- **Large files (>500 lines):** Prefer reading structure first — scan for `class `, `def `, `function `, `export` signatures to build a map. Identify hotspots by size and nesting depth, then deep-dive on flagged sections.
- **Progressive deepening:** Scan (signatures + line counts) → Surface (first-pass smell count per section) → Deep dive (full analysis on worst-scoring sections).
- **Chunking:** Prefer splitting at logical boundaries (class, module, function). Avoid splitting mid-function when possible.
- **Reference loading:** Load `code-smells.md` for all analyses. Load other references only when their domain is relevant. Prefer loading 1 reference thoroughly over 3 partially.
- **Multi-file targets:** Build file list first, then analyze in priority order (largest/most-imported files first). Focus on key findings rather than exhaustively scanning every file.

## Decision Rules

- **If unsure whether behavior changes:** Do NOT apply. Ask the user.
- **If tests cannot be written** (e.g., tightly coupled to external systems): Apply only safe, mechanical refactorings (rename, extract constant, reorder parameters). Flag risky refactorings for user review.
- **If the codebase has no tests and is too large to characterize:** Focus on the specific area the user wants refactored. Write targeted tests for that area only.
- **If the user asks for "quick cleanup":** Skip writing new tests but still run existing ones. Apply only low-risk refactorings (rename, extract method, remove dead code).
