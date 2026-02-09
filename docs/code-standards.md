# Code Standards & Codebase Structure

## Directory Structure

```
refactoring-kit/
├── SKILL.md                           # Core workflow (<5k tokens)
├── REFERENCE.md                       # Detailed phase instructions (on-demand)
├── README.md                          # User-facing documentation
├── CHANGELOG.md                       # Version history
├── package.json                       # npm metadata (v7.0.0, bin entry for cli.js)
├── cli.js                             # Commander-based CLI (NEW — Phase 02)
├── .claude-skill.json                 # Skill registration
├── LICENSE                            # MIT license
│
├── adapters/                          # Multi-tool adapters (14 tools)
│   ├── registry.js                    # Convention-based adapter registry
│   ├── base-adapter.js                # Abstract base class
│   ├── content-utils.js               # Content transformation utilities
│   ├── claude-code.js                 # Tier 1: Claude Code adapter
│   ├── cursor.js                      # Tier 1: Cursor adapter
│   ├── windsurf.js                    # Tier 1: Windsurf adapter
│   ├── gemini-cli.js                  # Tier 1: Gemini CLI adapter
│   ├── codex-cli.js                   # Tier 1: Codex CLI adapter
│   ├── copilot.js                     # Tier 2: GitHub Copilot adapter
│   ├── roo-code.js                    # Tier 2: Roo Code adapter
│   ├── antigravity.js                 # Tier 2: Antigravity adapter
│   ├── opencode.js                    # Tier 2: OpenCode adapter
│   ├── continue-dev.js                # Tier 3: Continue.dev adapter
│   ├── codebuddy.js                   # Tier 3: CodeBuddy adapter
│   ├── kiro.js                        # Tier 3: Kiro adapter (limited)
│   ├── trae.js                        # Tier 4: Trae adapter (best-effort)
│   └── qoder.js                       # Tier 4: Qoder adapter (best-effort)
│
├── resources/
│   └── templates/
│       ├── report-template.md         # Refactoring report template
│       ├── session-history-schema.json # Session history JSON schema
│       └── config-schema.yaml         # Full .refactoring.yaml example
│
├── scripts/
│   └── validate-skill.py             # 30-point skill validation script
│
├── commands/                          # CLI slash commands
│   ├── refactor.md                    # /refactor — intelligent router
│   └── refactor/
│       ├── review.md                  # /refactor:review — read-only analysis
│       ├── fast.md                    # /refactor:fast — autonomous refactoring
│       ├── plan.md                    # /refactor:plan — collaborative planning
│       ├── implement.md               # /refactor:implement — plan execution
│       └── architecture.md            # /refactor:architecture — arch analysis
│
├── references/                        # AI-loadable knowledge bases
│   ├── code-smells.md                 # 25+ structural smells (250+ LOC)
│   ├── refactoring-methods.md         # 30+ transformation techniques (300+ LOC)
│   ├── metrics.md                     # Quantitative thresholds (NIST/SonarQube)
│   ├── security-smells.md             # OWASP patterns + secrets detection
│   ├── prioritization.md              # ROI scoring & Fix/Defer/Accept tree
│   ├── dependency-analysis.md         # Circular deps, coupling, import graphs
│   ├── design-patterns.md             # Smell-to-pattern mapping, YAGNI gate
│   ├── migration-patterns.md          # Paradigm migration sequences (5 types)
│   ├── architecture/
│   │   ├── architectural-styles.md    # 8 styles + detection heuristics
│   │   ├── architectural-patterns.md  # 13 patterns + YAGNI gates
│   │   └── architectural-smells.md    # 12 smells + measurable detection
│   └── languages/
│       ├── _index.md                  # Language routing table
│       ├── python.md                  # Python-specific patterns
│       ├── javascript-typescript.md   # JS/TS patterns (React/Vue/Next.js)
│       ├── java.md                    # Java patterns (Spring/Quarkus)
│       ├── go.md                      # Go patterns (Gin/Echo/GORM)
│       ├── rust.md                    # Rust patterns (Actix/Axum/Tokio)
│       ├── php.md                     # PHP patterns (Laravel/Symfony)
│       ├── ruby.md                    # Ruby patterns (Rails/RSpec)
│       ├── csharp.md                  # C# patterns (ASP.NET/EF/Blazor)
│       ├── swift.md                   # Swift patterns (SwiftUI/UIKit/Vapor)
│       ├── kotlin.md                  # Kotlin patterns (Android/Spring/Ktor)
│       ├── cpp.md                     # C/C++ patterns (Qt/Boost/gRPC)
│       ├── dart.md                    # Dart patterns (Flutter/Riverpod/Bloc)
│       ├── scala.md                   # Scala patterns (Play/Akka/ZIO)
│       ├── elixir.md                  # Elixir patterns (Phoenix/LiveView/Ecto)
│       ├── shell-bash.md              # Shell/Bash patterns (Bats/shellspec)
│       └── lua.md                     # Lua patterns (LÖVE2D/Neovim/OpenResty)
│
├── install-skill.js                   # postinstall hook — copy skill to ~/.claude/skills/
├── uninstall-skill.js                 # preuninstall hook — remove skill files
│
├── tests/                             # Test suite (172 tests)
│   ├── phase-01-base-infra.test.js    # Base adapter + content utils (26 tests)
│   ├── phase-02-cli.test.js           # CLI commands (15 tests)
│   ├── phase-03-tier1-adapters.test.js # Cursor, Windsurf, Gemini, Codex (40 tests)
│   ├── phase-04-tier2-adapters.test.js # Copilot, Roo Code, Antigravity, OpenCode (45 tests)
│   ├── phase-05-tier3-adapters.test.js # Continue.dev, CodeBuddy, Kiro (26 tests)
│   └── phase-06-tier4-adapters.test.js # Trae, Qoder + CLI integration (20 tests)
│
├── docs/                              # Internal documentation (this folder)
│   ├── project-overview-pdr.md        # Project vision, PDR, roadmap
│   ├── code-standards.md              # This file — codebase structure
│   └── system-architecture.md         # Technical architecture & design
```

