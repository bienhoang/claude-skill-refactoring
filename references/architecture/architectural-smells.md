# Architectural Smells Reference

Detect architecture-level problems using measurable heuristics. Load this reference when `/refactor:architecture` runs or during Analyze phase for directory/module targets.

**Separation from other references:** This file answers "WHAT is wrong at the architecture level." `references/code-smells.md` answers "WHAT is wrong at the code level." `references/architecture/architectural-patterns.md` answers "WHAT pattern to apply to fix it."

**Distribution smell note:** Distribution smells (category 3) apply only to distributed styles (Microservices, Event-Driven). When detected style is single-deployment (Layered, Hexagonal, Clean, Modular Monolith, Pipe-and-Filter), report: "Distribution smells: N/A (single-deployment style)."

## Quick Reference

```yaml
smells:
  # Structure smells
  god_module: { category: structure, severity: critical, signal: ">30% of codebase imports" }
  ambiguous_boundaries: { category: structure, severity: major, signal: "module has 3+ unrelated responsibilities" }
  feature_scattering: { category: structure, severity: major, signal: "1 feature spans 5+ modules" }
  hub_dependency: { category: structure, severity: critical, signal: "1 module >40% of all inter-module edges" }

  # Boundary smells
  layer_violation: { category: boundary, severity: critical, signal: "lower layer imports upper layer" }
  leaky_abstraction: { category: boundary, severity: major, signal: "implementation detail in public API" }
  missing_abstraction: { category: boundary, severity: major, signal: "business logic directly calls DB/HTTP" }
  cyclic_dependencies: { category: boundary, severity: critical, signal: "module A → B → ... → A cycle" }

  # Distribution smells (skip for single-deployment styles)
  distributed_monolith: { category: distribution, severity: critical, signal: "services deploy in lockstep" }
  chatty_services: { category: distribution, severity: major, signal: ">10 cross-service calls per operation" }
  shared_database: { category: distribution, severity: critical, signal: "2+ services write to same DB tables" }
  nano_services: { category: distribution, severity: minor, signal: "service <100 LOC with own deployment" }

severity_levels:
  critical: "Actively blocks development or causes production incidents"
  major: "Increases maintenance cost and slows feature delivery"
  minor: "Suboptimal but manageable — address when convenient"
```

## Structure Smells

### God Module

A single module or package that attracts disproportionate imports, changes, and responsibilities. The architectural equivalent of God Class.

**Signs (measurable):**
- Module receives >30% of all codebase import statements
- Module has >10 incoming AND >10 outgoing dependencies (CBO > 10)
- Module LOC exceeds 3x the average module size
- Module touched in >50% of recent commits (git log analysis)
- LCOM > 5 (methods within module share few common data dependencies)

**Severity:** Critical — high change frequency means high regression risk.

**Detection:**
1. Build import graph; calculate incoming edge percentage per module
2. Flag modules with >30% of total incoming edges
3. Cross-check with git history: high change frequency confirms smell

**Fix:** Modular Decomposition or Bounded Context (see `references/architecture/architectural-patterns.md`). Extract by domain responsibility. Each extracted module should have <10 incoming dependencies.

**YAGNI check:** If the module is stable (changes <1/month) and well-tested, the smell is tolerable. Prioritize decomposition only when change frequency causes pain.

---

### Ambiguous Module Boundaries

Module serves 3+ unrelated domain responsibilities. Different from God Module — this is about mixed concerns, not size.

**Signs (measurable):**
- Module exports functions/classes belonging to 3+ distinct domain concepts
- Module's public API mixes concerns (e.g., `userAuth()`, `paymentProcess()`, `emailSend()` in same module)
- Adding a feature in domain X requires modifying a module "owned" by domain Y
- Incoming dependencies come from 3+ unrelated feature areas

**Severity:** Major — causes ownership confusion and merge conflicts.

**Detection:**
1. List all public exports of each module
2. Categorize exports by domain concept
3. Flag modules where exports span 3+ domain categories

**Fix:** Bounded Context decomposition. Split module along domain boundaries. Each resulting module should serve a single domain concept.

**YAGNI check:** Acceptable in early-stage projects (<3 months) where boundaries are still emerging. Fix when team size exceeds 2 or merge conflicts become frequent.

---

### Feature Scattering

A single business feature requires changes across 5+ modules. Opposite of God Module — logic is too dispersed instead of too concentrated.

