---
description: ⚡ Auto review, plan & refactor without developer interaction
argument-hint: [target --safe|--no-tests]
---

Activate `refactoring` skill.

## Mission
Autonomously refactor the target code with no developer interaction:
<target>$ARGUMENTS</target>

## Argument Parsing
Parse `$ARGUMENTS` for flags:
- `--safe` → write characterization tests before refactoring
- `--no-tests` → skip test verification entirely (**emit warning before proceeding**)
- Everything else → target file path or description

Default (no flags): run existing tests only, do not write new tests.

## Workflow

### 1. Scout
Use `scout` subagent to read target files/directories and understand code structure.

### 1.5. Git Prep
If uncommitted changes detected, suggest stashing: "Uncommitted changes found. Suggest running `git stash --include-untracked` before refactoring." Proceed regardless of user's choice — this is a suggestion only.

### 1.7. Config & History
Load `.refactoring-config.json` if it exists — apply custom thresholds and ignore patterns to subsequent analysis. If `.refactoring-history.json` exists, note trend silently (used in Report). If either file has invalid JSON, warn and continue with defaults.

### 2. Analyze
Load `references/code-smells.md`. Scan target code for smells silently (do not report to user — this is fast mode).

Prioritize by severity:
1. Correctness risks
2. High-impact structural smells (God Class, Long Method, Feature Envy)
3. Duplication (DRY violations)
4. Naming and readability

### 3. Safeguard
Based on flag mode:
- **Default**: Check for existing tests. Run them to establish baseline. If they pass, proceed.
- **`--safe`**: Write characterization tests for the target code first, then run them to establish baseline.
- **`--no-tests`**: Use `AskUserQuestion` to confirm: "⚠️ --no-tests flag detected. Refactoring without test verification is risky. Proceed anyway?" Options: "Yes, skip tests" / "No, run existing tests instead". Only proceed without tests if user explicitly confirms.

### 3.5. Parallel Check (directory targets only)
If target is a directory and Analyze found 3+ independent tasks (no shared file dependencies):
1. Group tasks into parallel batches based on file independence
2. Dispatch one subagent per batch for parallel execution
3. Collect results, then run full test suite to catch interaction issues
4. If dependency analysis unavailable or unclear → skip, proceed sequentially

### 4. Transform
Load `references/refactoring-methods.md`. Apply refactoring techniques:
- **One refactoring at a time.** Apply single transformation, verify, then proceed.
- **Small steps.** Break large refactorings into sequence of small, safe transformations.
- **Preserve behavior.** External observable behavior must not change.
- **Commit per transformation:** After each successful transformation + test pass, suggest committing: `git commit -m 'refactor: <description>'`
- **Discovery:** Load `references/languages/_index.md`, identify language file(s), load them, execute Discovery section to detect project conventions.
- Apply language-specific patterns from loaded language file(s).
- Output refactorings in two sections: **Aligned Refactorings** + **Convention Improvements**.

### 5. Verify
After each transformation (unless `--no-tests`):
1. Run the test suite (auto-detect: pytest, jest/vitest, go test, cargo test, etc. based on project config)
2. If any test fails → **revert immediately** using `git restore <changed-files>`, then skip to next planned refactoring or stop
3. If all pass → continue to next transformation

### 6. Report
Present summary to user:
- Smells found (count by severity)
- Refactoring methods applied and why
- Before/after key metrics (complexity, duplication, line count)
- Test results summary
- Trend comparison (if history exists): "vs last session: complexity ↓12%, smells ↓3"
- Remaining smells or suggested follow-ups

Append session entry to `.refactoring-history.json` (create if it doesn't exist).

## Safety Rules
- Never batch multiple refactorings without intermediate verification
- Revert on test failure — use `git restore <changed-files>` to restore previous state
- If unsure whether behavior changes → skip that refactoring (do not ask in fast mode, just skip)
- If a subagent (scout, tester) fails → report error and stop gracefully, do not proceed with incomplete information
- If work was stashed in Git Prep step, remind user to `git stash pop` after completion
