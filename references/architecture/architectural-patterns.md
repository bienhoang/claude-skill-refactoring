# Architectural Patterns Reference

Maps architectural smells to pattern solutions at the system/module level. Load this reference during the Transform phase when architectural smells require structural changes beyond code-level refactoring.

**Separation from other references:** This file answers "WHAT architectural pattern to apply." `references/design-patterns.md` answers "WHAT code-level (GoF) pattern to apply." `references/architecture/architectural-smells.md` answers "WHAT is wrong at the architecture level."

## Quick Reference

```yaml
smell_to_pattern:
  god_module: [Modular_Decomposition, Bounded_Context]
  ambiguous_boundaries: [Anti_Corruption_Layer, Bounded_Context]
  feature_scattering: [Modular_Decomposition, CQRS]
  hub_dependency: [API_Gateway, Mediator_Service]
  layer_violation: [Repository, Anti_Corruption_Layer]
  leaky_abstraction: [Anti_Corruption_Layer, BFF]
  missing_abstraction: [Repository, Unit_of_Work]
  cyclic_dependencies: [Dependency_Inversion, Event_Sourcing]
  distributed_monolith: [Strangler_Fig, Branch_by_Abstraction]
  chatty_services: [BFF, API_Gateway, CQRS]
  shared_database: [Database_per_Service, Outbox]
  nano_services: [Service_Merge, Sidecar]

patterns:
  cqrs: { scope: module, effort: medium, risk: medium }
  event_sourcing: { scope: module, effort: high, risk: high }
  saga: { scope: distributed, effort: high, risk: high }
  bff: { scope: api_layer, effort: low, risk: low }
  api_gateway: { scope: api_layer, effort: medium, risk: low }
  circuit_breaker: { scope: integration, effort: low, risk: low }
  strangler_fig: { scope: system, effort: high, risk: medium }
  branch_by_abstraction: { scope: module, effort: medium, risk: low }
  repository: { scope: module, effort: low, risk: low }
  unit_of_work: { scope: module, effort: low, risk: low }
  anti_corruption_layer: { scope: boundary, effort: medium, risk: low }
  sidecar_ambassador: { scope: infrastructure, effort: medium, risk: low }
  outbox: { scope: distributed, effort: medium, risk: medium }

yagni_gate: "Apply pattern only when concrete pain exists — never for hypothetical future needs"
```

## Pattern Catalog

### CQRS (Command Query Responsibility Segregation)

Separate read and write models. Commands mutate state through a write model; queries read from an optimized read model. Can use same or separate data stores.

**Apply when:**
- Read/write scaling imbalance >= 5:1 ratio observed in production
- Complex aggregation queries slow down write-optimized tables
- Separate teams own read vs write logic
- Task-based UI with complex command validation

**Skip when:**
- Simple CRUD with balanced read/write load
- Single team, single data model sufficient
- No observed query performance bottleneck

**Rule of three:** Need 3+ query patterns that conflict with write-optimized schema before separating models.

**Structure:**
```
commands/          # Write side — validate, mutate state
  create-order.ts
  cancel-order.ts
queries/           # Read side — optimized projections
  order-summary.ts
  order-list.ts
models/
  write-model.ts   # Normalized, integrity-focused
  read-model.ts    # Denormalized, query-optimized
```

**Related patterns:** Event Sourcing (often paired), Saga (distributed commands).

---

### Event Sourcing

Store state as a sequence of domain events rather than current state snapshots. Reconstruct current state by replaying events. Provides complete audit trail.

**Apply when:**
- Audit trail is a hard business requirement (finance, healthcare, compliance)
- Need to reconstruct "what happened" at any point in time
- Complex domain where state transitions matter more than current state
- Already using CQRS and need event-driven read model updates

**Skip when:**
- Simple CRUD where current state is all that matters
- No audit or temporal query requirements
- Team unfamiliar with eventual consistency patterns

**Rule of three:** Need 3+ use cases requiring historical state reconstruction (audit, undo, replay) before adopting.

**Structure:**
```
events/
  order-created.ts    # Immutable event record
  order-shipped.ts
event-store/
  append.ts           # Append-only write
  replay.ts           # State reconstruction
projections/
  order-projection.ts # Materialized view from events
```

**Related patterns:** CQRS (read projections from events), Saga (event-driven orchestration), Outbox (reliable event publishing).

---

### Saga (Orchestration vs Choreography)

Manage distributed transactions across services without two-phase commit. Each step has a compensating action for rollback.

**Orchestration:** Central coordinator directs steps sequentially.
**Choreography:** Each service listens for events and acts independently.

**Apply when:**
- Business transaction spans 3+ services
- Need rollback capability across service boundaries
- Two-phase commit (2PC) not feasible due to latency or availability requirements

