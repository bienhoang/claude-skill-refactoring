# Migration Patterns Reference

Step-by-step patterns for migrating between code paradigms. Load this reference during the Transform phase when refactoring involves converting code from one pattern to another.

**Separation from refactoring-methods.md:** This file covers multi-step migration sequences. `references/refactoring-methods.md` covers individual transformation mechanics.

## Quick Reference

```yaml
migrations:
  callback_to_async: { risk: medium, steps: 4, reversible: true }
  class_to_functional: { risk: medium, steps: 5, reversible: true }
  monolith_to_service: { risk: high, steps: 3_patterns, reversible: partial }
  sync_to_async: { risk: high, steps: 4, reversible: false }
  orm_migration: { risk: high, steps: 3_strategies, reversible: true }
general_rule: "Migrate incrementally — hybrid state is acceptable and expected"
```

## Callback → Promise → Async/Await

**When:** Code uses nested callbacks (callback hell), promise chains are deep, or codebase mixes callback and promise styles.

**Steps:**
1. **Wrap callbacks in Promises:** Create Promise wrapper around callback-based function. Test wrapper independently.
2. **Replace callback calls with Promise calls:** Swap each callback invocation to use the wrapper. Run tests after each swap.
3. **Convert .then() chains to async/await:** Replace `promise.then(result => ...).catch(err => ...)` with `try { const result = await promise; } catch (err) { ... }`. Run tests.
4. **Extract repeated patterns:** Factor common async operations into utility functions.

**Verification:** Each step must pass existing tests before proceeding. Compare execution results before/after for key scenarios.

**Rollback:** Revert to previous step — each step is independently functional.

**Hybrid state is OK:** Low-level utilities can remain Promise-based while high-level code uses async/await.

## Class → Functional Components

**When:** React class components need modernization, or OOP code would benefit from functional style (simpler, composable).

**Lifecycle mapping (React):**

| Class | Functional |
|-------|-----------|
| `constructor` / `this.state` | `useState()` |
| `componentDidMount` | `useEffect(() => ..., [])` |
| `componentDidUpdate` | `useEffect(() => ..., [deps])` |
| `componentWillUnmount` | `useEffect(() => { return cleanup }, [])` |
| `this.setState` | `setState()` from useState |
| Instance methods | Functions in component body or `useCallback` |
| `contextType` / `static contextType` | `useContext()` |
| `createRef` | `useRef()` |

**Steps:**
1. **Convert state:** Replace `this.state = {}` with `useState()` hooks. One hook per logical state group.
2. **Convert lifecycle:** Map lifecycle methods to `useEffect` using table above.
3. **Convert methods:** Extract instance methods to plain functions or `useCallback`.
4. **Convert refs:** Replace `createRef` with `useRef`.
5. **Remove class wrapper:** Convert `class X extends Component` to `function X(props)` or arrow function.

**Verification:** Snapshot tests before and after. Visual regression if UI component. All existing component tests must pass.

**Rollback:** Each step produces a working component — revert to last working step.

## Monolith → Service Extraction

**When:** Monolithic application needs to extract functionality into separate services. High-risk migration requiring careful planning.

### Strangler Fig Pattern
Best for: edge/API layer services with clear request routing.

1. **Transform:** Identify target functionality. Build new service implementing same interface.
2. **Coexist:** Add proxy/router that intercepts requests. Route matching requests to new service, everything else to monolith.
3. **Eliminate:** Once traffic fully migrated and stable, remove old code from monolith.

### Branch by Abstraction
Best for: deep stack components with many upstream dependents.

1. **Create abstraction:** Insert interface between target component and its clients.
2. **Migrate clients:** Update all clients to use the abstraction (not the concrete implementation).
3. **Swap implementation:** Build new service behind the abstraction. Switch to new implementation.
4. **Remove old:** Delete old implementation once new is validated.

**Verification:** Run integration tests at each step. Monitor error rates during coexistence. Use feature flags to control rollout percentage.

**Rollback:** Strangler Fig — route traffic back to monolith. Branch by Abstraction — swap back to old implementation.

## Sync → Async Processing

**When:** Synchronous operations block threads, cause timeouts, or need to scale independently.

**Patterns:**

| Pattern | When to Use | Mechanism |
|---------|------------|-----------|
| **Message Queue** | Decouple producer from consumer | Publish to queue (RabbitMQ, SQS), process asynchronously |
| **Event Sourcing** | Need audit trail + async processing | Emit domain events, process via event handlers |
| **Polling → Webhooks** | Reduce unnecessary requests | Replace polling loops with webhook callbacks |
| **Batch Processing** | Many small sync requests | Aggregate requests, process in periodic batch |

**Steps:**
1. **Identify sync bottleneck:** Profile to find blocking operations.
2. **Choose pattern:** Select from table above based on requirements.
3. **Add async path alongside sync:** Both work simultaneously during migration.
4. **Migrate callers:** Switch callers to async path one at a time. Remove sync path when all migrated.

**Verification:** Compare results of sync and async paths. Monitor queue depth, processing latency, error rates.

**Rollback:** Keep sync path available during migration. Disable async path via feature flag if issues arise.

## ORM Migration

**When:** Switching ORMs, database engines, or data access patterns.

**Strategies:**

| Strategy | When to Use | Risk |
|----------|------------|------|
| **Parallel Run** | Need to verify correctness | Low — dual-write, compare results |
| **Feature Flag per Entity** | Gradual migration | Medium — entity-level control |
| **Repository Abstraction** | Clean separation needed | Low — swap behind interface |

**Steps (Repository Abstraction — recommended):**
1. **Create repository interface:** Define data access methods as interface/abstract class.
2. **Wrap existing ORM:** Implement interface using current ORM.
3. **Build new implementation:** Implement interface using new ORM.
4. **Swap and verify:** Switch to new implementation, run full test suite.

**Verification:** Compare query results between old and new for key operations. Performance benchmarks for critical queries.

**Rollback:** Swap back to old repository implementation.

## How to Apply

1. **Identify migration type** from the categories above
2. **Follow the step sequence** — each step produces a working system
3. **Test after each step** — never skip verification between steps
4. **Hybrid state is expected** — don't rush to complete the migration in one pass
5. Cross-reference `references/refactoring-methods.md` for individual transformation mechanics
