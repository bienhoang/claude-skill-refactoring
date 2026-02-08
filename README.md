# claude-skill-refactoring

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) skill for **systematic code refactoring** — detect code smells, apply safe transformations, and verify correctness with tests.

## What it does

When you ask Claude Code to refactor your code, this skill guides it through a structured workflow:

1. **Analyze** — Scan for 25+ code smells (God Class, Long Method, Feature Envy, Duplicate Code, etc.) and report severity
2. **Safeguard** — Check for existing tests; write characterization tests if none exist
3. **Transform** — Apply refactoring methods one at a time (Extract Method, Replace Conditional with Polymorphism, etc.)
4. **Verify** — Run tests after each transformation; revert immediately if anything breaks
5. **Report** — Summarize what changed, what improved, and what to tackle next

### Included references

| File | Contents |
|------|----------|
| `references/code-smells.md` | 25+ code smells organized by category (Bloaters, OO Abusers, Change Preventers, Dispensables, Couplers, Complexity, Naming) |
| `references/refactoring-methods.md` | 30+ refactoring techniques with step-by-step mechanics |
| `references/metrics.md` | Quantitative thresholds — cyclomatic/cognitive complexity, coupling, cohesion, size limits |
| `references/security-smells.md` | OWASP Top 10 code patterns, hardcoded secrets detection, language-specific security risks |
| `references/prioritization.md` | ROI scoring formula, Fix/Defer/Accept decision tree, quick-win identification |
| `references/dependency-analysis.md` | Circular dependency detection, import graph analysis, module coupling checklist, per-language tools |
| `references/design-patterns.md` | Smell-to-pattern mapping, YAGNI gate, modern alternatives, anti-patterns to avoid |
| `references/migration-patterns.md` | Step-by-step migration sequences: callback→async, class→functional, monolith→service, sync→async, ORM |
| `references/ci-integration.md` | GitHub Actions pipeline, pre-commit hooks, quality gate definitions (hard/soft blocks), integration guidance |
| `references/architecture/architectural-styles.md` | 8 architectural styles with detection heuristics, confidence scoring, transition matrix |
| `references/architecture/architectural-patterns.md` | 13 architectural patterns with YAGNI gates, smell-to-pattern mapping |
| `references/architecture/architectural-smells.md` | 12 architectural smells (Structure, Boundary, Distribution) with measurable detection |
| `references/languages/` | Per-language refactoring patterns with convention discovery (Python, JS/TS, Java, Go, Rust, PHP, Ruby, C#, Swift, Kotlin, C/C++, Dart, Scala, Elixir, Shell/Bash, Lua) |

## Installation

### Via npm (recommended)

```bash
# Global — available in all projects
npm install -g claude-skill-refactoring

# Project-level — available only in this project
npm install --save-dev claude-skill-refactoring
```

### Manual (git clone)

```bash
# Global
git clone https://github.com/bienhoang/claude-skill-refactoring.git ~/.claude/skills/refactoring

# Project-level
git clone https://github.com/bienhoang/claude-skill-refactoring.git .claude/skills/refactoring
```

## Usage

Once installed, the skill activates automatically when you ask Claude Code to refactor. You can also use slash commands for more control.

```
# Natural language — Claude detects the skill automatically
"refactor this code"
"this code is messy, clean it up"
"reduce duplication in this module"
"this class is too large, help me split it"
"improve the code quality of src/utils.ts"

# Or use slash commands (see below)
/refactor src/utils.ts
```

## Slash Commands

Once installed, you get six slash commands:

### `/refactor [target]` — Intelligent Router

Automatically detects the best approach based on intent and scope:
- Architecture/arch-review keywords → routes to `/refactor:architecture`
- Review/analyze/audit keywords → routes to `/refactor:review`
- Single file → routes to `/refactor:fast`
- Directory or module → routes to `/refactor:plan`
- Plan file path → routes to `/refactor:implement`

### `/refactor:architecture [target-directory]` — Architectural Analysis

Deep architectural analysis: detect style, scan for arch-level smells, recommend patterns. Read-only (no code modifications). Requires directory target.

**Examples:**
```
/refactor:architecture src/
/refactor:architecture src/services/
/refactor:architecture . "focus on boundary violations"
```

### `/refactor:review [target]` — Read-Only Analysis

Scan code for smells, score with quantitative metrics, and generate a prioritized report. No code modifications.

**Examples:**
```
/refactor:review src/utils.ts
/refactor:review src/services/
/refactor:review src/legacy/ "focus on security"
```

### `/refactor:fast [target] [flags]` — Autonomous Refactoring

Fully autonomous: review code, apply refactoring, verify tests — no interaction needed.

**Flags:**
- `--safe` — write characterization tests before refactoring
- `--no-tests` — skip test verification (use with caution)

**Examples:**
```
/refactor:fast src/utils.ts
/refactor:fast src/services/ --safe
/refactor:fast src/legacy.js --no-tests
```

### `/refactor:plan [target]` — Collaborative Planning

Brainstorm with you, create a detailed refactoring plan with phases.

**Examples:**
```
/refactor:plan src/services/
/refactor:plan src/core/ "focus on reducing duplication"
```

### `/refactor:implement [plan-path|target]` — Execute Refactoring

Execute a refactoring plan phase by phase, or review-then-apply without a plan.

**Examples:**
```
# With plan
/refactor:implement plans/refactor-services/plan.md

# Without plan (review-then-apply)
/refactor:implement src/utils.ts
```

## Configuration (optional)

Create `.refactoring.yaml` in your project root to customize behavior. All fields are optional — missing fields use skill defaults. No config file = default behavior.

**Minimal example:**

```yaml
# .refactoring.yaml
thresholds:
  max_method_lines: 30
  max_cyclomatic_complexity: 12
ignore:
  - "**/generated/**"
  - "**/migrations/**"
```

**Full schema** (all sections optional):

```yaml
# .refactoring.yaml — all fields optional

thresholds:              # Override metrics.md defaults
  max_method_lines: 20
  max_class_lines: 250
  max_file_lines: 500
  max_parameters: 5
  max_cyclomatic_complexity: 10
  max_cognitive_complexity: 10

custom_smells:           # Add project-specific smell detectors
  - name: "Raw SQL"
    pattern: "query.*\\+"
    severity: critical

ignore:                  # Glob patterns to exclude from analysis
  - "**/generated/**"
  - "**/vendor/**"

severity_overrides:      # Override built-in smell severity
  Long Method: minor

workflow:                # Control skill behavior
  skip_phases: []        # safeguard | verify | report
  parallel: true         # parallel refactoring for directories
  git_suggestions: true  # suggest stash/commit/branch
  history_tracking: true # read/write .refactoring-history.json
  report_format: markdown  # markdown | minimal
  save_reports: false    # auto-save reports

commands:                # Per-command defaults (CLI flags override)
  fast:
    default_flags: []    # e.g., ["--safe"]
  review:
    save_report: false
  plan:
    branch_prefix: "refactor/"
  implement:
    commit_per_step: true

priority:                # Tune ROI scoring formula weights
  severity_weight: 1
  frequency_weight: 1
  impact_weight: 1
  effort_divisor: 1

architecture:            # Architectural analysis settings
  style: ""              # Override auto-detection (e.g., "hexagonal")
  strict_boundaries: false  # Treat boundary violations as critical
  infra_scan: true       # Scan Docker/K8s/Terraform for hints
  ignore_patterns: []    # Glob patterns to skip in arch analysis
```

See `SKILL.md` for detailed behavior of each section.

### Migrating from v2 (.refactoring-config.json)

1. Rename `.refactoring-config.json` to `.refactoring.yaml`
2. Convert JSON syntax to YAML
3. Rename `ignore_patterns` → `ignore`
4. New sections available: `workflow`, `commands`, `priority`

If both files exist, `.refactoring.yaml` takes precedence and the skill will warn about the legacy JSON file.

### Migrating from v3

v4.0.0 restructures the skill architecture for token optimization:
- SKILL.md is now a concise workflow (<5k tokens) — detailed instructions moved to REFERENCE.md
- Templates extracted to `resources/templates/`
- New validation script: `python3 scripts/validate-skill.py .`

No changes to `.refactoring.yaml` config, slash commands, or behavior.

## History Tracking (optional)

The skill automatically appends session entries to `.refactoring-history.json` after each refactoring run (not after review-only). This enables trend tracking across sessions:

```
Previous session: 15 smells found, 12 fixed. Trend: improving
```

Disable with `workflow.history_tracking: false` in `.refactoring.yaml`. Consider adding `.refactoring-history.json` to `.gitignore` if you don't want to track it in version control.

## How it works

Claude Code loads skills from `~/.claude/skills/` (global) or `.claude/skills/` (project). This package copies the skill files and slash commands to the appropriate locations on `npm install` and removes them on `npm uninstall`.

```
~/.claude/skills/refactoring/
├── SKILL.md                          # Core workflow (<5k tokens)
├── REFERENCE.md                      # Detailed phase instructions (on-demand)
├── resources/
│   └── templates/
│       ├── report-template.md        # Refactoring report template
│       ├── session-history-schema.json # Session history JSON schema
│       └── config-schema.yaml        # Full .refactoring.yaml example
└── references/
    ├── code-smells.md                # Smell catalog (loaded when analyzing)
    ├── refactoring-methods.md        # Method catalog (loaded when transforming)
    ├── metrics.md                    # Quantitative scoring thresholds
    ├── security-smells.md            # Security pattern detection
    ├── prioritization.md             # ROI-based fix ordering
    ├── dependency-analysis.md        # Import graph and coupling analysis
    ├── design-patterns.md            # Smell-to-pattern mapping
    ├── migration-patterns.md         # Paradigm migration sequences
    ├── ci-integration.md             # CI/CD pipeline and quality gates
    ├── architecture/
    │   ├── architectural-styles.md   # 8 styles + detection heuristics
    │   ├── architectural-patterns.md # 13 patterns + YAGNI gates
    │   └── architectural-smells.md   # 12 smells + measurable detection
    └── languages/                    # Per-language patterns with convention discovery
        ├── _index.md                 # Language routing (extensions → file mapping)
        ├── python.md
        ├── javascript-typescript.md
        ├── java.md
        ├── go.md
        ├── rust.md
        ├── php.md
        ├── ruby.md
        ├── csharp.md
        ├── swift.md
        ├── kotlin.md
        ├── cpp.md
        ├── dart.md
        ├── scala.md
        ├── elixir.md
        ├── shell-bash.md
        └── lua.md

~/.claude/commands/
├── refactor.md                       # Router (intelligent routing)
└── refactor/
    ├── review.md                     # /refactor:review (read-only analysis)
    ├── fast.md                       # /refactor:fast
    ├── plan.md                       # /refactor:plan
    ├── implement.md                  # /refactor:implement
    └── architecture.md              # /refactor:architecture (arch analysis)
```

SKILL.md is a concise workflow (<5k tokens). Detailed strategies, configuration schema, and templates are in REFERENCE.md and resources/templates/, loaded on-demand using Claude's progressive disclosure pattern.

## Uninstall

```bash
npm uninstall -g claude-skill-refactoring
# or for project-level
npm uninstall claude-skill-refactoring
```

## License

MIT
