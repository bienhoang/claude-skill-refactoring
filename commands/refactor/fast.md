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

If `commands.fast.default_flags` exists in `.refactoring.yaml`, apply those as defaults. Explicit CLI flags replace conflicting config flags. Example: config `["--safe"]` + CLI `--no-tests` → final behavior is `--no-tests` (explicit user intent wins).

Default (no flags): run existing tests only, do not write new tests.

## Workflow

### 1. Scout
Use `scout` subagent to read target files/directories and understand code structure.

### 1.5. Git Prep
If `workflow.git_suggestions` is not `false` and uncommitted changes detected, suggest stashing: "Uncommitted changes found. Suggest running `git stash --include-untracked` before refactoring." Proceed regardless of user's choice — this is a suggestion only.

### 1.7. Config & History
Load `.refactoring.yaml` if it exists:
- Apply `thresholds` (override metrics.md defaults)
- Apply `ignore` patterns (filter analysis results)
- Apply `custom_smells` (add to detection)
- Apply `severity_overrides`
- Apply `workflow` settings to control phases and features
- Apply `commands.fast` defaults (already handled in Argument Parsing)
- Apply `priority` weights to ROI formula
If `.refactoring-history.json` exists and `workflow.history_tracking` is not `false`, note trend silently (used in Report).
If YAML is malformed, warn and continue with defaults.
**Precedence:** CLI flags > `.refactoring.yaml` > skill defaults.

### 2. Analyze
Load `references/code-smells.md`. Scan target code for smells silently (do not report to user — this is fast mode).

Prioritize by severity:
1. Security vulnerabilities (Critical/High)
2. Correctness risks
3. High-impact structural smells (God Class, Long Method, Feature Envy)
4. Duplication (DRY violations)
5. Naming and readability

### 3. Safeguard
If `workflow.skip_phases` contains `safeguard` in config: emit "⚠️ Safeguard phase skipped by config — no test safety net." and skip to Transform.

Based on flag mode:
- **Default**: Check for existing tests. Run them to establish baseline. If they pass, proceed.
- **`--safe`**: Write characterization tests for the target code first, then run them to establish baseline.
- **`--no-tests`**: Use `AskUserQuestion` to confirm: "⚠️ --no-tests flag detected. Refactoring without test verification is risky. Proceed anyway?" Options: "Yes, skip tests" / "No, run existing tests instead". Only proceed without tests if user explicitly confirms.

### 3.5. Parallel Check (directory targets only)
If `workflow.parallel` is `false` in config, skip this step and proceed sequentially.

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
- **Commit per transformation:** If `workflow.git_suggestions` is not `false`, after each successful transformation + test pass, suggest committing: `git commit -m 'refactor: <description>'`
- **Discovery:** Load `references/languages/_index.md`, identify language file(s), load them, execute Discovery section to detect project conventions.
- Apply language-specific patterns from loaded language file(s).
- Output refactorings in two sections: **Aligned Refactorings** + **Convention Improvements**.

### 5. Verify
If `workflow.skip_phases` contains `verify` in config: emit "⚠️ Verify phase skipped by config — changes not test-verified." and skip to Report.

After each transformation (unless `--no-tests`):
1. Run the test suite (auto-detect: pytest, jest/vitest, go test, cargo test, etc. based on project config)
2. If any test fails → **revert immediately** using `git restore <changed-files>`, then skip to next planned refactoring or stop
3. If all pass → continue to next transformation

### 6. Report
If `workflow.skip_phases` contains `report` in config: skip report output (still write history unless disabled).

Present summary to user:
- Smells found (count by severity)
- Refactoring methods applied and why
- Before/after key metrics (complexity, duplication, line count)
- Test results summary
- Trend comparison (if history exists): "vs last session: complexity ↓12%, smells ↓3"
- Remaining smells or suggested follow-ups

If `workflow.report_format` is `minimal`: output severity counts + metrics table only.
If `workflow.save_reports` is `true`: auto-save report to `./reports/` without prompting.
Otherwise, offer to save report.

If `workflow.history_tracking` is not `false`, append session entry to `.refactoring-history.json` (create if it doesn't exist).

## Safety Rules
- Never batch multiple refactorings without intermediate verification
- Revert on test failure — use `git restore <changed-files>` to restore previous state
- If unsure whether behavior changes → skip that refactoring (do not ask in fast mode, just skip)
- If a subagent (scout, tester) fails → report error and stop gracefully, do not proceed with incomplete information
- If work was stashed in Git Prep step, remind user to `git stash pop` after completion
