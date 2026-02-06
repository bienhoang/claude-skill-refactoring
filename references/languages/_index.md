# Language Pattern Index

## Usage
1. Identify file extensions in target code
2. Look up language file(s) below
3. Load relevant language file(s)
4. Execute Discovery section from loaded file(s) before analysis

## Language Detection

| Extensions | Language File | Primary Ecosystem |
|---|---|---|
| .py, .pyx, .pyw | python.md | pip/uv, pyproject.toml |
| .js, .jsx, .ts, .tsx, .mjs, .cjs | javascript-typescript.md | npm/pnpm/yarn, package.json |
| .java | java.md | Maven/Gradle |
| .go | go.md | go modules |
| .rs | rust.md | Cargo |
| .php | php.md | Composer |
| .rb, .rake | ruby.md | Bundler/Gem |
| .cs | csharp.md | .NET/NuGet |
| .swift | swift.md | SPM/CocoaPods |
| .kt, .kts | kotlin.md | Gradle |

## Multi-Language Projects
When target spans multiple languages:
- **In /refactor:fast mode:** Auto-detect primary language from target file extensions. Load only that language file.
- **In /refactor:plan and /refactor:implement mode:** Use `AskUserQuestion` to ask user which language to focus on. Load chosen language file.
- If user selects multiple: load all selected files, apply discovery from each.

## Convention Improvements Tone
All "Convention Improvements" suggestions must be informational only:
- Format: "Your project uses X. Consider Y because [reasoning]."
- Never pressure to change. Present as optional information.

## Fallback
If language file not yet available or language not listed: apply only generic patterns from code-smells.md and refactoring-methods.md. Skip Discovery section and proceed with standard analysis workflow.
