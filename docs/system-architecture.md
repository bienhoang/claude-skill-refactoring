# System Architecture

## High-Level Design

Claude-skill-refactoring is a **Claude Code skill** — a modular add-on that augments Claude's code refactoring capabilities with structured knowledge and workflows. The system follows a **progressive disclosure** pattern: references are loaded on-demand, not preloaded.

```
User Request (natural language or slash command)
       ↓
    Router (intelligent keyword/scope detection)
       ↓
    Skill.md (core refactoring workflow)
       ↓
    Language Detection + Convention Discovery
       ↓
    Load References (code-smells, metrics, security, prioritization, language-specific)
       ↓
    Execute Workflow (Analyze → Safeguard → Transform [conditional design-patterns/dependency-analysis] → Verify → Report)
       ↓
    Output Report (findings, metrics, ROI scores, next steps)
```

## Component Breakdown

### 1. Skill Definition (`SKILL.md`)

**Purpose:** Master workflow document that Claude follows for all refactoring tasks.

**Key Sections:**
- **Core Workflow:** 5-phase process (Analyze → Safeguard → Transform → Verify → Report)
- **Analyze Phase:** Load references, detect smells, score metrics, rank by priority
- **Safeguard Phase:** Check tests, write characterization tests if needed
- **Transform Phase:** Apply refactoring methods one at a time, verify after each
- **Verify Phase:** Run test suite, revert on failure
- **Report Phase:** Summarize changes, metrics before/after, next steps
- **Language-Specific Guidance:** Convention discovery workflow + 6-step detection
- **Decision Rules:** Edge cases (no tests, unclear behavior, quick cleanup)

**Data Flow:**
- Input: target code file(s) or directory
- Loads: all references based on language(s) detected
- Outputs: analysis report with severity/ROI scoring
- Conditional: safety checks before transformation

### 2. Command Router (`commands/refactor.md`)

**Purpose:** Intelligent entry point that routes refactoring requests to appropriate subcommand.

**Routing Logic:**
```
if keywords in request (review, analyze, audit, scan):
  → /refactor:review (read-only)
else if single file target:
  → /refactor:fast (autonomous)
else if directory/module target:
  → /refactor:plan (collaborative)
else if plan file path:
  → /refactor:implement (execute)
else:
  → /refactor:fast (default)
```

**Invocation:**
- Natural language: "refactor this code"
- Explicit: `/refactor src/utils.ts`

### 3. Subcommands

#### `/refactor:review` (`commands/refactor/review.md`)

**Purpose:** Read-only code analysis — no modifications.

**Workflow:**
1. Scan target code for smells
2. Calculate quantitative metrics
3. Detect security patterns
4. Score with ROI formula
5. Generate prioritized report

**References Loaded:**
- code-smells.md
- metrics.md
- security-smells.md
- prioritization.md
- language-specific file(s)

**Output:**
- Severity-ranked findings (critical/major/minor)
- ROI scores (Fix/Defer/Accept breakdown)
- Hotspot identification
- Suggested next actions

**Use Cases:**
- Audit legacy code without modification risk
- Review team submissions for quality
- Pre-refactoring assessment
- Security scanning

#### `/refactor:fast` (`commands/refactor/fast.md`) — *Phase 2*

**Purpose:** Autonomous refactoring — review, transform, verify in one go.

**Workflow:**
1. Run `/refactor:review` analysis
2. Apply refactoring methods one by one
3. Run test suite after each
4. Revert on test failure
5. Report all changes + metrics delta

**Flags:**
- `--safe` — generate characterization tests before refactoring
- `--no-tests` — skip test verification (use with caution)

**Implicit Behavior:**
- Auto-writes tests if none exist (unless `--no-tests` flag)
- Atomic transformations — small, safe changes in sequence
- Progress reporting — each transformation step logged

#### `/refactor:plan` (`commands/refactor/plan.md`) — *Phase 2–3*

**Purpose:** Collaborative planning — brainstorm phases with user.

**Workflow:**
1. **Scout:** Load dependency-analysis.md; map import graph and identify circular dependencies
2. **Analyze:** Scan code for smells; load language reference(s); execute convention discovery
3. **Present Findings:** Report smell analysis with severity; ask user about constraints and priorities
4. **Brainstorm Strategy:** Load refactoring-methods.md and design-patterns.md (if architectural smells detected); consult language reference for conventions
5. **Create Plan:** Generate multi-phase plan with smell-targeting, transformation sequences, behavior preservation notes
6. **Save Plan:** Store to `plans/refactor-{target}/plan.md` with YAML frontmatter

