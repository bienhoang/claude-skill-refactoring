# Dependency Analysis Reference

Guidance for understanding and improving module dependencies before multi-file refactoring. Load this reference when refactoring touches multiple files, modules, or packages.

## Quick Reference

```yaml
dependency_analysis:
  circular_deps: always_break_before_refactoring
  coupling_threshold: { imports: 5, ce: 50, instability: 0.7 }
  boundary_rule: "core modules must NOT import from feature modules"
  verification: run_before_and_after_refactoring
tools:
  javascript: [madge, dependency-cruiser, skott]
  typescript: [madge, dependency-cruiser, skott]
  python: [deptry, pydeps, import-linter]
  go: [go_vet, depguard]
  rust: [cargo-udeps, cargo-deny]
  java: [jdeps, archunit]
  csharp: [ndepend, archunitnet]
```

## Circular Dependency Detection

Circular dependencies (A imports B, B imports C, C imports A) make code fragile and untestable. Break them before any structural refactoring.

### Identification Patterns
- **Direct cycle:** A → B → A (two modules importing each other)
- **Indirect cycle:** A → B → C → A (chain forming a loop)
- **Hidden cycle:** Via re-exports, barrel files, or index files that aggregate imports

### Breaking Strategies
| Strategy | When to Use | Mechanics |
|----------|------------|-----------|
| **Extract Interface** | Both modules need each other's types | Create shared interface module, both depend on it |
| **Dependency Inversion** | Lower module depends on higher | Higher module defines interface, lower implements |
| **Move to Third Module** | Shared functionality creates cycle | Extract common code to new module both import |
| **Event/Callback** | Runtime dependency, not type dependency | Replace direct call with event emission or callback injection |
| **Merge Modules** | Modules are tightly coupled by nature | Combine into single module if cohesion is high |

### Verification
After breaking a cycle, confirm:
- No new circular dependencies introduced
- Existing tests still pass
- Import graph is acyclic for affected modules

## Import Graph Analysis

### What to Look For
- **Fan-out (high Ce):** Module imports many others → fragile, breaks easily
- **Fan-in (high Ca):** Many modules import this one → stable core, risky to change
- **Hub modules:** High fan-in AND fan-out → likely God Module, split candidate
- **Orphan modules:** No imports to or from → dead code candidate or utility
- **Long chains:** A → B → C → D → E → deeply nested dependency → fragile path

### Coupling Indicators

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Module imports >5 others | Ce > 5 | Candidate for splitting |
| Module imported by >10 others | Ca > 10 | Stable core — change carefully |

For Instability (I), Distance (D), and other coupling formulas, see `references/metrics.md` — those metrics apply here when analyzing import graph results.

## Module Coupling Checklist

Use this checklist when analyzing a codebase before planning multi-file refactoring:

- [ ] Map import graph for target modules (which modules import what)
- [ ] Identify circular dependencies — break these first
- [ ] Flag modules with >5 outgoing imports (splitting candidates)
- [ ] Flag modules with >10 incoming imports (high-risk change targets)
- [ ] Check boundary violations: do feature modules import from other feature modules?
- [ ] Identify God Modules (high fan-in + high fan-out)
- [ ] Check for barrel file bloat (index files re-exporting everything)

## Package Boundary Rules

Well-structured codebases follow directional dependency rules:

```
Allowed:
  feature → core
  feature → shared/utils
  api → service → repository

Forbidden:
  core → feature          (core must not know about features)
  feature-A → feature-B   (features should be independent)
  repository → api        (lower layer must not import higher)
```

### Boundary Detection
1. **Cluster analysis:** Group files that change together (high co-change = high cohesion)
2. **Import direction:** Identify which direction imports flow. Violations = coupling smell
3. **Shared types:** Types imported across many modules = candidates for shared/core package
4. **Test coupling:** If testing module A requires mocking module B's internals, boundary is too tight

## Per-Language Tool Recommendations

| Language | Tool | Purpose |
|----------|------|---------|
| JS/TS | `madge --circular src/` | Detect circular deps, visualize graph |
| JS/TS | `dependency-cruiser` | Validate rules, detect orphans/circulars |
| JS/TS | `skott` | Newer alternative with enhanced visualization |
| Python | `deptry` | Detect unused/missing dependencies |
| Python | `pydeps` | Visualize module dependency graph |
| Python | `import-linter` | Enforce import rules/boundaries |
| Go | `go vet` | Built-in static analysis including import issues |
| Go | `depguard` | Enforce import whitelists/blacklists |
| Rust | `cargo-udeps` | Find unused dependencies |
| Rust | `cargo-deny` | Audit deps for security/license/duplicates |
| Java | `jdeps` | Built-in JDK dependency analyzer |
| Java | `ArchUnit` | Test architecture rules in unit tests |
| C# | `NDepend` | Comprehensive dependency analysis |
| C# | `ArchUnitNET` | Architecture unit tests |

**Common commands (suggest to user when relevant):**
```bash
# JS/TS — detect circular dependencies
npx madge --circular src/

# Python — find unused/missing imports
pip install deptry && deptry .

# Go — built-in static analysis
go vet ./...
```

**Note:** Exact tool commands not required — Claude can suggest running them and interpret results. Focus on understanding what the import graph reveals.

## Pre-Refactoring Verification

Before starting multi-file refactoring:

1. **Map current state:** List all import relationships for affected modules
2. **Break cycles:** Resolve any circular dependencies first
3. **Identify boundaries:** Know which modules are core vs feature vs shared
4. **Assess risk:** High-Ca modules (many dependents) need extra caution
5. **Plan order:** Refactor leaf modules (low Ca) first, work toward core

## Post-Refactoring Verification

After completing multi-file refactoring:

1. **No new cycles:** Verify no circular dependencies were introduced
2. **Boundaries intact:** Import direction rules still respected
3. **Coupling reduced:** Ce for refactored modules should decrease or stay same
4. **Tests pass:** All existing tests pass, no broken imports
5. **No orphans:** No modules left disconnected unintentionally

## Architectural-Scale Analysis

For module-level coupling issues at architectural scale (God Module, Layer Violations, Distributed Monolith, etc.), see `references/architecture/architectural-smells.md`. This file focuses on import graph mechanics; architectural smells operate at a higher abstraction level.