**Skip when:**
- Transaction fits within a single service/database
- Fewer than 3 services involved (direct API calls sufficient)
- Eventual consistency not acceptable for the use case

**Rule of three:** Need 3+ cross-service transactions before investing in saga infrastructure.

**Orchestration vs Choreography:**
| Factor | Orchestration | Choreography |
|--------|--------------|--------------|
| Complexity | Centralized, easier to trace | Decentralized, harder to trace |
| Coupling | Services coupled to orchestrator | Services loosely coupled via events |
| Best for | Linear workflows (order→pay→ship) | Parallel/reactive workflows |

**Related patterns:** Outbox (reliable event publishing for choreography), Circuit Breaker (handle step failures).

---

### BFF (Backend for Frontend)

Dedicated backend service per frontend type. Aggregates, transforms, and tailors API responses for specific client needs (web, mobile, IoT).

**Apply when:**
- Multiple frontend types with divergent data needs (web shows full detail, mobile shows summary)
- General-purpose API returns too much data for mobile or too little for web
- Frontend teams want autonomy over their backend contract

**Skip when:**
- Single frontend type (web only)
- API already serves all clients adequately
- Team too small to maintain multiple backends

**Rule of three:** Need 3+ significantly different client data shapes before creating dedicated BFFs.

**Structure:**
```
bff-web/         # Tailored for web SPA
  routes.ts
  transformers/
bff-mobile/      # Tailored for mobile (less data, different shape)
  routes.ts
  transformers/
services/        # Shared domain services (BFFs call these)
```

**Related patterns:** API Gateway (can route to BFFs), Anti-Corruption Layer (BFF isolates frontend from backend changes).

---

### API Gateway

Single entry point that routes requests to appropriate backend services. Handles cross-cutting concerns: auth, rate limiting, request transformation, SSL termination.

**Apply when:**
- 3+ backend services that clients need to reach
- Cross-cutting concerns duplicated across services (auth, logging, CORS)
- Need to decouple client URL structure from internal service topology

**Skip when:**
- Single backend service (direct communication simpler)
- Fewer than 3 services (simple reverse proxy sufficient)

**Rule of three:** 3+ services with shared cross-cutting concerns justify a gateway.

**Related patterns:** BFF (gateway can route to BFFs), Circuit Breaker (gateway-level fault tolerance).

---

### Circuit Breaker

Prevent cascading failures by detecting repeated failures and short-circuiting calls to unhealthy services. Three states: Closed (normal) → Open (failing, reject calls) → Half-Open (testing recovery).

**Apply when:**
- Service makes calls to external/remote services that can fail or become slow
- Cascading failures observed (one slow service brings down others)
- Need graceful degradation instead of timeout-based waiting

**Skip when:**
- All calls are local/in-process
- Downstream services are highly reliable (>99.99% uptime)
- Simple retry logic is sufficient

**Rule of three:** 3+ timeout incidents with the same downstream service justify a circuit breaker.

**Configuration:**
```yaml
failure_rate_threshold: 50%     # Open after 50% of calls fail
slow_call_threshold: 60%        # Open after 60% of calls exceed timeout
wait_duration: 30s              # Time in Open before trying Half-Open
minimum_calls: 10               # Don't evaluate until 10 calls recorded
```

**Related patterns:** Saga (circuit breaker on saga steps), API Gateway (gateway-level circuit breaking).

---

### Strangler Fig

Gradually replace a legacy system by building new functionality alongside it, routing traffic incrementally from old to new until the legacy system can be decommissioned.

**Apply when:**
- Legacy system needs replacement but big-bang rewrite is too risky
- System has clear request routing (HTTP endpoints, message queues) that can be intercepted
- Business cannot tolerate extended downtime during migration
- New system can implement features incrementally (not all-or-nothing)

**Skip when:**
- Legacy system is small enough for direct rewrite (<2 weeks effort)
- No clear routing layer to intercept and redirect traffic
- Legacy system is being decommissioned entirely (just shut it down)

**Rule of three:** System has 3+ features that can be independently migrated.

**Mechanism:**
1. **Intercept:** Place a routing layer (proxy/facade) in front of the legacy system
2. **Build:** Implement target feature in the new system behind the router
3. **Route:** Redirect traffic for that feature to the new system (percentage-based rollout)
4. **Verify:** Monitor error rates, latency, correctness during coexistence
5. **Retire:** Remove legacy code for migrated feature once stable

**YAGNI gate:** Don't start a Strangler Fig migration unless you have concrete pain points with the legacy system (maintenance cost, inability to add features, security vulnerabilities). "It's old" is not sufficient justification.

**Related patterns:** Anti-Corruption Layer (translator between old and new), Branch by Abstraction (for internal components vs edge services).