**Conditional References:**
- Load dependency-analysis.md during Scout phase
- Load design-patterns.md during Brainstorm Strategy if architectural smells identified

**Implicit Behavior:**
- User approves/modifies plan before execution
- Plan file includes phase descriptions, rollback points, test strategies, boundary preservation notes

#### `/refactor:implement` (`commands/refactor/implement.md`) — *Phase 3*

**Purpose:** Execute refactoring plan phase by phase, or review-then-apply.

**Workflow (with plan file):**
1. Load plan file
2. Execute each phase
3. Run tests after each phase
4. Checkpoint validation
5. Report completion

**Workflow (without plan file):**
1. Run `/refactor:review` analysis
2. Apply safe transformations
3. Run tests
4. Report

### 4. Reference Knowledge Bases (`references/`)

#### Core References

**`code-smells.md`** (250+ LOC)
- 25+ structural smells organized in 7 categories
- For each smell: description, why it matters, refactoring approaches, code examples
- Categories: Bloaters, OO Abusers, Change Preventers, Dispensables, Couplers, Data/Value Object Issues, Naming
- Used in: Analyze phase

**`refactoring-methods.md`** (300+ LOC)
- 30+ refactoring techniques with step-by-step mechanics
- For each method: description, preconditions, steps, postconditions, code before/after, related smells
- Methods: Extract Method, Extract Class, Replace Method with Method Object, Move Method, Replace Conditional with Polymorphism, etc.
- Used in: Transform phase

**`metrics.md`** (150+ LOC)
- NIST/SonarQube-aligned thresholds for code quality
- Metrics: Cyclomatic Complexity, Cognitive Complexity, Coupling (Ca/Ce/I/D), Cohesion (LCOM-HS), Size
- Thresholds: good/warning/danger levels per metric
- YAML quick-reference block for AI consumption
- Used in: Analyze phase (scoring)

**`security-smells.md`** (200+ LOC)
- OWASP Top 10 mapped to detectable code patterns
- Secrets detection: regex patterns for AWS keys, GitHub tokens, OpenAI keys, etc.
- Language-specific security smells: SQL injection, XXE, deserialization, crypto, auth, etc.
- Severity mapping: Critical, High, Medium, Low
- Used in: Analyze phase (security assessment)

**`prioritization.md`** (150+ LOC)
- ROI score formula: (Severity × Frequency × Impact) / Effort
- Fix/Defer/Accept decision tree with score thresholds
- CodeScene hotspot model (frequency × complexity × age)
- SonarQube Technical Debt Ratio (A–E)
- Agent checklist for consistent prioritization
- Used in: Analyze phase (ranking findings)

**`dependency-analysis.md`** (150+ LOC)
- Circular dependency detection (direct, indirect, hidden cycles)
- Breaking strategies: Extract Interface, Dependency Inversion, Move to Third Module, Event/Callback, Merge
- Import graph analysis: fan-in/fan-out indicators, hub modules, orphans, long dependency chains
- Module coupling checklist: boundary rules, God Module detection, barrel file bloat
- Per-language tools and commands
- Used in: Transform phase (conditional load for multi-file refactoring)

**`design-patterns.md`** (150+ LOC)
- Smell-to-pattern mapping: 10+ common smells → applicable design patterns
- YAGNI gate: apply only when 3+ variants exist or smell blocks development
- Modern alternatives to GoF patterns (DI over Singleton, closures over Strategy, etc.)
- Anti-patterns: premature abstraction, God Strategy, inheritance addiction
- Used in: Transform phase (conditional load for architectural smells)

#### Language-Specific References (`references/languages/`)

**Routing** (`_index.md`):
- Maps file extensions to language files
- Handles multi-language projects
- Fallback to English for unknown languages

**Per-Language Files** (16 total):
Each file includes:
1. 15+ language-specific code smells with framework variants
2. Convention discovery workflow (config file patterns, framework inference)
3. Common frameworks and idioms
4. Version-gated guidance (e.g., Python 3.8+, Rust 1.56+)
5. Language-specific refactoring considerations

