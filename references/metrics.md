# Code Metrics Reference

Quantitative thresholds for identifying refactoring targets. Use these metrics during the Analyze phase to score code health objectively.

## Quick Reference

```yaml
thresholds:
  cyclomatic_complexity:
    low: 1-10
    moderate: 11-15
    high: 16-25
    critical: 25+
  cognitive_complexity:
    good: <10
    acceptable: 10-14
    refactor: 15+
  method_lines: { good: <20, acceptable: 20-50, refactor: 50+ }
  class_lines: { good: <250, acceptable: 250-500, refactor: 500+ }
  file_lines: { good: <500, moderate: 500-1000, split: 1000+ }
  parameters: { acceptable: <=5, refactor: 6+ }
  efferent_coupling: { threshold: 50 }
  instability: { problematic: ">0.7" }
  lcom_hs: { alarming: ">1.0" }
  distance_main_seq: { problematic: ">0.7" }
```

## Cyclomatic Complexity (McCabe)

Counts linearly independent paths through code. Based on NIST SP 500-235.

**Formula:** `M = E - N + 2P` (edges - nodes + 2 x connected components)

| Range | Risk | Action |
|-------|------|--------|
| 1-10 | Low | No action needed |
| 11-15 | Moderate | Acceptable with good test coverage |
| 16-25 | High | Refactor — requires significant testing effort |
| 25+ | Critical | Untestable — must refactor immediately |

**How to estimate without tooling:** Count decision points (if, else if, case, for, while, &&, ||, catch, ternary) in a function and add 1.

## Cognitive Complexity (SonarQube)

Measures mental effort to understand code — penalizes nesting more heavily than cyclomatic.

**Scoring rules:**
- +1 for each `if`, `else if`, `else`, `switch`, `for`, `while`, `do`, `catch`, `&&`, `||`, ternary, goto
- +1 additional per nesting level (nested if inside a for = +2)
- +0 for `break`, `continue`, early `return` (these reduce complexity)
- Sequences of same operator (`a && b && c`) count as +1 total

| Score | Rating | Action |
|-------|--------|--------|
| <10 | Good | Target for all methods |
| 10-14 | Acceptable | Monitor, refactor if changing |
| 15+ | Refactor | Extract methods, flatten nesting, use guard clauses |

## Coupling Metrics

### Afferent Coupling (Ca)
Number of external types that depend on this type (incoming dependencies).
- High Ca = many dependents = risky to change (stable core)
- Low Ca = few dependents = safe to change

### Efferent Coupling (Ce)
Number of types this type depends on (outgoing dependencies).
- **Ce > 50** = too many dependencies, refactor to reduce
- High Ce = fragile, breaks when dependencies change

### Instability (I)
`I = Ce / (Ca + Ce)` — range 0 to 1

| Value | Meaning | Concern |
|-------|---------|---------|
| I = 0 | Maximally stable | Many dependents, hard to change |
| I = 1 | Maximally unstable | No dependents, easy to change |
| I > 0.7 | Problematic | Too volatile for its responsibility |

### Distance from Main Sequence (D)
`D = |A + I - 1|` — range 0 to 1, where A = abstractness ratio

| Value | Meaning |
|-------|---------|
| D = 0 | Ideal balance of abstractness and stability |
| D > 0.7 | Problematic — either too abstract+unstable or too concrete+stable |

## Cohesion (LCOM)

Measures whether class methods share instance variables. High LCOM = class likely violates Single Responsibility Principle.

### LCOM-HS (Henderson-Sellers)
`LCOM-HS = (avg methods per attribute - total methods) / (1 - total methods)`

| Value | Rating | Action |
|-------|--------|--------|
| 0-0.5 | Good | Cohesive class |
| 0.5-1.0 | Moderate | Consider splitting |
| >1.0 | Alarming | Split class — multiple responsibilities |

**Quick heuristic:** If a class has methods that don't share any instance variables (fields/properties) with other methods, LCOM is high — the class likely has multiple responsibilities.

## Size Thresholds

### Method / Function
| Lines | Rating | Action |
|-------|--------|--------|
| <20 | Good | Ideal size |
| 20-50 | Acceptable | Monitor for growth |
| 50+ | Refactor | Extract Method, decompose |

### Class / Module
| Lines | Rating | Action |
|-------|--------|--------|
| <250 | Good | Manageable scope |
| 250-500 | Acceptable | Watch for God Class symptoms |
| 500+ | Refactor | Extract Class, split responsibilities |

### File
| Lines | Rating | Action |
|-------|--------|--------|
| <500 | Good | Easy to navigate |
| 500-1000 | Moderate | Consider splitting if growing |
| 1000+ | Split | Too large — extract modules |

### Parameter Count
| Count | Action |
|-------|--------|
| 0-3 | Ideal |
| 4-5 | Acceptable |
| 6+ | Refactor — use parameter object or builder pattern |

## How to Apply

1. **During Analyze phase:** Estimate metrics for flagged code (exact tooling not required — heuristic counts are sufficient for prioritization)
2. **Score each smell:** Map metric values to thresholds above
3. **Feed into prioritization:** Use scores from this file as the Severity input for `references/prioritization.md`
4. **Report:** Include metrics in the findings table for the user