**Signs (measurable):**
- Implementing a feature requires modifying 5+ modules
- Git commits for a single feature touch 5+ directories
- Feature toggle requires changes in 5+ files across different modules
- No single module "owns" the feature end-to-end

**Severity:** Major — high cost of change, hard to reason about feature completeness.

**Detection:**
1. Analyze recent feature branches; count distinct modules touched per feature
2. Flag features that require 5+ module modifications
3. Check if any module contains >60% of the feature logic (if yes, remaining scatter may be acceptable)

**Fix:** Modular Decomposition — consolidate scattered feature logic into a cohesive module. If scatter is read vs write, consider CQRS (see `references/architecture/architectural-patterns.md`).

**YAGNI check:** Some scatter is natural in cross-cutting concerns (auth, logging). Only flag when scatter is in business logic, not infrastructure.

---

### Hub-like Dependency

One module sits at the center of the dependency graph, acting as a bottleneck. All inter-module communication passes through it.

**Signs (measurable):**
- Module has >40% of all inter-module dependency edges (incoming + outgoing)
- Removing the module would disconnect the dependency graph
- Module has both high afferent (incoming) AND high efferent (outgoing) coupling
- Instability metric near 0.5 (equally depended-on and depending)

**Severity:** Critical — single point of failure; changes here have maximum blast radius.

**Detection:**
1. Build module dependency graph
2. Calculate edge percentage per module: (incoming + outgoing) / total_edges
3. Flag modules with >40% of total edges

**Fix:** API Gateway (if hub is an entry point) or Mediator Service decomposition (if hub coordinates internal modules). See `references/architecture/architectural-patterns.md`.

**YAGNI check:** A shared utility module (string helpers, logging) being a hub is expected and not a smell. Only flag when the hub contains business logic.

## Boundary Smells

### Layer Violation

A module imports from a layer it should not access. Lower layers import upper layers, or peer modules import each other's internals.

**Signs (measurable):**
- Repository/persistence module imports from controller/presentation module
- Service layer directly accesses HTTP request objects
- Module imports from another module's `internal/` or `private/` directory
- Import direction contradicts the style's dependency flow rules (see `references/architecture/architectural-styles.md`)

**Severity:** Critical — breaks architectural integrity; violations spread fast once introduced.

**Detection:**
1. Determine architectural style and expected dependency flow
2. Build import graph with module layer labels
3. Flag any import that goes "upward" or crosses layer boundaries
4. Count violations; even 1 is a smell (zero-tolerance for healthy architecture)

**Fix:** Repository Pattern or Anti-Corruption Layer (see `references/architecture/architectural-patterns.md`). Move the dependency behind an interface at the correct layer. If `strict_boundaries` is `true` in config, treat all violations as critical severity.

**YAGNI check:** Never acceptable — layer violations should always be fixed. There is no valid reason for lower layers to import upper layers.

---

### Leaky Abstraction

An abstraction exposes implementation details through its public interface, forcing consumers to know about internal mechanics.

**Signs (measurable):**
- Public API parameters include implementation-specific types (e.g., SQL dialect objects, HTTP headers in domain service)
- Error types from lower layers propagate unmodified to upper layers (e.g., `PgError` in business logic)
- Configuration for implementation details required by consumers (e.g., connection pool size in service constructor)
- Module's public types import from infrastructure/framework packages

**Severity:** Major — couples consumers to specific implementation; blocks swapping.

**Detection:**
1. Examine each module's public API (exported types, function signatures)
2. Check if parameter/return types reference infrastructure packages
3. Flag APIs where consumers need implementation knowledge to call correctly

**Fix:** Anti-Corruption Layer or BFF (see `references/architecture/architectural-patterns.md`). Wrap implementation details behind domain-specific types.

**YAGNI check:** Acceptable at infrastructure boundaries where the implementation IS the abstraction (e.g., a Redis cache module exposing Redis-specific options). Fix only when the leaky abstraction forces changes in 3+ consumer modules.

---

### Missing Abstraction Layer

Business logic directly interacts with external systems (database, HTTP, file system) without an intermediary abstraction.

**Signs (measurable):**
- SQL queries or ORM calls appear in service/business logic files
- HTTP client calls (fetch, axios) in domain/core modules
- File system operations (fs.read, os.path) in business logic
- Business logic files import database drivers or HTTP client packages

