# Architectural Styles Reference

Detect the architectural style of a codebase using directory patterns, import flow analysis, and infrastructure file hints. Load this reference when `/refactor:architecture` runs or during Analyze phase for directory/module targets.

**Separation from other references:** This file answers "WHAT style is the codebase using and how to detect it." `references/architecture/architectural-smells.md` answers "WHAT is wrong at the architecture level." `references/architecture/architectural-patterns.md` answers "WHAT pattern to apply to fix it."

## Quick Reference

```yaml
styles:
  layered: { deploy: monolith, dir_signals: [controllers, services, repositories, models], dep_flow: downward }
  hexagonal: { deploy: monolith, dir_signals: [ports, adapters, domain], dep_flow: inward }
  clean: { deploy: monolith, dir_signals: [entities, usecases, interface_adapters], dep_flow: inward }
  event_driven: { deploy: distributed, dir_signals: [events, producers, consumers, handlers], dep_flow: event_bus }
  microservices: { deploy: distributed, dir_signals: [services/*/src], dep_flow: api_only }
  modular_monolith: { deploy: monolith, dir_signals: [modules/*/api, modules/*/domain], dep_flow: public_api }
  pipe_and_filter: { deploy: varies, dir_signals: [filters, pipes, pipeline, transforms], dep_flow: sequential }
  serverless: { deploy: faas, dir_signals: [functions, handlers], dep_flow: event_trigger }

confidence:
  with_infra: "(dir_score*0.3 + import_score*0.4 + infra_score*0.3) / 100"
  without_infra: "(dir_score*0.4 + import_score*0.6) / 100"
  high: ">= 0.7"
  medium: "0.4 - 0.69"
  low: "< 0.4"
```

## Style Catalog

### Layered (N-Tier)

Horizontal layers where each layer only calls the layer directly below. Simple, familiar, good for CRUD apps and small teams.

**Directory Heuristics:**
```
src/
├── controllers/ | presentation/ | routes/ | api/ | handlers/
├── services/ | business/ | logic/ | usecases/
├── repositories/ | persistence/ | dal/ | dao/
└── models/ | entities/ | database/ | schema/
```

**Dependency Flow:** presentation → business → persistence → database (downward only). No backward imports.

**Strengths:** Easy to understand, low initial friction, quick scaffolding.
**Weaknesses:** Hard to scale layers independently, changes ripple across layers, business logic often leaks into controllers.

**When to use:** MVP, small teams (<3), simple CRUD, short-lived projects.
**When NOT to use:** Complex domain logic, need for independent scaling, high test isolation requirements.

**Infra Hints:** Single Dockerfile, shared DB connection string, single deployment pipeline.

---

### Hexagonal (Ports & Adapters)

Core domain logic isolated from external systems via port interfaces. Adapters implement ports for specific technologies (HTTP, DB, messaging).

**Directory Heuristics:**
```
src/
├── domain/ | core/
├── ports/ | interfaces/
│   ├── in/ | inbound/ | driving/
│   └── out/ | outbound/ | driven/
├── adapters/ | infrastructure/
│   ├── in/ | web/ | http/ | grpc/
│   └── out/ | persistence/ | clients/
└── config/ | di/ | wiring/
```

**Dependency Flow:** domain → nothing (pure). ports → nothing (interfaces). adapters → domain + ports. **Never** domain → adapters.

**Strengths:** Excellent testability (mock adapters), swap infrastructure without touching domain, long-term stability.
**Weaknesses:** Steeper learning curve, more boilerplate for small projects, requires upfront design.

**When to use:** Long-lived projects (>6 months), complex domain, frequent infrastructure changes, high test coverage needs.
**When NOT to use:** Simple CRUD, prototypes, team unfamiliar with pattern.

**Infra Hints:** Explicit DI config, mock adapters in test directories, test/production adapter separation.

---

### Clean Architecture

Concentric circles: Entities → Use Cases → Interface Adapters → Frameworks. Dependencies always point inward. More prescriptive than Hexagonal.

**Directory Heuristics:**
```
src/
├── entities/ | domain/
├── usecases/ | application/ | interactors/
├── interface_adapters/ | adapters/ | presentation/
└── frameworks/ | infrastructure/ | drivers/
```

**Dependency Flow:** entities → nothing. usecases → entities only. interface_adapters → usecases + entities. frameworks → any.

**Strengths:** Framework-agnostic core, highly testable, clear dependency rule.
**Weaknesses:** Can feel over-engineered for simple apps, similar to Hexagonal (distinguish by directory naming).

**When to use:** Any project benefiting from framework independence, teams wanting explicit dependency rules.
**When NOT to use:** Same as Hexagonal — overkill for simple CRUD.

**Infra Hints:** Test files mirroring source structure, no framework imports in core layers, DI throughout.

---

### Event-Driven Architecture (EDA)

Components communicate via events produced and consumed asynchronously. Two topologies: Broker (peer-to-peer) or Mediator (central router).

