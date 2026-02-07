# claude-skill-refactoring: Project Overview & PDR

## Project Vision

Empower Claude Code users with a systematic, LLM-guided code refactoring skill that detects code smells, applies safe transformations, verifies correctness with tests, and generates quantitative reports — enabling high-confidence refactoring workflows at scale.

## Product Development Requirements

### Functional Requirements

#### Phase 1: Core Analysis Intelligence (v2.0.0 — COMPLETE)

**FR1.1: Code Smell Detection**
- Detect 25+ code smells across 7 categories (Bloaters, OO Abusers, Change Preventers, Dispensables, Couplers, Complexity, Naming)
- Scan across 16 programming languages (Python, JS/TS, Java, Go, Rust, PHP, Ruby, C#, Swift, Kotlin, C/C++, Dart, Scala, Elixir, Shell/Bash, Lua)
- Report findings with category, description, severity (critical/major/minor), and refactoring guidance

**FR1.2: Quantitative Metrics Analysis**
- Evaluate code against NIST/SonarQube complexity thresholds
- Measure cyclomatic complexity, cognitive complexity, coupling (Ca/Ce/I/D), cohesion (LCOM-HS)
- Apply size limits: method (<50 LOC), class (<400 LOC), file (<500 LOC), parameters (<5)
- Provide YAML quick-reference for AI consumption

**FR1.3: Security Pattern Detection**
- Map OWASP Top 10 to detectable code patterns
- Detect hardcoded secrets (AWS, GitHub, OpenAI keys) via regex
- Language-specific security smells: SQL injection, command injection, unsafe deserialization, hardcoded credentials
- Severity mapping: Critical, High, Medium, Low

**FR1.4: Prioritization & ROI Scoring**
- Calculate ROI score: (Severity × Frequency × Impact) / Effort
- Apply Fix/Defer/Accept decision tree with score thresholds
- Identify CodeScene hotspots and SonarQube Technical Debt Ratio (A–E)
- Agent checklist for consistent prioritization

**FR1.5: Read-Only Analysis Command**
- `/refactor:review [target] [options]` — scan code, score metrics, generate prioritized report
- No code modifications; safe for production/sensitive codebases
- Output: severity-ranked findings with ROI scores and suggested next steps

**FR1.6: Language-Specific Convention Discovery**
- Auto-detect project coding conventions (linters, formatters, frameworks)
- Route analysis to language-specific reference files
- Two-section output: Aligned Refactorings + Convention Improvements

#### Phase 2: Structural Analysis (v2.1.0 — IN PROGRESS)

**FR2.1: Dependency Analysis**
- Circular dependency detection and breaking strategies (Extract Interface, Dependency Inversion, Move to Third Module)
- Import graph visualization (fan-in, fan-out, coupling metrics Ce/Ca)
- Module coupling checklist (high fan-out/fan-in candidates, boundary violations)
- Per-language dependency tools (madge/deptry/go vet/jdeps/NDepend)

**FR2.2: Design Pattern Mapping**
- Smell-to-pattern mapping (25+ code smells → applicable design patterns)
- YAGNI gate: apply patterns only when 3+ variants exist or active smell blocks development
- Modern lightweight alternatives (DI over Singleton, closures over Strategy, etc.)
- Anti-patterns: premature abstraction, God Strategy, inheritance addiction

**FR2.3: Transform Phase Enhancement**
- Conditional loading: design-patterns.md for architectural smells; dependency-analysis.md for multi-file refactoring
- Enhanced smell detection: identify architectural issues before proposing transformations
- Phased planning integration: `/refactor:plan` now loads both dependency & pattern references

#### Phase 3: Workflow Enhancement (v2.0.0 — COMPLETE)

**FR3.1: Migration Pattern Library**
- Reference file `references/migration-patterns.md` with 5 common paradigm shifts: callback→async, class→functional, monolith→service, sync→async, ORM migration
- Step-by-step migration sequences with verification and rollback guidance
- Conditional loading in Transform phase for paradigm migration refactorings

**FR3.2: Advanced Testing Strategies**
- Property-based testing (Hypothesis, fast-check) for pure functions and data transformations
- Snapshot/approval testing for complex outputs
- Contract testing for API boundaries and service interfaces
- Mutation testing awareness (mutmut, Stryker) for test quality validation
- Characterization test best practices: public API testing, edge cases, state transitions

**FR3.3: Git Strategy & Commit Discipline**
- Suggest-only git practices: stash before refactoring, feature branch for planned work
- Commit per refactoring: `git commit -m 'refactor: <what-changed>'` after each successful transformation
- Conventional commits with `refactor:` prefix
- Squash option for cleanup before merging

**FR3.4: Parallel Refactoring Support**
- Detect independent tasks via dependency analysis (for directory-level refactoring)
- Group into batches based on file independence
- Dispatch subagents for parallel execution
- Merge results and full test suite verification to catch interaction issues
- Applies to `/refactor:fast` when 3+ independent tasks identified

### Non-Functional Requirements

**NFR1: Performance**
- Analysis of <5K LOC files completes in <30 seconds
- Metrics scoring calculated via YAML lookup (no dynamic computation)
- Context-efficient: references loaded on-demand, not preloaded

**NFR2: Accuracy**
- Only document/recommend what exists in actual codebase
- Verify function names, signatures, API contracts before documenting
- Conservative output: note "implementation may vary" when uncertain

**NFR3: Safety**
- No destructive operations without explicit user approval
- Test-driven validation before and after transformations
- Revert capability for all applied changes

**NFR4: Usability**
- Natural language trigger + slash command interface
- Progressive disclosure: references loaded when needed
- Clear, actionable output with before/after comparisons

**NFR5: Scalability**
- Support projects with 100+ files
- Per-language reference files (not monolithic)
- Modular architecture: add new languages/references without core changes

## Acceptance Criteria

### v2.0.0 (Phase 1 Complete)

- [x] 4 new reference files: metrics.md, security-smells.md, prioritization.md, commands/refactor/review.md
- [x] SKILL.md updated: Analyze phase loads all 4 references; priority order updated (security first)
- [x] `/refactor:review` command fully operational and documented
- [x] Router detects review/analyze/audit/scan keywords
- [x] All 16 language references updated with convention discovery workflow
- [x] README and CHANGELOG updated; version bumped to 2.0.0
- [x] Breaking change documented: security vulnerabilities ranked #1 in priority order

### v2.1.0+ (Subsequent Phases)

- Advanced `/refactor:fast` with parallel execution for directory targets
- Autonomous `/refactor:plan` with collaborative brainstorming
- Plan execution `/refactor:implement` with phase-by-phase checkpoints

## Architecture & Dependencies

### Core Components

1. **Skill Definition** (`SKILL.md`) — Core refactoring workflow, decision rules, language discovery
2. **References** (`references/`) — Smell catalog, refactoring methods, metrics, security patterns, prioritization, per-language guidance
3. **Commands** (`commands/refactor*.md`) — CLI interface: router, review, fast, plan, implement
4. **Installation Scripts** (`install-skill.js`, `uninstall-skill.js`) — npm postinstall/preuninstall hooks

### Reference Files Breakdown

| File | LOC | Purpose |
|------|-----|---------|
| `code-smells.md` | 250+ | 25+ structural smells by category |
| `refactoring-methods.md` | 300+ | 30+ refactoring techniques with step-by-step mechanics |
| `metrics.md` | 150+ | Quantitative thresholds (complexity, coupling, size) |
| `security-smells.md` | 200+ | OWASP patterns, secrets detection, language-specific risks |
| `prioritization.md` | 150+ | ROI scoring, Fix/Defer/Accept tree, hotspot identification |
| `dependency-analysis.md` | 150+ | Circular deps, import graphs, module coupling, per-language tools |
| `design-patterns.md` | 150+ | Smell-to-pattern mapping, YAGNI gate, modern alternatives, anti-patterns |
| `migration-patterns.md` | 150+ | Paradigm migration sequences: callback→async, class→functional, monolith→service, sync→async, ORM |
| `languages/python.md` | 200+ | Python-specific smells, convention discovery, framework patterns |
| `languages/javascript-typescript.md` | 200+ | JS/TS-specific smells, convention discovery, React/Vue/Next.js patterns |
| ... (14 more language files) | 200+ each | Per-language guidance for 16 total languages |

### External Dependencies

- **Claude Code:** Skill activation mechanism, command routing, context management
- **npm:** Package distribution and postinstall/preuninstall hooks
- **Git:** Optional — for rollback capabilities in future phases

## Success Metrics

### Phase 1 (v2.0.0)

- **Adoption:** Skill installed successfully on ≥50 projects
- **Usage:** `/refactor:review` command executed ≥100 times per month
- **Accuracy:** 95%+ of detected smells actually present in code (validated by spot-checks)
- **Time-to-Report:** Code analysis report generated in <30 seconds for <5K LOC files
- **Language Coverage:** Supports 16 languages; reports language-specific patterns

### Phase 2+ (Future)

- **Transformation Safety:** 99%+ of refactored code passes existing tests without reversal
- **Characterization Test Coverage:** 80%+ of public API methods covered by generated tests
- **User Satisfaction:** 4.5+/5.0 rating on usability and accuracy

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| False positives in smell detection | Users ignore report | Medium | Validate against >10 projects; adjust thresholds |
| Language-specific patterns miss edge cases | Report incompleteness | Low | Community feedback; gradual language refinement |
| Security smells outdated vs. OWASP | Missed vulnerabilities | Low | Annual OWASP Top 10 sync; regex updates for secrets |
| Breaking change (priority reorder) | User workflows disrupted | Medium | Clear changelog; major version bump (1.2.0 → 2.0.0) |
| Characterization tests too brittle | False test failures post-refactor | Medium (future) | Use observed behavior, not implementation; delta checks only |

## Roadmap

### v2.0.0 (2026-02-08) — Core Analysis

- [x] Metrics, security, prioritization references
- [x] `/refactor:review` command
- [x] Router enhancement with keyword detection
- [x] All 16 languages with convention discovery

### v2.1.0 (2026-02-08) — Workflow Enhancement

- [x] Migration patterns reference (callback→async, class→functional, monolith→service, sync→async, ORM)
- [x] Advanced testing strategies (property-based, snapshot, contract, mutation testing)
- [x] Git strategy section with suggest-only practices (stash, commit-per-refactoring, conventional commits)
- [x] Parallel refactoring support for directory targets with 3+ independent tasks
- [x] Conditional loading of migration-patterns.md in Transform phase
- [x] `/refactor:fast` with git stash/commit suggestions and parallel check
- [x] `/refactor:plan` and `/refactor:implement` with migration-patterns.md reference and conventional commits
- [x] SKILL.md Parallel Refactoring section with batch execution strategy

### v2.2.0 (2026-03-01) — Advanced Planning

- [ ] `/refactor:plan` command with brainstorming and phased planning
- [ ] `/refactor:implement` with plan execution and phase checkpoints
- [ ] Multi-phase plan generation and storage
- [ ] User approval gates for risky transformations

### v2.3.0 (2026-03-15) — Autonomous Execution

- [ ] Full `/refactor:fast` autonomy with parallel batch execution
- [ ] Stash/restore workflow automation (optional user opt-in)
- [ ] Advanced parallel batching for 10+ file projects
- [ ] Integration with external test frameworks (pytest, jest, go test, etc.)

### v2.4.0+ (Q2 2026) — Advanced

- [ ] Refactoring recipe library (common patterns)
- [ ] Integration with SonarQube, CodeScene
- [ ] Refactoring cost-benefit analysis (pre-planning)
- [ ] Team-aware refactoring (consider active developers)

## Team & Ownership

- **Project Lead:** bienhoang
- **Skill Development:** Claude Code agents (refactoring, docs-manager)
- **Documentation:** docs-manager agent (all ./docs/* files)

## License & Distribution

- **License:** MIT
- **Repository:** github.com/bienhoang/claude-skill-refactoring
- **Package:** npm registry (claude-skill-refactoring)
- **Installation:** Global (`npm install -g`) or project-level (`npm install --save-dev`)
