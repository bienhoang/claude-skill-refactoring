---
name: refactoring
description: >
  Systematic code refactoring with code smell detection, safe transformation, and test verification.
  Use when the user asks to: refactor code, improve code quality, clean up code, reduce technical debt,
  fix code smells, simplify complex code, improve readability/maintainability, restructure code,
  extract methods/classes, reduce duplication, apply design patterns, or review code for quality issues.
  Also triggers on: "this code is messy", "hard to maintain", "too complex", "needs cleanup",
  "spaghetti code", "DRY violations", or any request to improve existing code structure without
  changing external behavior.
---

# Code Refactoring Skill

Systematic approach to improving code structure while preserving behavior. Follow the workflow below for every refactoring task.

## Core Workflow

### 1. Analyze — Detect Code Smells

Before changing anything, scan the code and identify smells. See `references/code-smells.md` for the full catalog organized by category.

**Priority order for fixing smells:**
1. Correctness risks (mutable default args, unclosed resources)
2. High-impact structural smells (God Class, Long Method, Feature Envy)
3. Duplication (DRY violations, copy-paste patterns)
4. Naming and readability issues
5. Minor style issues

Report findings to the user with severity (critical/major/minor) before proceeding.

### 2. Safeguard — Ensure Tests Exist Before Refactoring

**Never refactor without a safety net.** Before applying any transformation:

1. **Check for existing tests.** Look for test files, test directories, CI configs.
2. **If tests exist:** Run them first. Confirm they pass. Record the baseline.
3. **If no tests exist:** Write characterization tests that capture current behavior before refactoring.

**Characterization test strategy:**
- Identify the public API / entry points of the code being refactored
- Write tests that exercise current behavior including edge cases
- For functions: test typical inputs, boundary values, error cases
- For classes: test public methods, state transitions, interactions
- For APIs: test request/response contracts
- Use the project's existing test framework; if none exists, choose the standard for the language (pytest for Python, Jest/Vitest for JS/TS, JUnit for Java, go test for Go, etc.)

```
# Pattern: Characterization test
def test_existing_behavior_description():
    """Captures current behavior before refactoring."""
    result = function_under_refactor(known_input)
    assert result == observed_current_output  # Lock in behavior
```

**Integration test additions when refactoring crosses boundaries:**
- If refactoring touches multiple modules/classes, add integration tests covering their interaction
- If refactoring changes internal interfaces, test the contracts between components
- If refactoring modifies data flow, test end-to-end data transformations

### 3. Transform — Apply Refactoring Methods

Apply refactoring techniques from `references/refactoring-methods.md`. Key principles:

- **One refactoring at a time.** Apply a single transformation, verify tests pass, then proceed.
- **Small steps.** Break large refactorings into a sequence of small, safe transformations.
- **Preserve behavior.** The external observable behavior must not change (unless the user explicitly requests behavior changes alongside refactoring).
- **Commit points.** After each successful transformation + test pass, note it as a safe rollback point.

**Common transformation sequences:**

| Smell | Refactoring Sequence |
|-------|---------------------|
| Long Method | Extract Method → Introduce Parameter Object (if many params) |
| God Class | Extract Class → Move Method → Delegate |
| Feature Envy | Move Method → Extract Method if partial envy |
| Duplicate Code | Extract Method → Pull Up Method (if in siblings) |
| Long Parameter List | Introduce Parameter Object → Replace Params with Method |
| Switch Statements | Replace Conditional with Polymorphism |
| Data Clumps | Extract Class → Introduce Parameter Object |
| Primitive Obsession | Replace Primitive with Value Object |
| Deep Nesting | Replace Nested Conditional with Guard Clauses → Extract Method |

### 4. Verify — Run Tests and Validate

After each transformation:
1. Run the full test suite. All tests must pass.
2. If any test fails: **revert immediately** and investigate.
3. If all tests pass: proceed to the next transformation or finalize.

**Final verification checklist:**
- All pre-existing tests pass
- New characterization tests pass
- No behavioral changes (unless explicitly intended)
- Code coverage has not decreased
- Linting/type checking passes (if configured)

### 5. Report — Summarize Changes

Present to the user:
- Code smells found (with severity)
- Refactoring methods applied and why
- Before/after comparison of key metrics (complexity, duplication, line count)
- Test results summary
- Any remaining smells or suggested follow-up refactorings

## Language-Specific Guidance

Read `references/language-patterns.md` for language-specific refactoring patterns covering Python, JavaScript/TypeScript, Java, Go, Rust, and more.

## Decision Rules

- **If unsure whether behavior changes:** Do NOT apply. Ask the user.
- **If tests cannot be written** (e.g., tightly coupled to external systems): Apply only safe, mechanical refactorings (rename, extract constant, reorder parameters). Flag risky refactorings for user review.
- **If the codebase has no tests and is too large to characterize:** Focus on the specific area the user wants refactored. Write targeted tests for that area only.
- **If the user asks for "quick cleanup":** Skip writing new tests but still run existing ones. Apply only low-risk refactorings (rename, extract method, remove dead code).
