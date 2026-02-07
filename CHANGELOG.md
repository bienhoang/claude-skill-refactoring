# Changelog

## [2.0.0] - 2026-02-08

### Added
- **`references/metrics.md`** — Quantitative code metrics with NIST/SonarQube thresholds for cyclomatic complexity, cognitive complexity, coupling (Ca/Ce/I/D), cohesion (LCOM-HS), and size limits (method/class/file/parameters). Includes YAML quick-reference block for AI consumption.
- **`references/security-smells.md`** — OWASP Top 10 mapped to detectable code patterns, hardcoded secrets regex patterns (AWS, GitHub, OpenAI keys), language-specific security smells (Python, JS/TS, SQL, Java, Go), severity mapping (Critical/High/Medium/Low).
- **`references/prioritization.md`** — ROI-based scoring formula `(Severity x Frequency x Impact) / Effort`, Fix/Defer/Accept decision tree with score thresholds, CodeScene hotspot model, SonarQube Technical Debt Ratio (A-E), agent checklist for consistent prioritization.
- **`/refactor:review`** slash command — Read-only code analysis that scans, scores, and generates prioritized report without modifying code. Loads all 4 reference catalogs.
- Router now detects review/analyze/audit/scan keywords and routes to `/refactor:review`
- **`references/dependency-analysis.md`** — Circular dependency detection strategies, import graph analysis guidance, module coupling checklist (>5 imports = split candidate), package boundary rules, pre/post refactoring verification, per-language tool recommendations (madge, deptry, jdeps, cargo-udeps, etc.).
- **`references/design-patterns.md`** — Smell-to-pattern mapping table (11 smells → pattern options with context), YAGNI gate criteria (rule of three), modern alternatives to GoF patterns (Strategy → higher-order functions, Singleton → DI, etc.), 4 anti-patterns (premature abstraction, God Strategy, pattern for pattern's sake, inheritance addiction).
- **`references/migration-patterns.md`** — Step-by-step migration sequences for 5 common paradigm shifts: callback→Promise→async/await, class→functional components (React lifecycle mapping), monolith→service extraction (Strangler Fig, Branch by Abstraction), sync→async processing (message queue, event sourcing), ORM migration (repository abstraction).
- **Git Strategy** section in SKILL.md — suggest-only git practices: stash before start, commit-per-refactoring, conventional commits (`refactor:` prefix), feature branch for plans, squash option
- **Advanced testing strategies** in Safeguard phase — property-based testing (Hypothesis, fast-check), snapshot/approval testing, contract testing, mutation testing awareness (mutmut, Stryker)
- **Parallel refactoring** support in SKILL.md and `/refactor:fast` — detect independent tasks via dependency graph, batch execution, merge + full test verification
- **Project Configuration** (`.refactoring-config.json`) — optional project-level customization: custom thresholds, custom smells, ignore patterns, severity overrides. Missing fields use defaults; no config file = backward compatible.
- **Session History** (`.refactoring-history.json`) — append-only trend tracking across refactoring sessions. Stores smells found/fixed, methods applied, before/after metrics. Trend display (improving/stable/declining) at start of Analyze.

### Changed
- SKILL.md Analyze phase now loads metrics.md, security-smells.md, and prioritization.md alongside code-smells.md
- **Breaking:** Priority order updated — security vulnerabilities now ranked #1 above correctness risks. Refactoring output may differ from v1.x for codebases with security smells.
- SKILL.md Transform phase conditionally loads design-patterns.md (architectural smells) and dependency-analysis.md (multi-file refactoring)
- `/refactor:plan` Scout step now maps import graph and suggests feature branch; Brainstorm step consults design-patterns.md and migration-patterns.md
- `/refactor:fast` now suggests git stash/commit, includes parallel refactoring check for directory targets
- `/refactor:implement` now suggests conventional commit after each successful transformation
- SKILL.md Transform phase conditionally loads migration-patterns.md for paradigm migrations
- SKILL.md Analyze phase now loads `.refactoring-config.json` (custom thresholds, ignore patterns) and `.refactoring-history.json` (trend display) if they exist
- SKILL.md Report phase now appends session entry to `.refactoring-history.json`
- `/refactor:fast` loads config after Scout, writes history in Report
- `/refactor:review` loads config after Scout, displays trend in report (read-only — no history write)
- `/refactor:implement` loads config before transformations, writes history in Report
- Version bump: 1.2.0 → 2.0.0

## [1.2.0] - 2026-02-06

### Added
- **6 new language reference files** under `references/languages/`:
  - `cpp.md` — 15 smells, CMake/clang-format/clang-tidy detection, Qt/Boost/gRPC patterns, C++11–23 version-gated
  - `dart.md` — 15 smells, pubspec/analysis_options detection, Flutter/Riverpod/Bloc/Shelf patterns, Dart 2.12–3.x
  - `scala.md` — 15 smells, build.sbt/scalafmt/scalafix detection, Play/Akka/ZIO/Cats Effect patterns, Scala 2.12–3.x
  - `elixir.md` — 15 smells, mix.exs/credo/formatter detection, Phoenix/LiveView/Ecto patterns, Elixir 1.12–1.17
  - `shell-bash.md` — 15 smells, shellcheckrc/shfmt detection, Bats/shellspec testing, Bash 4+/5+/POSIX
  - `lua.md` — 15 smells, luacheckrc/stylua detection, LÖVE2D/Neovim/OpenResty patterns, Lua 5.1–5.4/LuaJIT
- Updated `_index.md` routing table with 6 new extension mappings

### Changed
- Total language count: 10 → 16
- README updated with expanded language list and directory tree

## [1.1.0] - 2026-02-06

### Added
- **Convention Discovery Workflow** — skill now detects project coding conventions (lint configs, formatters, framework) before making refactoring suggestions
- **Per-language reference files** under `references/languages/` with 200+ lines each:
  - `python.md` — 17 smells, pyproject/ruff/black detection, Django/Flask/FastAPI patterns
  - `javascript-typescript.md` — 16 smells, tsconfig/eslint/prettier detection, React/Next.js/Vue patterns
  - `java.md` — 15 smells, Maven/Gradle detection, Spring Boot/Quarkus/Hibernate patterns
  - `go.md` — 15 smells, golangci/go.mod detection, Gin/Echo/GORM patterns
  - `rust.md` — 15 smells, Cargo.toml/edition detection, Actix/Axum/Tokio/Serde patterns
  - `php.md` — 15 smells, composer/phpstan detection, Laravel/Symfony patterns
  - `ruby.md` — 15 smells, rubocop/gemfile detection, Rails/RSpec patterns
  - `csharp.md` — 15 smells, editorconfig/csproj detection, ASP.NET/EF/Blazor patterns
  - `swift.md` — 15 smells, swiftlint/SPM detection, SwiftUI/UIKit/Vapor patterns
  - `kotlin.md` — 15 smells, ktlint/detekt detection, Android/Spring/Ktor patterns
- **`_index.md` routing file** — maps file extensions to language files, handles multi-language projects
- **Two-section output format** — Aligned Refactorings (respects conventions) + Convention Improvements (informational suggestions)

### Changed
- SKILL.md now includes Discovery Workflow section with 6-step convention detection process
- All `/refactor` commands (fast, plan, implement) now run language discovery before analysis
- README updated with new directory structure and references table

### Removed
- `references/language-patterns.md` — replaced by 10 per-language files (5→10 languages, 126→2100+ lines)

## [1.0.0] - 2026-02-06

### Added
- Initial release
- Core refactoring workflow (Analyze → Safeguard → Transform → Verify → Report)
- `references/code-smells.md` — 25+ code smells by category
- `references/refactoring-methods.md` — 30+ refactoring techniques
- `/refactor` slash command family (router, fast, plan, implement)
- npm install/uninstall scripts for global and project-level installation
