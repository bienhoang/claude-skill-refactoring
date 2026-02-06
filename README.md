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

Once installed, you get four slash commands:

### `/refactor [target]` — Intelligent Router

Automatically detects the best approach based on scope:
- Single file → routes to `/refactor:fast`
- Directory or module → routes to `/refactor:plan`
- Plan file path → routes to `/refactor:implement`

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

## How it works

Claude Code loads skills from `~/.claude/skills/` (global) or `.claude/skills/` (project). This package copies the skill files and slash commands to the appropriate locations on `npm install` and removes them on `npm uninstall`.

```
~/.claude/skills/refactoring/
├── SKILL.md                          # Core workflow (what Claude follows)
└── references/
    ├── code-smells.md                # Smell catalog (loaded when analyzing)
    ├── refactoring-methods.md        # Method catalog (loaded when transforming)
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
    ├── fast.md                       # /refactor:fast
    ├── plan.md                       # /refactor:plan
    └── implement.md                  # /refactor:implement
```

References are loaded on-demand using Claude's progressive disclosure pattern — they only consume context when Claude actually needs them.

## Uninstall

```bash
npm uninstall -g claude-skill-refactoring
# or for project-level
npm uninstall claude-skill-refactoring
```

## License

MIT
