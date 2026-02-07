# Code Standards & Codebase Structure

## Directory Structure

```
claude-skill-refactoring/
├── SKILL.md                           # Core skill definition & workflow
├── README.md                          # User-facing documentation
├── CHANGELOG.md                       # Version history
├── package.json                       # npm metadata (v2.0.0)
├── .claude-skill.json                 # Skill registration
├── LICENSE                            # MIT license
│
├── commands/                          # CLI slash commands
│   ├── refactor.md                    # /refactor — intelligent router
│   └── refactor/
│       ├── review.md                  # /refactor:review — read-only analysis
│       ├── fast.md                    # /refactor:fast — autonomous refactoring
│       ├── plan.md                    # /refactor:plan — collaborative planning
│       └── implement.md               # /refactor:implement — plan execution
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

**Current version:** 2.0.0 (2026-02-08)

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
