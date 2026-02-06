# Changelog

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