## File Standards

### Markdown Conventions

- **Headers:** Use ATX style (`#`, `##`, `###`)
- **Code blocks:** Specify language for syntax highlighting
- **Tables:** Use pipe syntax; align with proper spacing
- **Lists:** Use `-` for unordered, numbered for ordered
- **Links:** Relative paths within docs (`./filename.md`), full URLs for external resources
- **Line length:** Soft wrap at 100 characters for readability in terminals

### Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| Files | kebab-case with `.md` extension | `code-smells.md`, `security-smells.md` |
| Directories | kebab-case lowercase | `references/`, `languages/` |
| Commands | `/refactor:subcommand` | `/refactor:review`, `/refactor:fast` |
| Sections | Title Case headers | `## Core Workflow`, `### Decision Rules` |

### Reference File Standards

All reference files follow this structure:

1. **Frontmatter (optional)** — YAML for metadata (name, description, version)
2. **Table of Contents** — Quick navigation for long files (>200 LOC)
3. **Introduction** — Purpose and scope (2–3 sentences)
4. **Content Sections** — Organized by category/topic
5. **YAML Quick-Reference (if applicable)** — Structured data for AI consumption
6. **Examples** — Real code samples demonstrating patterns
7. **Related References** — Links to complementary files

### Code Examples in Documentation

- **Format:** Use code blocks with language-specific syntax highlighting
- **Accuracy:** Only document patterns verified in actual codebase or standard libraries
- **Attribution:** Link to source files when referencing specific implementation
- **Anti-pattern format:** Show "Smell," "Why it matters," "Refactoring," "Result"

## Content Standards

### Language Reference Files (`references/languages/*.md`)

Each language file includes:

1. **15+ Language-Specific Code Smells**
   - How they manifest in the language
   - Framework-specific variants (e.g., Django patterns for Python)
   - Severity and frequency in typical projects

2. **Convention Discovery Workflow**
   - Config file detection (linters, formatters, type checkers)
   - Framework inference (Django/Flask for Python, React/Vue for JS)
   - Output: discovered conventions as structured data

3. **Common Frameworks & Patterns**
   - Major frameworks for the language
   - Common design patterns in ecosystem
   - Framework-specific refactoring considerations

4. **Version-Gated Guidance**
   - Language version support (e.g., Python 3.8+, Rust 1.56+)
   - Version-specific syntax or idioms
   - Deprecation notes for older versions

