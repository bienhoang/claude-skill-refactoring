---
description: "Architectural analysis -- detect style, scan for arch smells, recommend patterns"
argument-hint: [target-directory]
---

Activate `refactoring` skill.

## Mission
Analyze target directory for architectural style, smells, and pattern opportunities. **Do NOT modify any code.**
<target>$ARGUMENTS</target>

## Rules
- **Read-only.** Do not edit, create, or delete any files.
- **Directory targets only.** Reject single-file targets (suggest `/refactor:review` instead).
- **No history writes.** Do not write to `.refactoring-history.json`. Only code-modifying commands write history.
- **Never modify infrastructure files** (Dockerfiles, K8s manifests, Terraform). Read-only scanning for deployment hints.

## Workflow

### 1. Scout
Use `scout` subagent to read target directory structure and map modules. If scout unavailable, fall back to Glob + Read tools to gather the same information directly.

### 2. Config
Load `.refactoring.yaml` if it exists:
- Apply `architecture` section (style override, strict_boundaries, infra_scan, ignore_patterns)
- Apply `ignore` patterns (filter analysis results)
- Apply `priority` weights to ROI formula
- Apply `workflow` settings (report_format, save_reports)
If YAML malformed, warn and continue with defaults.
**Precedence:** CLI flags > `.refactoring.yaml` > skill defaults.

### 3. Detect Style
Load `references/architecture/architectural-styles.md`:
- Scan directory structure for canonical patterns (match against style detection table)
- Analyze import flow direction for style confirmation
- If `architecture.infra_scan` is not `false`: scan Docker Compose, K8s manifests, Terraform files for deployment style hints (read-only)
- If `architecture.style` is set in config: use as override, skip auto-detection, set confidence to "configured"
- Output: `Detected style: {name} (confidence: high/medium/low/configured)`

### 4. Detect Smells
Load `references/architecture/architectural-smells.md`:
- Run detection checklist against target modules
- Classify by category (Structure, Boundary, Distribution)
- **Distribution smells:** Skip when detected style is single-deployment (Layered, Hexagonal, Clean, Modular Monolith, Pipe-and-Filter). Report: "Distribution smells: N/A (single-deployment style)"
- Assign severity (critical/major/minor)
- If `architecture.strict_boundaries` is `true`: treat all boundary violations as critical

### 5. Score & Prioritize
Load `references/prioritization.md`:
- Score each finding using ROI formula with `priority` weights from config
- Sort by score descending
- Group into tiers (Quick Win, Strategic, Planned)

### 6. Map Patterns
**Skip this step entirely if smell count from Step 4 = 0.** Otherwise, load `references/architecture/architectural-patterns.md`:
- For each detected smell, lookup smell-to-pattern mapping table
- Apply YAGNI gate for each recommendation — only recommend patterns that pass the gate
- Cross-reference with detected style for compatibility
- If no patterns pass YAGNI gates, report: "No patterns recommended — all findings below YAGNI threshold"

### 7. Report
Present findings in this format:

```
## Architectural Health Report: [target]

### Detected Style
- Style: {name}
- Confidence: {high/medium/low/configured}
- Dependency flow: {description of observed import directions}

### Module Map
{Mermaid diagram of module dependencies}

### Summary
- Modules scanned: N
- Architectural smells: N (X critical, Y major, Z minor)
- Boundary violations: N
- Circular dependencies: N (module-level)

### Findings by Priority

| # | Finding | Category | Severity | Score | Location |
|---|---------|----------|----------|-------|----------|
| 1 | [smell] | Structure | Critical | 45.0 | module/path |

### Boundary Analysis
[Layer violations, import direction issues, feature-to-feature coupling]

### Pattern Recommendations

| Smell | Recommended Pattern | YAGNI Gate | Effort |
|-------|-------------------|------------|--------|
| [smell] | [pattern] | [passes/fails] | [estimate] |

### Style Assessment
- Current style strengths: [list]
- Current style tensions: [where project deviates from detected style]
- Style transition candidates: [if applicable, from transition matrix]

### Recommended Next Steps
1. [Highest priority action -- link to /refactor:plan if major restructuring]
2. [Second priority]
3. [Third priority]
```

If `workflow.save_reports` is `true`: auto-save to `./reports/arch-report-{YYYY-MM-DD-HHMM}.md`.
If `workflow.report_format` is `minimal`: output summary + findings table only.
Otherwise, offer to save.

## Empty Arguments
If `$ARGUMENTS` is empty, use `AskUserQuestion`:
- "What directory or module would you like to analyze architecturally? Provide a directory path."

## Non-Directory Target
If `$ARGUMENTS` is a single file (not directory), respond:
- "Architectural analysis requires a directory or module target. For single-file analysis, use `/refactor:review {file}`."
