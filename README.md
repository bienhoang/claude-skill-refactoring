# refactoring-kit

A **universal refactoring skill for AI coding tools** — detect code smells, apply safe transformations, and verify correctness with tests. Supports **14 AI tools** including Claude Code, Cursor, Windsurf, Copilot, and more.

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

## Supported Tools

| Tool | Adapter | Format | Scope |
|------|---------|--------|-------|
| **Claude Code** | `claude-code` | `.claude/skills/` + slash commands | Global & Project |
| **Cursor** | `cursor` | `.cursor/rules/` markdown | Global & Project |
| **Windsurf** | `windsurf` | `.windsurfrules` + `.windsurf/rules/` | Global & Project |
| **Gemini CLI** | `gemini-cli` | `GEMINI.md` sections | Project |
| **Codex CLI** | `codex-cli` | `AGENTS.md` sections | Project |
| **GitHub Copilot** | `copilot` | `.github/copilot-instructions.md` + `.instructions.md` | Project |
| **Roo Code** | `roo-code` | `.roomodes` JSON + `rules-*/` directories | Project |
| **Antigravity** | `antigravity` | `.agent/skills/refactoring/` | Global & Project |
| **OpenCode** | `opencode` | `AGENTS.md` (Codex-compatible markers) | Project |
| **Continue.dev** | `continue-dev` | `.prompt` files (Handlebars) | Project |
| **CodeBuddy** | `codebuddy` | `.codebuddy/commands/` markdown | Global & Project |
| **Kiro** | `kiro` | `.kiro/specs/` EARS format (limited) | Project |
| **Trae** | `trae` | `.trae/rules/` markdown (best effort) | Project |
| **Qoder** | `qoder` | `.qoder/rules/` markdown (best effort) | Project |

Run `npx refactoring-kit tools` to see the full list with capabilities.

## Installation

### Via npm (recommended)

```bash
# Global — available in all projects (Claude Code default)
npm install -g refactoring-kit

# Project-level — available only in this project
npm install --save-dev refactoring-kit
```

### Multi-tool install via CLI

```bash
# Install for specific tools
npx refactoring-kit install --tool=cursor
npx refactoring-kit install --tool=windsurf,copilot
npx refactoring-kit install --tool=cursor --global

# Preview what would be installed
npx refactoring-kit install --tool=cursor --dry-run

# Uninstall from specific tools
npx refactoring-kit uninstall --tool=cursor

# List all supported tools
npx refactoring-kit tools
```

### Manual (git clone)

```bash
# Global (Claude Code only)
git clone https://github.com/bienhoang/refactoring-kit.git ~/.claude/skills/refactoring

# Project-level (Claude Code only)
git clone https://github.com/bienhoang/refactoring-kit.git .claude/skills/refactoring
```

## Usage

Once installed, the skill activates automatically when you ask your AI tool to refactor. For Claude Code, you can also use slash commands for more control.

```
# Natural language — Claude detects the skill automatically
"refactor this code"
"this code is messy, clean it up"
"reduce duplication in this module"
"this class is too large, help me split it"
"improve the code quality of src/utils.ts"

# Or use slash commands (Claude Code only — see below)
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

The package uses an **adapter architecture** to support multiple AI coding tools. Each tool gets its own adapter that translates the canonical skill content into the tool's native format.

```bash
# Default: Claude Code adapter (via npm postinstall hook)
npm install -g refactoring-kit

# Explicit: install for specific tools
npx refactoring-kit install --tool=cursor,windsurf
```

### Claude Code layout

```
~/.claude/skills/refactoring/
├── SKILL.md                          # Core workflow (<5k tokens)
├── REFERENCE.md                      # Detailed phase instructions (on-demand)
├── resources/templates/              # Report template, schemas
└── references/                       # 22 reference files (smells, metrics, languages)

~/.claude/commands/
├── refactor.md                       # Router (intelligent routing)
└── refactor/                         # 5 subcommands (review, fast, plan, implement, architecture)
```

### Other tools

Each adapter places files in the tool's expected location:
- **Cursor**: `.cursor/rules/refactoring-skill.mdc` (with glob frontmatter)
- **Windsurf**: `.windsurfrules` section + `.windsurf/rules/` directory
- **Copilot**: `.github/copilot-instructions.md` section + `.instructions.md` files
- **Roo Code**: `.roomodes` JSON (6 custom modes) + `rules-refactoring-*/` directories
- **Continue.dev**: `.prompt` files with Handlebars template syntax
- And more — run `npx refactoring-kit tools` for the full list

SKILL.md is a concise workflow (<5k tokens). Detailed strategies, configuration schema, and templates are in REFERENCE.md and resources/templates/, loaded on-demand using Claude's progressive disclosure pattern.

## Uninstall

```bash
npm uninstall -g refactoring-kit
# or for project-level
npm uninstall refactoring-kit
```

## License

MIT
