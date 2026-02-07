---
description: ⚡⚡⚡ Brainstorm with dev, create refactoring plan
argument-hint: [target]
---

Activate `refactoring` skill.
Activate `planning` skill.

## Mission
Analyze target code, brainstorm refactoring strategy with the developer, and create a phased implementation plan:
<target>$ARGUMENTS</target>

## Workflow

### 1. Scout
Use `scout` subagent to read target files/directories and map code structure, dependencies, and test coverage.

Load `references/dependency-analysis.md`. Map import graph for target modules and identify circular dependencies before planning phases.

Suggest creating a feature branch: "Consider creating a branch: `git checkout -b refactor/<target-name>` for this planned refactoring."

### 1.5. Config
Load `.refactoring-config.json` if it exists — apply custom thresholds and ignore patterns to subsequent analysis. If invalid JSON, warn and continue with defaults.

### 2. Analyze
Load `references/code-smells.md`. Perform thorough analysis:
- Scan all target files for code smells
- Classify by category (Bloaters, OO Abusers, Change Preventers, Dispensables, Couplers)
- Assign severity (critical/major/minor)
- Identify relationships between smells (e.g., God Class causing Feature Envy)

### 3. Present Findings
Report smell analysis to user with severity table. Then use `AskUserQuestion` to:
- Confirm which smells to prioritize
- Ask about constraints (no behavior changes? specific areas to avoid?)
- Clarify scope boundaries

### 4. Brainstorm Strategy
Load `references/refactoring-methods.md`. Consult `references/design-patterns.md` for smell-to-pattern mapping when architectural smells are present. For migration-type refactorings (callback→async, class→functional, etc.), load `references/migration-patterns.md` to identify correct migration sequence. Load `references/languages/_index.md`, identify relevant language file(s), load them, execute Discovery section to detect project conventions.
Discuss with user:
- Which refactoring techniques to apply and in what order
- Risk assessment for each transformation
- Phasing strategy (what to tackle first vs later)

### 5. Create Brainstorm Report
Save findings and decisions to `plans/reports/` using naming pattern from injected context.

Include:
- Smell analysis summary
- Agreed priorities
- Transformation strategy
- Risk notes

### 6. Create Hybrid Plan

**Plan directory structure:**
```
{plan-dir}/
├── reports/
│   └── analysis-report.md
├── plan.md
├── phase-01-{name}.md
├── phase-02-{name}.md
└── ...
```

**plan.md** must have standard YAML frontmatter:
```yaml
---
title: "Refactor: {brief description}"
description: "{one sentence}"
status: pending
priority: P2
effort: {estimated}
branch: {current git branch}
tags: [refactoring, code-quality]
created: {YYYY-MM-DD}
---
```

**Phase files** must include refactoring-specific sections:
- **Smells Targeted**: which smells this phase addresses
- **Transformation Sequence**: ordered steps with technique names from references/refactoring-methods.md
- **Files Affected**: list of files to modify
- **Behavior Preservation Notes**: what behavior must remain unchanged
- **Verification Criteria**: how to confirm success (tests, metrics)
- Standard sections: Overview, Requirements, Implementation Steps, Todo List, Success Criteria, Risk Assessment

### 7. Suggest Implementation
Use `AskUserQuestion`:
- "Run `/refactor:implement` to execute this plan?"
- "Review plan first, then decide"
- "Done for now"

## Important Notes
- **Do not implement** — this command only plans
- One phase per logical grouping of related smells
- Keep phases small enough to complete in one session
- Phase naming: use descriptive kebab-case (e.g., `phase-01-extract-god-class.md`, `phase-02-reduce-duplication.md`)
- Link brainstorm report from plan.md for context continuity
- If a subagent (scout) fails → report error to user and ask how to proceed
