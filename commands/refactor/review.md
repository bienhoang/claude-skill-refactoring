---
description: ⚡⚡ Read-only code analysis — scan, score, and report smells
argument-hint: [target]
---

Activate `refactoring` skill.

## Mission
Scan target code for smells, score severity with quantitative metrics, and generate a prioritized report. **Do NOT modify any code.**
<target>$ARGUMENTS</target>

## Rules
- **Read-only.** Do not edit, create, or delete any files.
- **No refactoring.** This command only analyzes and reports.
- If user asks to fix something, respond: "Use `/refactor:fast` or `/refactor:implement` to apply fixes."

## Workflow

### 1. Scout
Use `scout` subagent to read target files/directories and understand code structure. If scout is unavailable, fall back to Glob + Read tools to gather the same information directly.

### 2. Detect Language
Load `references/languages/_index.md`, identify language file(s), load them, execute Discovery section to detect project conventions.

### 3. Analyze Smells
Load `references/code-smells.md`. Scan target code for structural smells. Classify by category and assign severity (critical/major/minor).

### 4. Analyze Security
Load `references/security-smells.md`. Scan for security-relevant patterns (OWASP, hardcoded secrets, language-specific risks). Assign security severity.

### 5. Score Metrics
Load `references/metrics.md`. For each flagged area, estimate:
- Cyclomatic/cognitive complexity
- Method/class/file size vs thresholds
- Coupling and cohesion indicators (where observable)

### 6. Prioritize
Load `references/prioritization.md`. Score each finding using `(Severity x Frequency x Impact) / Effort`. Sort by score descending. Group into tiers.

### 7. Report
Present findings to user in this format:

```
## Code Review: [target]

### Summary
- Files scanned: N
- Total findings: N (X critical, Y major, Z minor)
- Security findings: N
- Estimated debt rating: [A-E]

### Findings by Priority

| # | Finding | Severity | Score | Tier | Location |
|---|---------|----------|-------|------|----------|
| 1 | [smell] | Critical | 45.0 | Quick Win | file:line |
| 2 | [smell] | Major | 22.5 | Strategic | file:line |
| ...

### Security Findings
[Separate section for any security smells detected]

### Metrics Snapshot
[Key metric values for the worst-scoring areas]

### Recommended Next Steps
- Tier 1 (Quick Wins): [summary]
- Tier 2 (Strategic): [summary]
- Tier 3 (Planned): [summary]
```

## Empty Arguments
If `$ARGUMENTS` is empty, use `AskUserQuestion`:
- "What would you like to review? Provide a file path, directory, or glob pattern."