**Directory Heuristics:**
```
src/
├── events/ | messages/ | schemas/
├── producers/ | publishers/ | emitters/
├── consumers/ | subscribers/ | listeners/
├── brokers/ | messaging/ | infrastructure/
└── orchestrators/ | sagas/ (optional)
```

**Dependency Flow:** producers → events (emit). consumers → events (handle). producers ⇄ consumers (no direct coupling). brokers wire them together.

**Strengths:** Loose coupling, independent scaling, real-time responsiveness.
**Weaknesses:** Eventual consistency, hard to trace event flows, schema evolution complexity.

**When to use:** High-throughput systems, real-time requirements, decoupled workflows.
**When NOT to use:** Strong ACID consistency required, simple request-response apps.

**Infra Hints:** Message broker in docker-compose (kafka, rabbitmq, redis), event schema files (Avro, Protobuf, JSON Schema), async listeners.

---

### Microservices

Each service owns its domain, data, and deployment. Services communicate via APIs or messaging. Independent scaling and technology choices.

**Directory Heuristics:**
```
services/ | apps/ | packages/
├── service-a/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json | requirements.txt | go.mod
├── service-b/
├── shared/ | libs/ (optional)
└── docker-compose.yml | k8s/
```

**Dependency Flow:** Within service: any internal organization. Cross-service: HTTP, gRPC, or messaging only — **no direct code imports**.

**Strengths:** Independent deployment/scaling, fault isolation, tech diversity per service.
**Weaknesses:** Distributed systems complexity, network latency, data consistency challenges.

**When to use:** Large teams, need independent scaling, polyglot tech requirements, well-defined domain boundaries.
**When NOT to use:** Small teams (<5), simple domain, rapid prototyping.

**Infra Hints:** Multiple Dockerfiles (one per service), docker-compose with 3+ service definitions, K8s Deployment manifests per service, API Gateway config, separate package managers per service.

---

### Modular Monolith

Single deployment artifact with logically separated modules. Each module has clear boundaries and communicates via public APIs (not internals).

**Directory Heuristics:**
```
src/
├── modules/ | features/ | bounded-contexts/
│   ├── module-a/
│   │   ├── api.ts | public/ | exports/
│   │   ├── domain/ | internal/
│   │   └── services/
│   └── module-b/
├── shared/ | core/ | common/
└── infra/ | infrastructure/
```

**Dependency Flow:** module-x → module-y only via public API (api.ts / exports/). shared/ freely imported. **No** cross-module internal imports.

**Strengths:** Monolith simplicity + module isolation, clear boundaries, natural path to microservices.
**Weaknesses:** Shared database, single deployment/failure point, requires discipline to maintain boundaries.

**When to use:** Growing monolith needing structure, preparation for microservices, medium teams (3-8).
**When NOT to use:** Already distributed, very simple apps.

**Infra Hints:** Single Dockerfile, unified database (or logical schemas), monolithic test suite, explicit module exports.

---

### Pipe-and-Filter

Processing split into independent filters connected by pipes (data channels). Data flows sequentially or in parallel through the pipeline.

**Directory Heuristics:**
```
src/
├── filters/ | transforms/ | steps/ | processors/
├── pipes/ | streams/ | channels/
└── pipeline/ | orchestrator/ | main/
```

**Dependency Flow:** filters → minimal (no cross-filter imports). pipes are pure data containers. pipeline wires filters + pipes.

**Strengths:** Composable, reusable filters, easy to add/remove processing steps.
**Weaknesses:** Niche applicability, data format coupling between filters.

**When to use:** Data processing pipelines, ETL workflows, compiler/build tool chains, Unix-philosophy tools.
**When NOT to use:** General web applications, interactive systems.

**Infra Hints:** Stream processing frameworks (Flink, Spark, Kafka Streams), functional composition patterns.

---

### Serverless / FaaS

Functions as the unit of deployment. Event-triggered, stateless, pay-per-invocation. State lives in external stores.

**Directory Heuristics:**
```
src/
├── functions/ | lambdas/ | handlers/
│   ├── http-handler.ts
│   ├── event-handler.ts
│   └── scheduled-job.ts
├── shared/ | layers/ | utils/
└── infrastructure/ | iac/
    └── serverless.yml | sam.yaml | template.yaml
```

**Dependency Flow:** functions → shared only. No function → function imports. External state via clients (AWS SDK, HTTP).

**Strengths:** Zero server management, auto-scaling, pay-per-use, fast deployment.
**Weaknesses:** Cold starts, vendor lock-in, hard to test locally, stateless constraint.

**When to use:** Event-driven workloads, variable traffic, cost-sensitive projects, API backends.
**When NOT to use:** Long-running processes, low-latency requirements, complex stateful workflows.

**Infra Hints:** `serverless.yml` / `sam.yaml` / `serverless.json`, CloudFormation/Terraform with Lambda resources, handler function entry points, event source mappings.

## Style Detection Table

Score each style 0-100 based on directory pattern matches. Higher = stronger signal.