**Severity:** Major — untestable without real infrastructure; tight coupling to specific technology.

**Detection:**
1. Scan business logic / domain / service directories for infrastructure imports
2. Flag: database driver imports, HTTP client imports, file system imports, message broker client imports
3. Count occurrences; >0 in domain/core is a smell

**Fix:** Repository Pattern or Unit of Work (see `references/architecture/architectural-patterns.md`). Extract infrastructure calls behind interfaces.

**YAGNI check:** Acceptable in scripts, CLI tools, and small utilities where testability overhead isn't justified. Fix in any module with >3 functions or that's expected to live >6 months.

---

### Cyclic Module Dependencies

Two or more modules form a dependency cycle: A → B → C → A. Breaks independent deployability, testability, and comprehension.

**Signs (measurable):**
- Static analysis tools report circular dependency warnings
- Module A imports from B AND B imports from A (direct cycle)
- Module A → B → C → A (transitive cycle)
- Build order is ambiguous or requires special configuration
- Cannot write unit test for module A without loading module B (and vice versa)

**Severity:** Critical — makes independent testing, deployment, and reasoning impossible.

**Detection:**
1. Build complete module dependency graph
2. Run cycle detection algorithm (Tarjan's or DFS-based)
3. Flag any cycle; healthy architecture has exactly 0 cycles (DAG property)
4. Measure cycle length (2-node vs 5-node): longer cycles are harder to break

**Fix:** Dependency Inversion (extract interface to break cycle) or Event Sourcing (decouple via events). See `references/architecture/architectural-patterns.md` and `references/dependency-analysis.md` for detailed cycle-breaking techniques.

**YAGNI check:** Never acceptable — cycles should always be broken. Every cycle creates compounding technical debt.

## Distribution Smells

> **Conditional scanning:** Only evaluate these smells when detected architectural style is distributed (Microservices, Event-Driven, Serverless with multiple functions). For single-deployment styles, skip this category entirely.

### Distributed Monolith

Services that are nominally separate but must be deployed together. The worst of both worlds: distributed systems complexity without independence benefits.

**Signs (measurable):**
- Services share deployment pipeline (deploy all or nothing)
- Cross-service code imports exist (direct `import` between service directories)
- Shared database schema: 2+ services read/write the same tables
- Changing one service requires redeploying 2+ other services
- Shared libraries contain business logic (not just utilities)

**Severity:** Critical — all the pain of microservices with none of the benefits.

**Detection:**
1. Check for cross-service imports in import graph
2. Check deployment configuration: are services deployed independently?
3. Check database: do multiple services share table ownership?
4. Analyze recent deploys: do services consistently deploy in batches?

**Fix:** Strangler Fig or Branch by Abstraction (see `references/architecture/architectural-patterns.md`). Incrementally decouple shared dependencies.

**YAGNI check:** If services are intentionally deployed together (modular monolith misnamed as microservices), the fix is re-labeling, not restructuring. Fix only when independent deployment is actually desired.

---

### Chatty Services

Excessive inter-service communication for a single user operation. High network overhead, latency, and failure surface.

**Signs (measurable):**
- Single user operation triggers >10 cross-service API calls
- Network latency dominates total response time (>50% of response is network)
- Service-to-service call graphs show fan-out >5 for common operations
- Retry storms observed during partial failures

**Severity:** Major — performance degradation and cascading failure risk.

**Detection:**
1. Trace a typical user operation through the system (distributed tracing)
2. Count distinct cross-service calls per operation
3. Flag operations with >10 inter-service calls
4. Measure network latency share of total response time

**Fix:** BFF (aggregate at edge), API Gateway (reduce client calls), or CQRS (pre-build read models to eliminate runtime joins). See `references/architecture/architectural-patterns.md`.

**YAGNI check:** Some chattiness is acceptable for complex operations. Fix only when latency or failure rate exceeds SLA thresholds.

---

### Shared Database Anti-pattern

Multiple services read/write the same database tables, coupling them at the data layer despite separate deployment.

**Signs (measurable):**
- 2+ services have connection strings to the same database
- 2+ services run migrations on the same schema
- Table ownership is ambiguous (no single service "owns" the schema)
- Schema change in one service breaks another service
- Database-level locks cause cross-service contention

**Severity:** Critical — eliminates data ownership, prevents independent scaling, creates hidden coupling.

**Detection:**
1. Scan service configuration files for database connection strings
2. Check if multiple services share the same database/schema
3. Analyze migration files: do multiple services modify the same tables?
4. Check for cross-service database triggers or stored procedures

**Fix:** Database-per-Service with Outbox Pattern for event-driven synchronization. See `references/architecture/architectural-patterns.md`.

**YAGNI check:** Acceptable during early microservices migration as a transitional state. Set a deadline (3-6 months) for completing the split. Permanent sharing is always a smell.

---

### Nano-services

Services that are too small to justify their deployment overhead. Each service does one tiny thing but carries full infrastructure cost (container, CI/CD, monitoring, logging).

**Signs (measurable):**
- Service has <100 LOC of business logic
- Service has 1-2 endpoints/functions
- Deployment infrastructure (Dockerfile, CI/CD, monitoring) exceeds business logic in complexity
- Service exists because "everything should be a service" — no independent scaling or deployment justification
- Team spends more time on service infrastructure than feature development

**Severity:** Minor — operational overhead, not architectural corruption.

**Detection:**
1. Measure business logic LOC per service (exclude boilerplate, config, tests)
2. Flag services with <100 LOC of business logic
3. Check if the service could be a function/module in an adjacent service

**Fix:** Service Merge — combine with related service. Or extract cross-cutting to Sidecar, merge business logic. See `references/architecture/architectural-patterns.md`.

**YAGNI check:** Acceptable if the service genuinely needs independent scaling (e.g., image resizer). Fix only when operational overhead outweighs the independence benefit.

## Detection Checklist

Ordered scanning steps for systematic architectural smell detection:

```
Step 1: Build Module Dependency Graph
  - Parse imports/requires across all modules
  - Calculate per-module: incoming edges, outgoing edges, total edges
  - Result: adjacency list + edge counts

Step 2: Check Structural Smells
  □ God Module: any module with >30% of incoming edges?
  □ Hub Dependency: any module with >40% of total edges?
  □ Ambiguous Boundaries: any module exporting 3+ domain concepts?
  □ Feature Scattering: recent features touching 5+ modules?

Step 3: Check Boundary Smells
  □ Layer Violations: any imports against style's dependency flow?
  □ Cyclic Dependencies: any cycles in dependency graph?
  □ Missing Abstraction: infrastructure imports in domain/service modules?
  □ Leaky Abstraction: infrastructure types in public APIs?

Step 4: Check Distribution Smells (distributed styles only)
  □ Distributed Monolith: cross-service code imports or lockstep deploys?
  □ Shared Database: multiple services sharing DB tables?
  □ Chatty Services: >10 cross-service calls per operation?
  □ Nano-services: services with <100 LOC business logic?

Step 5: Score and Prioritize
  - Assign severity per finding (critical/major/minor)
  - Score using ROI formula from references/prioritization.md
  - Group into tiers: Quick Win, Strategic, Planned
```

## Metrics Thresholds

| Metric | Healthy | Warning | Critical | Detection Method |
|--------|---------|---------|----------|-----------------|
| **CBO (module-level)** | < 5 | 5 – 10 | > 10 | Dependency graph edge count |
| **LCOM (module-level)** | < 3 | 3 – 5 | > 5 | Method-to-data dependency analysis |
| **Instability (E/(A+E))** | < 0.5 | 0.5 – 0.67 | > 0.67 | Afferent/efferent coupling ratio |
| **Cyclic Dependencies** | 0 | N/A | > 0 | Graph cycle detection (Tarjan's) |
| **Module Size (LOC)** | < 250 | 250 – 500 | > 500 | Line counting (excluding tests) |
| **Change Frequency** | < 1/week | 1 – 2/week | > 2/week | Git log analysis per module |
| **Import Edge %** | < 15% | 15 – 30% | > 30% | Incoming edges / total edges |

## How to Apply

1. **Run the detection checklist** above in order (Steps 1-5)
2. **Check detected style** from `references/architecture/architectural-styles.md` — skip Distribution smells for single-deployment styles
3. **Map smells to patterns** using `references/architecture/architectural-patterns.md` smell-to-pattern table
4. **Pass YAGNI gate** for each smell — some smells are tolerable in context
5. **Prioritize** using `references/prioritization.md` ROI formula
6. **Report** findings with severity, location, and recommended pattern