**Languages Supported:**
- Python (Django/Flask/FastAPI patterns)
- JavaScript/TypeScript (React/Vue/Next.js patterns)
- Java (Spring Boot/Quarkus patterns)
- Go (Gin/Echo/GORM patterns)
- Rust (Actix/Axum/Tokio patterns)
- PHP (Laravel/Symfony patterns)
- Ruby (Rails/RSpec patterns)
- C# (ASP.NET/EF/Blazor patterns)
- Swift (SwiftUI/UIKit/Vapor patterns)
- Kotlin (Android/Spring/Ktor patterns)
- C/C++ (Qt/Boost/gRPC patterns)
- Dart (Flutter/Riverpod/Bloc patterns)
- Scala (Play/Akka/ZIO patterns)
- Elixir (Phoenix/LiveView/Ecto patterns)
- Shell/Bash (Bats/shellspec patterns)
- Lua (LÖVE2D/Neovim/OpenResty patterns)

**Used in:** All phases (language detection → convention discovery → language-specific analysis/refactoring)

## Data Flow

### Request → Analysis Report

```
1. User Input
   ├─ Natural language: "refactor this code"
   ├─ Slash command: /refactor src/utils.ts
   └─ Flags: --safe, --no-tests

2. Router
   ├─ Detect keywords (review, analyze, etc.)
   ├─ Determine scope (file, directory)
   └─ Route to subcommand (review, fast, plan, implement)

3. Language Detection
   ├─ Parse file extensions (.py, .ts, .go, etc.)
   ├─ Load language/_index.md routing table
   └─ Load language-specific file(s)

4. Convention Discovery
   ├─ Scan for config files (pyproject.toml, tsconfig.json, etc.)
   ├─ Infer frameworks (Django, React, Spring Boot)
   └─ Output: discovered conventions as structured data

5. Reference Loading
   ├─ Load code-smells.md
   ├─ Load metrics.md
   ├─ Load security-smells.md
   ├─ Load prioritization.md
   ├─ Load language-specific file
   └─ Conditional (Transform phase):
      ├─ Load design-patterns.md (if architectural smells detected)
      └─ Load dependency-analysis.md (if multi-file refactoring planned)

6. Analysis
   ├─ Scan code for smells (25+ patterns)
   ├─ Score metrics (CC, CogC, coupling, cohesion, size)
   ├─ Detect security patterns
   ├─ Calculate ROI scores
   └─ Rank by priority

7. Report Generation
   ├─ Severity-ranked findings (critical/major/minor)
   ├─ ROI scores with Fix/Defer/Accept breakdown
   ├─ Hotspot identification
   ├─ Before/after metrics projections
   └─ Suggested next actions
```

### Analysis Report → Transformation (Phase 2)

```
1. Test Safeguarding
   ├─ Detect existing tests (test files, CI configs)
   ├─ If exists: run baseline, record results
   └─ If not exists: generate characterization tests

2. Transformation Loop (for each refactoring)
   ├─ Apply single refactoring method
   ├─ Run test suite
   ├─ If tests pass: record as checkpoint, proceed
   └─ If tests fail: revert changes, try different method

3. Verification
   ├─ Run full test suite
   ├─ Check code coverage
   ├─ Lint/type-check validation
   └─ Record before/after metrics

4. Report
   ├─ List applied transformations
   ├─ Metrics delta (complexity, duplication, coverage)
   ├─ Test results summary
   └─ Recommended next refactorings
```

## Installation & Distribution

### Installation Flow

**npm postinstall Hook** (`install-skill.js`):
1. Read `.claude-skill.json` configuration
2. Copy skill files to `~/.claude/skills/refactoring/` (global) or `.claude/skills/refactoring/` (project)
3. Copy command files to `~/.claude/commands/` (global) or `.claude/commands/` (project)
4. Make commands available as slash commands in Claude Code

**npm preuninstall Hook** (`uninstall-skill.js`):
1. Remove skill files from `~/.claude/skills/refactoring/`
2. Remove command files from `~/.claude/commands/`
3. Clean up directories if empty

### Distribution Channels

- **npm Registry:** `npm install -g claude-skill-refactoring` (global) or `npm install --save-dev` (project)
- **GitHub:** Clone for manual installation
- **Claude Code Skill Store:** Future distribution channel (planned)

## Extension Points

### Adding New Languages

1. Create `references/languages/{language}.md` with:
   - 15+ language-specific smells
   - Convention discovery patterns
   - Common frameworks
   - Version guidance
2. Update `references/languages/_index.md` routing table
3. Update README.md language list
4. Update CHANGELOG.md
5. Bump minor version

### Adding New References

1. Create `references/{new-topic}.md` following standards
2. Update SKILL.md to load new reference in appropriate phase
3. Update README.md references table
4. Update CHANGELOG.md
5. Bump minor version