---

### Branch by Abstraction

Refactor a deeply embedded component by introducing an abstraction layer, building a new implementation behind it, and swapping implementations via configuration or feature flags.

**Apply when:**
- Target component is deeply embedded with many internal dependents (not edge-facing)
- Need to refactor without stopping feature development on the same codebase
- Feature flags or configuration-based switching is feasible
- Component has a testable interface or one can be extracted

**Skip when:**
- Component is edge-facing with clear routing (use Strangler Fig instead)
- Refactoring scope is small enough for direct replacement (<1 day effort)
- No way to toggle between old and new implementations safely

**Rule of three:** Component has 3+ clients that would break during a direct swap.

**Mechanism:**
1. **Abstract:** Extract an interface from the target component
2. **Wrap:** Make existing implementation satisfy the interface; update all clients to use the interface
3. **Build:** Create new implementation behind the same interface
4. **Toggle:** Use feature flag to switch between old and new; test both paths
5. **Remove:** Delete old implementation once new is validated in production

**YAGNI gate:** Don't introduce the abstraction layer unless you have a concrete replacement planned. An abstraction with one implementation and no planned second is premature.

**Related patterns:** Strangler Fig (for edge/API layer vs Branch by Abstraction for deep components), Anti-Corruption Layer (isolate incompatibilities between old and new).

---

### Repository Pattern (Architectural Level)

Encapsulate data access logic behind a collection-like interface. Business logic works with the Repository interface; actual data store implementation is hidden.

**Apply when:**
- Business logic directly queries the database (SQL/ORM calls in service layer)
- Need to swap data stores or test without database
- Multiple services access the same data store differently

**Skip when:**
- Simple CRUD with thin service layer (ORM is the repository)
- Framework provides adequate data access abstraction already

**Rule of three:** 3+ places where data access logic is duplicated or business logic is mixed with queries.

**Structure:**
```
domain/
  order.ts                    # Domain entity (no DB knowledge)
ports/
  order-repository.ts         # Interface: findById, save, delete
adapters/
  postgres-order-repo.ts      # Implementation: actual SQL/ORM
  in-memory-order-repo.ts     # Test implementation
```

**Related patterns:** Unit of Work (coordinate multiple repositories), Anti-Corruption Layer (repository can translate between domain and external models).

---

### Unit of Work

Coordinate multiple repository operations within a single transaction. Tracks changes to entities and commits/rolls back all changes atomically.

**Apply when:**
- Business operation touches 2+ repositories that must succeed or fail together
- Need transaction management decoupled from repository implementations
- Complex save logic where partial commits would corrupt data

