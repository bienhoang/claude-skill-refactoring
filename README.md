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
| `references/language-patterns.md` | Language-specific patterns for Python, JS/TS, Java, Go, Rust — including testing framework recommendations |

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
git clone https://github.com/YOUR_USERNAME/claude-skill-refactoring.git ~/.claude/skills/refactoring

# Project-level
git clone https://github.com/YOUR_USERNAME/claude-skill-refactoring.git .claude/skills/refactoring
```

## Usage

Once installed, the skill activates automatically when you ask Claude Code to refactor. Examples:

```
# Natural language — Claude detects the skill automatically
"refactor this code"
"this code is messy, clean it up"
"reduce duplication in this module"
"this class is too large, help me split it"
"improve the code quality of src/utils.ts"

# Or invoke directly
/refactoring
```

## How it works

Claude Code loads skills from `~/.claude/skills/` (global) or `.claude/skills/` (project). This package copies the skill files to the appropriate location on `npm install` and removes them on `npm uninstall`.

```
~/.claude/skills/refactoring/
├── SKILL.md                          # Core workflow (what Claude follows)
└── references/
    ├── code-smells.md                # Smell catalog (loaded when analyzing)
    ├── refactoring-methods.md        # Method catalog (loaded when transforming)
    └── language-patterns.md          # Language-specific patterns (loaded as needed)
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