### Metrics Reference (`references/metrics.md`)

Provides quantitative thresholds for:

- **Cyclomatic Complexity (CC):** threshold ~10 (NIST standard)
- **Cognitive Complexity (CogC):** threshold ~15 (SonarQube)
- **Coupling:** Afferent (Ca), Efferent (Ce), Instability (I), Abstractness (A)
- **Cohesion:** LCOM-HS (Lack of Cohesion of Methods — Henderson-Sellers)
- **Size Limits:**
  - Method: <50 LOC (ideal), >100 LOC (refactor)
  - Class: <400 LOC (ideal), >800 LOC (refactor)
  - File: <500 LOC (ideal), >1000 LOC (split)
  - Parameters: <5 (ideal), >7 (introduce parameter object)

Includes YAML block for AI parsing:

```yaml
metrics:
  cyclomatic_complexity: {good: "≤10", warning: "11–20", danger: ">20"}
  cognitive_complexity: {good: "≤15", warning: "16–35", danger: ">35"}
  method_length_loc: {ideal: "≤50", warning: "51–100", danger: ">100"}
  # ... more thresholds
```

### Security Smells Reference (`references/security-smells.md`)

Maps OWASP Top 10 to detectable code patterns:

- **OWASP Mapping:** Each vulnerability linked to code patterns
- **Secrets Detection:** Regex patterns for AWS keys, GitHub tokens, API keys
- **Language-Specific Risks:**
  - Python: SQL injection in f-strings, pickle deserialization
  - JS/TS: eval() usage, prototype pollution
  - SQL: Raw query concatenation
  - Java: XXE via DocumentBuilder, insecure crypto algorithms
- **Severity Levels:** Critical (exploitable in minutes), High, Medium, Low
- **Remediation:** For each pattern, quick-fix guidance

### Prioritization Reference (`references/prioritization.md`)

**ROI Score Formula:**
```
Score = (Severity × Frequency × Impact) / Effort
```

- **Severity:** 1–10 (critical vulnerabilities = 10)
- **Frequency:** How often smell occurs (1 = single instance, 10 = pervasive)
- **Impact:** Business/technical impact if not fixed (1 = cosmetic, 10 = system failure)
- **Effort:** Estimated refactoring work (1 = trivial, 10 = major rewrite)

**Decision Tree:**
- Score >50: **Fix immediately** (high ROI)
- Score 20–50: **Fix in next sprint** (acceptable ROI)
- Score <20: **Defer or accept** (low ROI)

**Hotspot Identification:**
- Use CodeScene hotspot model (frequency × complexity × age)
- Flag "hotspots" — files modified frequently with high complexity
- Prioritize refactoring in hotspots for maximum ROI

**SonarQube Technical Debt Ratio:**
- A: <5% debt
- B: 5–10% debt
- C: 10–20% debt
- D: 20–50% debt
- E: >50% debt (critical)

### Dependency Analysis Reference (`references/dependency-analysis.md`)

Maps module dependencies before multi-file refactoring:

- **Circular Dependency Detection:** Direct, indirect, hidden cycles via re-exports
- **Breaking Strategies:** Extract Interface, Dependency Inversion, Move to Third Module, Event/Callback, Merge
- **Coupling Indicators:** Fan-out (Ce>5 = split candidate), Fan-in (Ca>10 = risky change), Hub modules
- **Module Coupling Checklist:** Import graph mapping, boundary violations, God Module detection
- **Per-Language Tools:** JS/TS (madge/dependency-cruiser/skott), Python (deptry/pydeps/import-linter), Go (go vet/depguard), Rust (cargo-udeps/cargo-deny), Java (jdeps/ArchUnit), C# (NDepend/ArchUnitNET)

### Design Patterns Reference (`references/design-patterns.md`)

Maps code smells to design pattern solutions for structural refactoring:

- **Smell-to-Pattern Mapping:** 10+ common smells → pattern candidates (Switch→Strategy/State, God Class→Facade/Extract Class, Feature Envy→Move Method/Visitor, etc.)
- **YAGNI Gate:** Apply pattern only when 3+ concrete variants exist, problem blocks development, or metrics confirm (CC>15, class>500 LOC)
- **Modern Alternatives:** DI over Singleton, closures over Strategy, reactive streams over Observer, composition over Template Method
- **Anti-Patterns:** Premature abstraction, God Strategy, pattern for pattern's sake, inheritance addiction

