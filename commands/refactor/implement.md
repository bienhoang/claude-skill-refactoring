---
description: ⚡⚡ Execute refactoring (with or without plan)
argument-hint: [plan-path|target]
---

Activate `refactoring` skill.

## Mission
Execute refactoring transformations with test verification:
<target>$ARGUMENTS</target>

## Config & History
Load `.refactoring.yaml` if it exists:
- Apply `thresholds` (override metrics.md defaults)
- Apply `ignore` patterns (filter analysis results)
- Apply `custom_smells` (add to detection)
- Apply `severity_overrides`
- Apply `workflow` settings to control phases and features
- Apply `commands.implement` defaults (commit_per_step)
- Apply `priority` weights to ROI formula
If `.refactoring-history.json` exists and `workflow.history_tracking` is not `false`, display trend before starting.
If YAML is malformed, warn and continue with defaults.
**Precedence:** CLI flags > `.refactoring.yaml` > skill defaults.

## Mode Detection

**Check `$ARGUMENTS` to determine mode:**

### Mode A: With Plan
If `$ARGUMENTS` is a path to a plan `.md` file, or if an active refactoring plan exists in `./plans/`:
1. **Validate plan**: Verify file exists and contains valid YAML frontmatter with `status` field. If invalid → report error, fall back to Mode B or ask user.
2. Load `plan.md`, detect next incomplete phase (prefer IN_PROGRESS, then earliest Planned). If all phases DONE → report "All phases complete" and stop.
3. Read phase file → extract transformation tasks
4. Initialize TodoWrite with all transformation steps
5. **Safeguard**: If `workflow.skip_phases` contains `safeguard`, emit "⚠️ Safeguard phase skipped by config — no test safety net." and skip. Otherwise, check for existing tests and run baseline.
6. **For each transformation:**
   a. Apply single refactoring technique (from phase's Transformation Sequence)
   b. **Verify**: If `workflow.skip_phases` contains `verify`, skip test verification. Otherwise, run tests (auto-detect: pytest, jest/vitest, go test, cargo test, etc.)
   c. If fail → **revert using `git restore <changed-files>`**, report to user, ask whether to continue or stop
   d. If pass and `commands.implement.commit_per_step` is not `false` and `workflow.git_suggestions` is not `false` → suggest committing: `git commit -m 'refactor: <technique-applied> in <file>'`, then proceed to next
7. After all transformations in phase complete:
   - Use `code-reviewer` subagent to review changes
   - Present review results to user
   - Update phase status to DONE in plan
8. Report summary: transformations applied, tests passed, smells resolved

### Mode B: Standalone (Review-then-Apply)
If `$ARGUMENTS` is a file/directory path (not a plan) or no plan detected:
1. Use `scout` subagent to read target files
2. Load `references/code-smells.md`. Analyze code for smells.
3. Load `references/refactoring-methods.md`. Propose transformation sequence.
4. **Present findings to user** via `AskUserQuestion`:
   - Show smells found with severity
   - Show proposed transformations with expected impact
   - Options: "Apply all", "Select which to apply", "Cancel"
5. **Safeguard**: If `workflow.skip_phases` contains `safeguard`, emit warning and skip. Otherwise, check for existing tests and run baseline.
6. On confirmation → apply transformations one at a time:
   a. Apply single refactoring
   b. **Verify**: If `workflow.skip_phases` contains `verify`, skip. Otherwise, run tests (auto-detect: pytest, jest/vitest, go test, cargo test, etc.)
   c. If fail → **revert using `git restore <changed-files>`**, report, continue to next
   d. If pass and `commands.implement.commit_per_step` is not `false` and `workflow.git_suggestions` is not `false` → suggest committing: `git commit -m 'refactor: <technique-applied> in <file>'`, then proceed
7. After all transformations:
   - Use `code-reviewer` subagent to review changes
   - Present review results to user
8. Report summary

## Transformation Rules
- **One refactoring at a time** — never batch without intermediate verification
- **Preserve behavior** — external observable behavior must not change
- **Revert on failure** — use `git restore <changed-files>` to restore previous state
- **Small steps** — break large refactorings into sequence of safe transformations
- **Discovery:** Load `references/languages/_index.md`, identify language file(s), load them, execute Discovery section to detect project conventions
- Apply language-specific patterns from loaded language file(s)
- Output refactorings in two sections: **Aligned Refactorings** + **Convention Improvements**
- If a subagent (scout, tester, code-reviewer) fails → report error to user and ask how to proceed

## Report
If `workflow.skip_phases` contains `report` in config: skip report output (still write history unless disabled).

Present to user:
- Smells found vs resolved
- Refactoring methods applied and why
- Before/after metrics (complexity, duplication, line count)
- Test results summary
- Trend comparison (if history exists)
- Remaining smells or suggested follow-ups
- If plan mode: next phase recommendation

If `workflow.report_format` is `minimal`: output severity counts + metrics table only.
If `workflow.save_reports` is `true`: auto-save report to `./reports/` without prompting.

If `workflow.history_tracking` is not `false`, append session entry to `.refactoring-history.json` (create if it doesn't exist).
