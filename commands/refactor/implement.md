---
description: ⚡⚡ Execute refactoring (with or without plan)
argument-hint: [plan-path|target]
---

Activate `refactoring` skill.

## Mission
Execute refactoring transformations with test verification:
<target>$ARGUMENTS</target>

## Mode Detection

**Check `$ARGUMENTS` to determine mode:**

### Mode A: With Plan
If `$ARGUMENTS` is a path to a plan `.md` file, or if an active refactoring plan exists in `./plans/`:
1. **Validate plan**: Verify file exists and contains valid YAML frontmatter with `status` field. If invalid → report error, fall back to Mode B or ask user.
2. Load `plan.md`, detect next incomplete phase (prefer IN_PROGRESS, then earliest Planned). If all phases DONE → report "All phases complete" and stop.
3. Read phase file → extract transformation tasks
4. Initialize TodoWrite with all transformation steps
5. **For each transformation:**
   a. Apply single refactoring technique (from phase's Transformation Sequence)
   b. Run tests (auto-detect: pytest, jest/vitest, go test, cargo test, etc.)
   c. If fail → **revert using `git checkout -- <changed-files>`**, report to user, ask whether to continue or stop
   d. If pass → mark task complete, proceed to next
5. After all transformations in phase complete:
   - Use `code-reviewer` subagent to review changes
   - Present review results to user
   - Update phase status to DONE in plan
6. Report summary: transformations applied, tests passed, smells resolved

### Mode B: Standalone (Review-then-Apply)
If `$ARGUMENTS` is a file/directory path (not a plan) or no plan detected:
1. Use `scout` subagent to read target files
2. Load `references/code-smells.md`. Analyze code for smells.
3. Load `references/refactoring-methods.md`. Propose transformation sequence.
4. **Present findings to user** via `AskUserQuestion`:
   - Show smells found with severity
   - Show proposed transformations with expected impact
   - Options: "Apply all", "Select which to apply", "Cancel"
5. On confirmation → apply transformations one at a time:
   a. Apply single refactoring
   b. Run tests (auto-detect: pytest, jest/vitest, go test, cargo test, etc.)
   c. If fail → **revert using `git checkout -- <changed-files>`**, report, continue to next
   d. If pass → proceed
6. After all transformations:
   - Use `code-reviewer` subagent to review changes
   - Present review results to user
7. Report summary

## Transformation Rules
- **One refactoring at a time** — never batch without intermediate verification
- **Preserve behavior** — external observable behavior must not change
- **Revert on failure** — use `git checkout -- <changed-files>` to restore previous state
- **Small steps** — break large refactorings into sequence of safe transformations
- Read `references/language-patterns.md` for language-specific patterns when needed
- If a subagent (scout, tester, code-reviewer) fails → report error to user and ask how to proceed

## Report
Present to user:
- Smells found vs resolved
- Refactoring methods applied and why
- Before/after metrics (complexity, duplication, line count)
- Test results summary
- Remaining smells or suggested follow-ups
- If plan mode: next phase recommendation