### Adding New Refactoring Methods

1. Add entry to `references/refactoring-methods.md` with:
   - Clear name and description
   - Step-by-step mechanics
   - Pre/post conditions
   - Code example (before/after)
   - Related smells this fixes
2. Update CHANGELOG.md
3. Bump patch version

### Adding New Metrics or Security Patterns

1. Update relevant reference file (metrics.md, security-smells.md)
2. Ensure thresholds/patterns align with industry standards
3. Test with real codebases
4. Update CHANGELOG.md
5. Bump patch version (or minor if significant addition)

## Performance Considerations

### Context Efficiency

- **Progressive disclosure:** References loaded only when needed
- **No preloading:** All 22 reference files not loaded upfront
- **Selective loading:** Only language-specific file for detected language(s)
- **Streaming output:** Report generated incrementally

### Scalability

- **Per-language modularization:** Add languages without affecting others
- **YAML quick-reference blocks:** Enable efficient AI parsing without full prose reading
- **Metrics lookups:** Threshold comparison via YAML block (no dynamic computation)
- **Caching:** Claude's context caching can hold references across requests

### Optimization Strategies

For large codebases (>100 files):
1. Focus analysis on hotspots (frequently modified files)
2. Prioritize by ROI score (don't try to fix low-ROI issues)
3. Use `/refactor:plan` to break into sequential phases
4. Process one module at a time rather than entire codebase

## Security Considerations

### Data Privacy

- **No external calls:** All analysis runs locally within Claude Code
- **No data collection:** Skill does not transmit code to external services
- **Configurable security:** Users can skip security scans if needed
- **Secrets detection:** Identifies hardcoded secrets but does not transmit them

### Code Safety

- **Read-only analysis:** `/refactor:review` never modifies code
- **Test-driven verification:** Transformations only applied if tests pass
- **Atomic changes:** Each transformation is reversible via git or undo
- **User approval gates:** Major refactorings require user sign-off (planned for Phase 3)

### Input Validation

- **File path validation:** Verify target paths exist and are readable
- **Language detection:** Graceful fallback for unknown file types
- **Config file parsing:** Safe parsing of linter/formatter configs
- **Regex safety:** Security pattern detection uses non-catastrophic regexes

## Testing Strategy

### Unit Testing (Future)

- Test smell detection on sample code
- Validate metric calculations against known code
- Verify prioritization scoring logic
- Check language routing and convention discovery

### Integration Testing (Future)

- End-to-end refactoring workflows
- Multi-file refactoring with cross-module dependencies
- Test framework detection and test generation
- Multi-language project analysis

### Validation (Current)

- Manual spot-checks: analyze 10+ real projects, verify smell detection accuracy
- Metric alignment: validate thresholds against SonarQube/NIST standards
- Language coverage: test convention discovery on framework projects
- Link/documentation validation: `validate-docs.cjs` script (planned)

## Future Architecture Enhancements

### Phase 2: Enhanced Safety

- **Characterization test library:** Reusable patterns for common APIs
- **Multi-framework test support:** Auto-detect Jest, pytest, JUnit, go test, RSpec
- **Coverage tracking:** Report coverage delta before/after refactoring

### Phase 3: Collaborative Workflows

- **Plan storage and versioning:** Persist plans for team review
- **Approval gates:** Multi-step approval for critical refactorings
- **Team awareness:** Consider active developers to minimize merge conflicts

### Phase 4: Advanced Integration

- **SonarQube/CodeScene integration:** Auto-import hotspots and debt ratio
- **Recipe library:** Common refactoring patterns (extract, standardize)
- **Cost-benefit analysis:** Estimate refactoring ROI before execution

## Dependency Graph

```
SKILL.md (core workflow)
├─ references/code-smells.md
├─ references/refactoring-methods.md
├─ references/metrics.md
├─ references/security-smells.md
├─ references/prioritization.md
├─ references/design-patterns.md (conditional: Transform phase, architectural smells)
├─ references/dependency-analysis.md (conditional: Transform phase, multi-file refactoring)
└─ references/languages/{language}.md
   └─ references/languages/_index.md

commands/refactor.md (router)
├─ commands/refactor/review.md
├─ commands/refactor/fast.md
├─ commands/refactor/plan.md (loads dependency-analysis.md in Scout; design-patterns.md in Brainstorm)
└─ commands/refactor/implement.md

install-skill.js / uninstall-skill.js
└─ .claude-skill.json (metadata)
```

No external dependencies beyond Claude Code itself.