**Skip when:**
- Operations are single-entity (single repository call sufficient)
- Framework handles transactions automatically (e.g., Django's `@transaction.atomic`)

**Rule of three:** 3+ business operations that require multi-repository atomic commits.

**Related patterns:** Repository (Unit of Work coordinates repositories), Saga (for distributed transactions that can't use a single Unit of Work).

---

### Anti-Corruption Layer (ACL)

Translation layer between your system and an external/legacy system. Prevents external models, naming conventions, and data formats from leaking into your domain.

**Apply when:**
- Integrating with a legacy system whose model doesn't match your domain
- External API returns data in a format incompatible with your internal model
- Multiple systems use different terminology for the same concepts
- During Strangler Fig migration (translator between old and new)

**Skip when:**
- External system's model aligns well with yours
- Integration is trivial (single field mapping)
- System is being decommissioned soon

**Rule of three:** 3+ places where external model mismatches cause confusion or adapter code.

**Structure:**
```
acl/
  legacy-translator.ts        # Translates legacy → domain model
  legacy-client.ts            # Wraps legacy API calls
  model-mapping.ts            # Field/type mapping definitions
domain/
  order.ts                    # Pure domain model (no legacy concepts)
```

**Related patterns:** Strangler Fig (ACL during migration), Repository (ACL at data access boundary), BFF (ACL at frontend boundary).

---

### Sidecar / Ambassador

Deploy helper functionality as a co-located process alongside the main service. Sidecar handles cross-cutting concerns (logging, monitoring, auth). Ambassador handles outbound communication concerns (retries, circuit breaking, TLS).

**Apply when:**
- Cross-cutting concerns duplicated across 3+ services in different languages
- Need language-agnostic solutions for observability, security, or networking
- Service mesh adoption (Istio, Linkerd) planned or in progress

**Skip when:**
- All services use same language/framework (shared library simpler)
- Single service (no cross-cutting duplication)
- Operational complexity of sidecar management not justified

**Rule of three:** 3+ services need the same cross-cutting capability in different languages.

**Related patterns:** API Gateway (gateway handles edge concerns; sidecar handles per-service concerns), Circuit Breaker (ambassador can implement circuit breaking).

---

### Outbox Pattern

Ensure reliable event publishing alongside database writes. Write the event to an "outbox" table in the same database transaction as the state change, then a separate process publishes events from the outbox.

**Apply when:**
- Need to publish events AND update database atomically (dual-write problem)
- Message broker doesn't support transactions with your database
- Event delivery guarantees required (at-least-once)

**Skip when:**
- Database and message broker support distributed transactions (XA)
- Eventual consistency with retry is acceptable without guaranteed ordering
- No event publishing requirement

**Rule of three:** 3+ operations where failed event publishing causes data inconsistency.

**Structure:**
```
database/
  orders table          # Business data
  outbox table          # Event records: id, type, payload, published_at
workers/
  outbox-publisher.ts   # Polls outbox, publishes to message broker, marks published
```

**Related patterns:** Event Sourcing (outbox for event-based systems), Saga (reliable event publishing for choreography sagas).

## Smell-to-Pattern Mapping

The mapping is **not 1:1** — context determines the right pattern. Use the "When" column.

| Architectural Smell | Pattern Options | When to Use Which |
|-------------------|----------------|-------------------|
| **God Module** | Modular Decomposition, Bounded Context | Decomposition: module is a single concern grown too large. Bounded Context: module mixes multiple domain concepts. |
| **Ambiguous Boundaries** | Anti-Corruption Layer, Bounded Context | ACL: external integration boundary unclear. BC: internal module responsibilities overlap. |
| **Feature Scattering** | Modular Decomposition, CQRS | Decomposition: feature logic spread across unrelated modules. CQRS: scattering is read vs write concern split. |
| **Hub-like Dependency** | API Gateway, Mediator Service | Gateway: hub is an entry point. Mediator: hub coordinates internal modules. |
| **Layer Violation** | Repository, Anti-Corruption Layer | Repository: data access leaks into business layer. ACL: external concerns leak into domain. |
| **Leaky Abstraction** | Anti-Corruption Layer, BFF | ACL: implementation details cross a system boundary. BFF: API exposes internal structure to clients. |
| **Missing Abstraction** | Repository, Unit of Work | Repository: business logic queries DB directly. UoW: multi-repo operations lack coordination. |
| **Cyclic Dependencies** | Dependency Inversion, Event Sourcing | DI: break cycle with interface extraction. ES: decouple via events instead of direct calls. |
| **Distributed Monolith** | Strangler Fig, Branch by Abstraction | Strangler Fig: need gradual decoupling at edge. Branch by Abstraction: need internal component isolation. |
| **Chatty Services** | BFF, API Gateway, CQRS | BFF: clients make too many calls. Gateway: aggregate at edge. CQRS: separate read model reduces calls. |
| **Shared Database** | Database-per-Service, Outbox | DB-per-Service: services need data isolation. Outbox: need event-driven sync between service DBs. |
| **Nano-services** | Service Merge, Sidecar | Merge: services too small, overhead exceeds value. Sidecar: extract cross-cutting to sidecar, merge business logic. |

## Pattern Combinations

Common pairings that work well together. Don't combine unless both patterns address separate, real problems.

| Combination | When Both Needed | Caution |
|-------------|-----------------|---------|
| **CQRS + Event Sourcing** | Write model uses events; read model needs projections | High complexity — don't adopt simultaneously. Start with CQRS, add ES only if audit trail needed. |
| **Saga + Outbox** | Distributed transaction with reliable event delivery | Saga adds orchestration complexity; outbox adds infrastructure. Justify each independently. |
| **Strangler Fig + ACL** | Legacy migration with model incompatibilities | ACL prevents legacy concepts from leaking into new system during migration. Natural pairing. |
| **API Gateway + BFF** | Gateway routes to client-specific BFFs | Only if 3+ client types AND 3+ backend services. Otherwise, gateway alone suffices. |
| **Repository + Unit of Work** | Data access abstraction with multi-repo transactions | Natural pairing. UoW without Repository is unusual; Repository without UoW is common. |
| **Circuit Breaker + Sidecar** | Per-service resilience in polyglot architecture | Sidecar implements circuit breaker so services don't need language-specific libraries. |

## How to Apply

1. **Identify the smell** using `references/architecture/architectural-smells.md`
2. **Check the mapping table** above for pattern candidates
3. **Pass the YAGNI gate** — does the context justify the pattern?
4. **Consider combinations** — does a second pattern address a separate real problem?
5. **Check style compatibility** — verify pattern fits detected architectural style from `references/architecture/architectural-styles.md`
6. **Apply using mechanics** from `references/refactoring-methods.md` (Extract Module, Introduce Interface, etc.)
7. **Verify** — run tests after each transformation step