| Directory Pattern | Layered | Hexagonal | Clean | EDA | Microservices | Modular | Pipe-Filter | Serverless |
|-------------------|---------|-----------|-------|-----|---------------|---------|-------------|------------|
| `controllers/` + `services/` + `repositories/` | +30 | | | | | | | |
| `presentation/` + `business/` + `persistence/` | +30 | | | | | | | |
| `ports/` + `adapters/` | | +30 | | | | | | |
| `domain/` + `adapters/in/` + `adapters/out/` | | +25 | | | | | | |
| `entities/` + `usecases/` | | | +30 | | | | | |
| `events/` + `consumers/` or `subscribers/` | | | | +25 | | | | |
| `producers/` + `consumers/` | | | | +20 | | | | |
| `services/*/Dockerfile` (3+) | | | | | +30 | | | |
| `services/*/src/` or `apps/*/` | | | | | +20 | | | |
| `modules/*/api.*` or `modules/*/public/` | | | | | | +25 | | |
| `modules/*/domain/` | | | | | | +20 | | |
| `filters/` + `pipeline/` | | | | | | | +30 | |
| `transforms/` + `steps/` | | | | | | | +20 | |
| `functions/` + `serverless.yml` | | | | | | | | +35 |
| `handlers/` + `sam.yaml` | | | | | | | | +30 |
| `domain/` (standalone) | | +10 | +10 | | | +10 | | |

## Import Flow Analysis

After directory scoring, validate candidate styles by checking import directions:

| Style | Valid Import Direction | Violation Signal |
|-------|----------------------|------------------|
| Layered | Downward only (presentation → service → repo) | Any upward import |
| Hexagonal | Inward only (adapters → ports → domain) | domain imports adapters |
| Clean | Inward only (frameworks → adapters → usecases → entities) | entities imports frameworks |
| EDA | Producers → events ← consumers (no direct coupling) | Producer imports consumer |
| Microservices | No cross-service code imports | Any direct import between services/ dirs |
| Modular | Module → module only via public API | Internal imports across modules |
| Pipe-Filter | Pipeline → filters, no cross-filter imports | Filter imports another filter |
| Serverless | Function → shared only | Function imports another function |

**Scoring:** +30 for fully conforming import flow, -10 per violation found, minimum 0.

## Infrastructure File Scanning

Read-only scan for deployment style hints. **Never modify infrastructure files.**

| File Pattern | Signals Style | Score |
|-------------|---------------|-------|
| Single `Dockerfile` | Monolith (Layered, Hexagonal, Clean, Modular) | +15 |
| Multiple `services/*/Dockerfile` (3+) | Microservices | +25 |
| `docker-compose.yml` with 3+ app services | Microservices | +20 |
| `docker-compose.yml` with message broker | Event-Driven | +25 |
| `docker-compose.yml` with single app service | Monolith | +10 |
| `serverless.yml` / `sam.yaml` / `serverless.json` | Serverless | +35 |
| K8s manifests with multiple Deployments | Microservices | +20 |
| Terraform with Lambda/Function resources | Serverless | +25 |
| Event schema files (`.avro`, `.proto`) | Event-Driven | +15 |

**If no infra files found:** Skip infra scoring, use 2-signal formula: `(dir_score*0.4 + import_score*0.6) / 100`

## Confidence Scoring

**With infra files:** `confidence = (dir_score*0.3 + import_score*0.4 + infra_score*0.3) / 100`
**Without infra files:** `confidence = (dir_score*0.4 + import_score*0.6) / 100`

| Level | Range | Meaning |
|-------|-------|---------|
| **High** | >= 0.7 | Strong signals — directory structure, import flow, and infra all align |
| **Medium** | 0.4 – 0.69 | Partial signals — some indicators present, style likely but not certain |
| **Low** | < 0.4 | Weak signals — possible style but could be custom/hybrid |

**Rules:**
- Report only styles with confidence >= 0.4
- If multiple styles >= 0.4, report highest; flag as "mixed architecture"
- If no style >= 0.4, report as "Unstructured / Custom"
- If `.refactoring.yaml` has `architecture.style` set, skip auto-detection; confidence = "configured"

## Style Transition Matrix

Recommend transitions only when concrete pain points exist — not speculatively.

| From | To | When | Effort | Risk |
|------|----|------|--------|------|
| Layered | Hexagonal | Testing pain, tight coupling to frameworks | Medium | Medium |
| Layered | Modular Monolith | Modules need autonomy, single deploy acceptable | Medium | Low |
| Modular Monolith | Microservices | Need independent scaling/deployment, large teams | High | High |
| Monolith (any) | Event-Driven | Tight sync coupling, real-time requirements | Medium | Medium |
| Any | Clean Architecture | Foundational improvement for testability | Low-Medium | Low |
| Microservices | Event-Driven (hybrid) | Chatty synchronous inter-service calls | Medium | Medium |

## How to Apply

1. **Scan directory structure** against the Style Detection Table
2. **Analyze import flow** to confirm or reject candidate styles
3. **Scan infra files** for deployment hints (if present)
4. **Calculate confidence** using the weighted formula
5. **Report detected style** with confidence level
6. Cross-reference with `references/architecture/architectural-smells.md` for style-specific smell detection
