# Refactoring Skill Reference

This file contains detailed reference material for the refactoring skill. Loaded on-demand by Claude when SKILL.md points here.

## Characterization Test Strategy

Identify the public API / entry points of the code being refactored:
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

## Common Transformation Sequences

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

## Report Template

See `resources/templates/report-template.md` for the full report template with placeholders.

Present report using the template structure: Dependency Graph (multi-file only), Severity Summary, Metrics (Before → After), Methods Applied, Remaining Smells. Optionally offer to save to `./reports/refactoring-report-{YYYY-MM-DD-HHMM}.md`.

## Session History

Optional trend tracking via `.refactoring-history.json` in project root (suggest adding to `.gitignore`). Format: see `resources/templates/session-history-schema.json` for the full JSON schema.

**Reading:** At start of Analyze, if history exists and `workflow.history_tracking` is not `false` in `.refactoring.yaml`, display trend summary: "Previous session: X smells found, Y fixed. Trend: [improving/stable/declining]." Trend logic compares last two sessions: improving = smells_found decreased, stable = within ±20%, declining = smells_found increased.
**Writing:** At end of Report, append session entry. Create file if it doesn't exist. Skip if `workflow.history_tracking` is `false` in config.
**Append-only.** Never delete entries. Git-friendly (one entry per session).

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

Optional project-level customization via `.refactoring.yaml` in project root. All sections and fields are optional — missing fields use skill defaults. No config file = default behavior. Schema: see `resources/templates/config-schema.yaml` for the full example with all fields and defaults.

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

## Context Optimization

Strategies for efficient analysis of large codebases:

- **Large files (>500 lines):** Prefer reading structure first — scan for `class `, `def `, `function `, `export` signatures to build a map. Identify hotspots by size and nesting depth, then deep-dive on flagged sections.
- **Progressive deepening:** Scan (signatures + line counts) → Surface (first-pass smell count per section) → Deep dive (full analysis on worst-scoring sections).
- **Chunking:** Prefer splitting at logical boundaries (class, module, function). Avoid splitting mid-function when possible.
- **Reference loading:** Load `code-smells.md` for all analyses. Load other references only when their domain is relevant. Prefer loading 1 reference thoroughly over 3 partially.
- **Multi-file targets:** Build file list first, then analyze in priority order (largest/most-imported files first). Focus on key findings rather than exhaustively scanning every file.
