# Design Patterns for Refactoring

Maps code smells to architectural pattern solutions. Use this reference during the Transform phase when structural smells require pattern-level fixes, not just mechanical refactoring.

**Separation from refactoring-methods.md:** This file answers "WHAT pattern to apply." `references/refactoring-methods.md` answers "HOW to apply the transformation mechanics."

## Quick Reference

```yaml
smell_to_pattern:
  switch_on_type: [Strategy, State, Polymorphism]
  god_class: [Facade, Extract_Class, Mediator]
  feature_envy: [Move_Method, Visitor]
  duplicate_code: [Template_Method, Strategy]
  long_parameter_list: [Builder, Parameter_Object]
  null_checks: [Null_Object, Optional]
  complex_construction: [Factory_Method, Builder]
  many_responsibilities: [Decorator, Chain_of_Responsibility]
  tight_coupling: [Dependency_Injection, Observer, Mediator]
yagni_gate: "Apply pattern only if 3+ variants exist or are planned"
```

## Smell-to-Pattern Mapping

The mapping is **not 1:1** — context determines the right pattern. Use the "When" column to decide.

| Code Smell | Pattern Options | When to Use Which |
|------------|----------------|-------------------|
| **Switch/if-else on type** | Strategy, State, Polymorphism | Strategy: behavior varies by input. State: behavior varies by object state. Polymorphism: type hierarchy exists. |
| **God Class** | Facade + Extract Class, Mediator | Facade: class is an entry point for subsystem. Mediator: class coordinates between many peers. |
| **Feature Envy** | Move Method, Visitor | Move Method: method clearly belongs elsewhere. Visitor: operation spans many classes in hierarchy. |
| **Duplicate Code** | Template Method, Strategy | Template Method: same algorithm, different steps. Strategy: entirely different algorithms sharing interface. |
| **Long Parameter List** | Builder, Parameter Object | Builder: complex construction with optional params. Parameter Object: params always travel together. |
| **Repeated Null Checks** | Null Object, Optional/Maybe | Null Object: need polymorphic behavior. Optional: just need safe value access. |
| **Complex Object Creation** | Factory Method, Abstract Factory, Builder | Factory Method: one product type, subclass decides. Abstract Factory: family of related objects. Builder: step-by-step construction. |
| **Too Many Responsibilities** | Decorator, Chain of Responsibility | Decorator: additive behaviors (logging, caching). Chain: sequential processing with possible short-circuit. |
| **Tight Coupling** | DI, Observer, Mediator | DI: construction-time coupling. Observer: event-based communication. Mediator: many-to-many coordination. |
| **Primitive Obsession** | Value Object | Always: when primitives carry domain meaning (Money, Email, DateRange). |
| **Parallel Hierarchies** | Bridge | When abstraction and implementation vary independently. |

## YAGNI Gate — When to Apply vs Skip

**Apply a pattern when:**
- 3+ concrete variants exist today (not hypothetical)
- The smell causes active bugs or blocks feature development
- Multiple team members struggle with the code
- Metrics confirm the problem (see `references/metrics.md`): cyclomatic >15, class >500 LOC

**Skip / defer when:**
- Only 1-2 variants exist — a simple if/else is clearer
- The code is stable (low change frequency, per `references/prioritization.md`)
- Pattern would add more classes/files than the problem warrants
- "What if we need it later" is the only justification

**Rule of three:** Don't introduce a pattern until you see the same problem in at least 3 places. Before that, simple duplication or conditional logic is acceptable and easier to understand.

**Example:** A function has an if/else for two payment types (credit card, PayPal). Don't introduce Strategy — a simple conditional is clearer. When a third type arrives (crypto), now extract a Strategy interface. The second case confirms the pattern; the third justifies the abstraction.

## Modern Alternatives

Classic GoF patterns have lighter modern equivalents in many languages:

| Classic Pattern | Modern Alternative | When to Prefer Modern |
|----------------|-------------------|----------------------|
| **Singleton** | Dependency Injection container | Always — singletons hide dependencies and break testing |
| **Factory Method** | Functional composition, builder functions | When creating simple objects without class hierarchy |
| **Strategy** | Higher-order functions, function injection | When strategies are single-method (common in JS/TS, Python, Go) |
| **Observer** | Reactive streams (RxJS, Kotlin Flow, async iterators) | When dealing with async event streams |
| **Template Method** | Composition over inheritance (inject behavior functions) | When avoiding deep inheritance hierarchies |
| **Command** | Closures, thunks, action objects | When commands are simple data with execute semantics |
| **Iterator** | Built-in generators/iterators, lazy sequences | Always — use language-native iteration |
| **State** | Finite state machines (XState, state charts) | When state transitions are complex and need visualization |

**Decision:** If the language supports first-class functions and the pattern would be a single-method interface, use the modern alternative.

## Anti-Patterns: When Patterns Make Code Worse

### 1. Premature Abstraction
**Symptom:** Interface with exactly one implementation.
**Problem:** Adds indirection without flexibility. Extra file, extra navigation, no benefit.
**Fix:** Delete the interface. Introduce it when a second implementation appears.

### 2. God Strategy
**Symptom:** Strategy pattern with 15+ strategies in a directory.
**Problem:** Harder to navigate than the original switch statement. Each strategy is a tiny class doing one thing.
**Fix:** Consider a lookup table (Map/Dict) or data-driven approach instead of a class per variant.

### 3. Pattern for Pattern's Sake
**Symptom:** Applying patterns from a textbook without a real smell driving it.
**Problem:** Over-engineering. Code becomes harder to follow, not easier.
**Fix:** Start with the simplest solution. Refactor to a pattern only when the simple solution creates pain.

### 4. Inheritance Addiction
**Symptom:** Deep class hierarchies (>3 levels) to share behavior.
**Problem:** Fragile base class problem. Changes to parent ripple unpredictably.
**Fix:** Favor composition (inject behavior) over inheritance (extend parent).

## How to Apply

1. **Identify the smell** using `references/code-smells.md`
2. **Check the mapping table** above for pattern candidates
3. **Pass the YAGNI gate** — does the context justify the pattern?
4. **Consider modern alternatives** — is there a lighter solution?
5. **Apply using mechanics** from `references/refactoring-methods.md` (Extract Class, Move Method, etc.)
6. **Verify** — run tests after each transformation step
