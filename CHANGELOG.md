# Changelog

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