## CLI Framework (Phase 02)

### Commander-Based CLI Architecture

**Primary File:** `cli.js` (using npm `commander` v14.0.3)

Provides three subcommands for programmatic skill installation and multi-tool support:

#### `install` Command
```bash
refactoring-kit install [--tool=<tools>] [--global] [--dry-run]
```
- **Purpose:** Copy skill files to tool-specific locations (Claude Code, VS Code, etc.)
- **Default:** Installs for `claude-code` at project level
- **Options:**
  - `--tool <tools>` — Comma-separated tool names (default: "claude-code")
  - `--global` — Install globally instead of project-level
  - `--dry-run` — Preview installation without writing files
- **Implementation:** Uses adapter pattern via `adapters/registry.js`
- **Behavior:** Calls adapter's `install()` method; aggregates results; exits 1 on error

#### `uninstall` Command
```bash
refactoring-kit uninstall [--tool=<tools>] [--global] [--dry-run]
```
- **Purpose:** Remove skill files from tool-specific locations
- **Options:** Same as install
- **Implementation:** Uses adapter pattern via `adapters/registry.js`
- **Behavior:** Calls adapter's `uninstall()` method; exits 1 on error

#### `tools` Command
```bash
refactoring-kit tools
```
- **Purpose:** List all supported AI coding tools and their capabilities
- **Output:** Formatted table showing tool name, display name, and capability flags (commands, refs, workflows, globs)
- **Implementation:** Uses `registry.list()` to enumerate adapters

### Adapter Pattern (Multi-Tool Support)

**Registry:** `adapters/registry.js`
- Maintains map of tool names → adapter objects
- Provides `get(toolName)` to fetch specific adapter
- Provides `list()` to enumerate all registered adapters
- Throws error if adapter not found

**Adapter Interface:**
```javascript
{
  name: "claude-code",                    // Machine-readable identifier
  displayName: "Claude Code",             // Human-readable name
  capabilities: {
    slashCommands: true,                  // Supports /refactor slash commands
    separateReferences: true,             // Stores references separately
    workflows: true,                      // Supports .claude workflows
    fileGlobs: true                       // Supports file glob filtering
  },
  install({ packageDir, scope, projectRoot, dryRun }) { ... },
  uninstall({ scope, projectRoot, dryRun }) { ... }
}
```

**Adapters (14 total):**

| Tier | Adapter | Format |
|------|---------|--------|
| 1 (full) | `claude-code.js`, `cursor.js`, `windsurf.js`, `gemini-cli.js`, `codex-cli.js` | Native tool format |
| 2 (high) | `copilot.js`, `roo-code.js`, `antigravity.js`, `opencode.js` | Adapted with markers |
| 3 (adapted) | `continue-dev.js`, `codebuddy.js`, `kiro.js` | Tool-specific templates |
| 4 (best-effort) | `trae.js`, `qoder.js` | Markdown with warnings |

**Content Utilities** (`content-utils.js`):
- `stripClaudeFrontmatter(content)` — Remove YAML frontmatter from canonical files
- `stripClaudeDirectives(content)` — Remove Claude-specific directives (`$ARGUMENTS`, `Activate`)
- `truncateToLimit(content, limit)` — Truncate to character limit for tools with size constraints
- `wrapWithMarkers(content, start, end)` — Wrap content with HTML comment section markers
- `appendToExistingFile(filePath, content, start, end)` — Insert/replace section in shared files
- `validateMarkers(content, start, end)` — Validate marker pair integrity

### Testing

**172 tests** across 6 test files:

| File | Tests | Coverage |
|------|-------|----------|
| `phase-01-base-infra.test.js` | 26 | BaseAdapter, content-utils, registry |
| `phase-02-cli.test.js` | 15 | CLI commands, install/uninstall/tools |
| `phase-03-tier1-adapters.test.js` | 40 | Cursor, Windsurf, Gemini CLI, Codex CLI |
| `phase-04-tier2-adapters.test.js` | 45 | Copilot, Roo Code, Antigravity, OpenCode |
| `phase-05-tier3-adapters.test.js` | 26 | Continue.dev, CodeBuddy, Kiro |
| `phase-06-tier4-adapters.test.js` | 20 | Trae, Qoder, CLI integration |

Run via:
```bash
npm test
```

## Workflow Standards

### Skill Activation Workflow

1. **User triggers refactoring request** (natural language or slash command)
2. **Skill detects language(s)** via file extensions
3. **Load language reference(s)** from `references/languages/`
4. **Run Convention Discovery** — detect linters, formatters, frameworks
5. **Load Analyze references** — code-smells.md, metrics.md, security-smells.md, prioritization.md
6. **Analyze code** — detect smells, score metrics, identify hotspots
7. **Conditional reference loading (Transform phase):**
   - For architectural smells (God Class, Feature Envy, tight coupling, circular deps): Load design-patterns.md for smell-to-pattern mapping
   - For multi-file/module refactoring: Load dependency-analysis.md to understand import graph and verify boundaries
8. **Generate report** — severity-ranked findings with ROI scores
9. **Output format:** Aligned Refactorings + Convention Improvements

### Command Routing Rules

| Keyword Match | Route |
|---------------|-------|
| architecture / architectural / arch-review | `/refactor:architecture` |
| review / analyze / audit / scan | `/refactor:review` |
| Single file | `/refactor:fast` |
| Directory / module | `/refactor:plan` |
| Plan file path | `/refactor:implement` |
| Default | `/refactor:fast` |

### Test Safeguarding Rules (Future Phase)

1. **Check for existing tests** — scan for test files, CI configs
2. **If tests exist:** Run baseline, record results
3. **If no tests:** Generate characterization tests for public API
4. **Before refactor:** Ensure baseline test passes
5. **After refactor:** Run full test suite; revert if any failure

## Code Quality Standards

### Documentation Accuracy

- **Only document what exists.** Verify function names, signatures, API contracts in actual code before documenting.
- **Conservative output.** When uncertain about implementation, note "implementation may vary."
- **Link hygiene.** Only use internal links for files that exist in `/docs/` or in codebase with verified paths.
- **Validation.** Run `node $HOME/.claude/scripts/validate-docs.cjs docs/` to check for broken links and inconsistencies.

### Reference File Quality

- **Completeness:** Each smell/method entry includes description, why it matters, how to fix it, code example
- **Language coverage:** Support 16+ programming languages with language-specific examples
- **Up-to-date thresholds:** Align with NIST, SonarQube, industry standards
- **Accessibility:** Write for both human readers and AI/LLM consumption; provide YAML blocks where helpful

### Command File Quality

- **Clarity:** Each command file clearly states its purpose, arguments, and examples
- **Error handling:** Describe failure modes and recovery steps
- **User feedback:** Commands provide progress indicators and detailed output
- **Testing:** Commands include example invocations and expected output

## Version Management

### Semantic Versioning

- **Major (X):** Breaking changes (e.g., priority reordering, command signature changes)
- **Minor (Y):** New features backward-compatible (e.g., new references, new languages)
- **Patch (Z):** Bug fixes, documentation updates

### Changelog Standards

- **Entry format:** ISO date (YYYY-MM-DD), semver tag, category (Added/Changed/Removed/Fixed)
- **Clarity:** Each entry should be actionable and reference relevant files
- **Breaking changes:** Clearly marked and explained with migration guidance

**Current version:** 7.0.0 (2026-02-09) — Multi-tool adapters (14 tools)

## Maintenance & Deprecation

### Update Triggers

- **Code change in skill:** Update SKILL.md, CHANGELOG.md, README.md
- **New reference file:** Update README.md table, CHANGELOG.md
- **New language:** Add file to `references/languages/`, update `_index.md`, CHANGELOG.md
- **Security advisory:** Update `references/security-smells.md` with new patterns

### Deprecation Policy

- **Planned:** Announce deprecation 2 minor versions in advance
- **Grace period:** Support deprecated feature for 6 months post-announcement
- **Removal:** Remove in next major version with clear migration guide in CHANGELOG

### Documentation Debt

Track issues in GitHub issues labeled `docs:` for:
- Outdated references (e.g., OWASP updates)
- Missing language support
- Inaccurate code examples
- Broken links or internal inconsistencies
