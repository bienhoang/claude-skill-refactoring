# Scala Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `build.sbt` — PRIMARY (Scala version, library dependencies, compiler options)
2. `project/build.properties` — sbt version pinning
3. `project/plugins.sbt` — sbt plugins (sbt-assembly, sbt-native-packager, scalafmt)
4. `.scalafmt.conf` — Scalafmt formatting config (max column, indent, alignment rules)
5. `.scalafix.conf` — Scalafix refactoring/linting rules (OrganizeImports, NoAutoTupling)

### Convention Inference
- **Scala version:** Read `build.sbt` `scalaVersion` — `2.12.x`, `2.13.x`, or `3.x`. Gates enums, given/using, extension methods
- **Cross-building:** Check for `crossScalaVersions` — indicates multi-version support
- **sbt version:** Read `project/build.properties` — `sbt.version=1.x`
- **Naming:** Classes/traits `PascalCase`, methods/vals `camelCase`, constants `PascalCase` — Scala convention
- **Formatting:** If `.scalafmt.conf` exists, read `maxColumn`, `indent.main`, `align` settings
- **Compiler flags:** Check `scalacOptions` in `build.sbt` for `-Werror`, `-Xlint`, `-Ywarn-*`
- **FP vs OOP:** Scan for `cats`/`zio` imports (FP style) vs class hierarchies (OOP style)

### Framework Detection
Check `build.sbt` `libraryDependencies`:
- **Play Framework:** `com.typesafe.play %% play` — MVC, routes file, `Action.async`
- **Akka/Pekko:** `com.typesafe.akka %% akka-actor-typed` or `org.apache.pekko` — actor model, typed behaviors
- **http4s:** `org.http4s %% http4s-dsl` — functional HTTP, `HttpRoutes[F]`
- **ZIO:** `dev.zio %% zio` — effect system, `ZIO[R, E, A]`, ZLayer
- **Cats Effect:** `org.typelevel %% cats-effect` — `IO` monad, `Resource`, concurrent primitives
- **Spark:** `org.apache.spark %% spark-sql` — DataFrame API, distributed computation
- **Slick:** `com.typesafe.slick %% slick` — functional-relational mapping, `TableQuery`

## Convention Rules

Rules applied in precedence order (first match wins):

1. `.scalafmt.conf` formatting is NON-NEGOTIABLE — respect maxColumn, indent, alignment
2. `.scalafix.conf` rules override suggestions — respect enabled/disabled rules
3. IF Scala 3.x THEN suggest enums, given/using, extension methods, union types
4. IF Scala 2.13 THEN use LazyList (not Stream), new collection methods
5. IF Scala 2.12 THEN SAM types available, but no LazyList
6. IF ZIO/Cats Effect detected THEN functional style is PRIMARY — no `var`, no `null`, no exceptions
7. IF Play detected THEN follow Play conventions — controllers, forms, JSON, DI with `@Inject`
8. IF Spark detected THEN follow Spark patterns — DataFrame operations, UDF registration
9. IF `-Xlint` or `-Werror` in scalacOptions THEN align with strict compiler warnings
10. Precedence: scalafmt/scalafix config > Scala version > framework conventions > Scala style guide

## Common Smells & Fixes

### 1. Mutable var Overuse
**Smell:** `var total = 0; for (item <- items) total += item.price` — imperative accumulation
**Fix:** Use functional collection operations — `map`, `fold`, `reduce`, `sum`
**Example:** `var total = 0; for ...` → `val total = items.map(_.price).sum`

### 2. null Usage Instead of Option
**Smell:** `if (user == null) null else user` — NullPointerException risk, no type safety
**Fix:** Use `Option[T]` — `Some(value)` or `None`, compose with `map`/`flatMap`
**Example:** `def find(id: Long): User` → `def find(id: Long): Option[User]`

### 3. Any/AnyRef Abuse
**Smell:** `def process(data: Any): Any` — type erasure, runtime `asInstanceOf` casts
**Fix:** Use sealed trait ADTs or generics with type bounds
**Example:** `data.asInstanceOf[String]` → sealed trait with pattern matching

### 4. Blocking in Future
**Smell:** `Await.result(future, 10.seconds)` inside another Future — deadlock risk
**Fix:** Use `flatMap`/`map` composition or for-comprehensions
**Example:** `Await.result(fetchData(), ...)` → `fetchData().map(processData)`

### 5. Unchecked Pattern Match
**Smell:** Non-exhaustive `match` on non-sealed type — runtime `MatchError`
**Fix:** Use `sealed trait` for ADTs; compiler enforces exhaustive matching
**Example:** Open trait with partial match → `sealed trait` with all cases covered

### 6. Excessive Implicits
**Smell:** 5+ implicit parameters scattered across methods — hard to trace, debug
**Fix:** Group related implicits; in Scala 3 use `given`/`using` with explicit imports
**Example:** 5 implicit vals → `using ExecutionContext, Timeout` or explicit parameter passing

### 7. Type Erasure Ignored
**Smell:** `case _: List[Int]` in match — always matches any List due to erasure
**Fix:** Use `TypeTag` (Scala 2) or inline/transparent (Scala 3) for reified types
**Example:** `case _: List[Int]` → use `TypeTag` or restructure to avoid generic matching

### 8. Nested flatMap Chains
**Smell:** `a.flatMap(x => b.flatMap(y => c.map(z => ...)))` — deeply nested, hard to read
**Fix:** Use for-comprehensions — syntactic sugar for flatMap/map chains
**Example:** Nested flatMaps → `for { x <- a; y <- b; z <- c } yield (x, y, z)`

### 9. Side Effects in Pure Functions
**Smell:** `println()` or DB calls inside functions that should be referentially transparent
**Fix:** Separate pure logic from side effects; use IO/Task for effect tracking
**Example:** `def calc(x: Int) = { println(x); x * 2 }` → pure `calc` + separate logging

### 10. God Object
**Smell:** Single object/class with 20+ methods mixing CRUD, auth, email, validation
**Fix:** Split by responsibility into focused traits/classes with composition
**Example:** `UserService` with everything → `UserRepository`, `PasswordService`, `TokenService`

### 11. Stringly-Typed Errors
**Smell:** `Either[String, T]` — no structured error handling, can't match on error types
**Fix:** Use sealed trait ADTs for error types; `thiserror`-style enums
**Example:** `Left("not found")` → `sealed trait AppError; case object NotFound extends AppError`

### 12. return Keyword Usage
**Smell:** `return value` — non-local return semantics, breaks lambdas, un-idiomatic
**Fix:** Use expression-based style; last expression in block is return value
**Example:** `for (...) { if (...) return x }` → `items.find(_ == target)`

### 13. Procedural Style in Functional Codebase
**Smell:** `ListBuffer` with `.add()` in loops — imperative in functional codebase
**Fix:** Use functional transformations — `filter`, `map`, `flatMap`, `collect`
**Example:** `val buf = ListBuffer(); for (...) buf += ...` → `items.filter(_.active).map(_.name)`

### 14. Missing sealed for ADTs
**Smell:** Open `trait` used as algebraic data type — no exhaustive match checking
**Fix:** Add `sealed` modifier; in Scala 3 use `enum` for simple ADTs
**Example:** `trait Status` → `sealed trait Status` (or `enum Status` in Scala 3)

### 15. Throwing Exceptions
**Smell:** `throw new Exception("...")` — breaks referential transparency, unchecked
**Fix:** Return `Either[E, A]`, `Try[A]`, or use effect types (ZIO/IO)
**Example:** `throw new Exception("parse error")` → `Either[ParseError, Result]`

## Idiomatic Refactorings

Version-gated — only suggest if project's Scala version supports it:

### Scala 3.x
- Use `enum` for ADTs: `enum Color { case Red, Green, Blue }` (replaces sealed trait boilerplate)
- Use `given`/`using` instead of `implicit` for type class instances and context parameters
- Use `extension` methods instead of implicit classes: `extension (s: String) def isEmail: Boolean = ...`
- Use union types: `type StringOrInt = String | Int` for lightweight sum types
- Use indentation-based syntax (optional) — `if`/`then`/`else`, `match`/`case` without braces

### Scala 2.13+
- Use `LazyList` instead of deprecated `Stream`
- Use `.pipe` and `.tap` for method chaining: `value.pipe(transform).tap(println)`
- Use new collection operations: `groupMapReduce`, `partitionMap`

### Scala 2.12+
- Use SAM (Single Abstract Method) types: `val r: Runnable = () => println("hello")`
- Use Java 8 interop: `scala.jdk.CollectionConverters` (not deprecated JavaConverters)

### General (all versions)
- Replace nested case classes → sealed trait ADTs with exhaustive matching
- Replace `flatMap` chains → for-comprehensions for readability
- Replace `isInstanceOf`/`asInstanceOf` → pattern matching
- Replace mutable accumulators → `foldLeft`, `reduce`, `collect`
- Replace `null` → `Option` everywhere
- Use tagless final (`F[_]: Monad`) for effect-polymorphic code
- Use partial functions with `collect`: `list.collect { case Some(x) => x }`

## Framework-Specific Patterns

### Play Framework
- **Async actions:** Use `Action.async` with Future composition, not blocking calls
- **Dependency injection:** `@Inject()` constructor injection, not global objects
- **JSON handling:** Use `Json.format[T]` macro for case class serialization
- **Configuration:** Read from `application.conf` via `Configuration` injection, not hardcoded

### Akka/Pekko
- **Typed actors:** Prefer `Behavior[T]` (typed) over classic `Actor` (untyped)
- **Message protocol:** Define sealed trait for Commands; use `ActorRef[Reply]` for responses
- **Ask pattern:** Use `actor.ask(ref => Command(ref))` with timeout for request-response
- **Supervision:** Define restart/stop strategies per actor; use `Behaviors.supervise`

### ZIO
- **Effect types:** `ZIO[R, E, A]` — environment R, error E, success A
- **ZLayer:** Compose dependencies as layers; `ZLayer.make` for auto-wiring
- **Error handling:** Use `mapError`, `catchAll`, `orElse` for typed error recovery
- **Resource management:** `ZIO.acquireRelease` for safe resource lifecycle

### Cats Effect
- **IO monad:** `IO[A]` for side-effecting computations; compose with `flatMap`/for-comp
- **Resource:** `Resource.make(acquire)(release)` for bracket-style resource management
- **Concurrent:** `IO.parMapN` for parallel execution; `Ref` for safe shared state
- **Fiber:** `IO.start` for lightweight concurrency; `fiber.join`/`fiber.cancel`

## Testing

### Frameworks & Tools
- **ScalaTest:** `AnyFlatSpec with Matchers` — `"feature" should "behave" in { ... }` — run with `sbt test`
- **MUnit:** `class MySuite extends FunSuite` — lightweight, good IDE integration
- **Specs2:** `class MySpec extends Specification` — BDD style, acceptance testing
- **ScalaCheck:** Property-based testing — `forAll { (s: String) => s.reverse.reverse == s }`
- **Mockito-Scala:** `when(mock.method()).thenReturn(value)` — mock generation for traits
- **TestContainers:** Docker-based integration tests — real databases, message queues

### Convention-Aware Testing Suggestions
- IF ScalaTest → suggest `AnyFlatSpec` for behavior-driven or `AnyFunSuite` for xUnit style
- IF ZIO → suggest `ZIOSpecDefault` with ZIO Test assertions (`assertTrue`, `assertCompletes`)
- IF Cats Effect → suggest `CatsEffectSuite` from MUnit-Cats-Effect
- IF Play → suggest `PlaySpec` with `WithApplication` for controller testing
- IF Akka → suggest `ActorTestKit` for typed actor testing with `BehaviorTestKit`
- IF no test framework → suggest MUnit (lightweight) or ScalaTest (comprehensive)
- ScalaCheck property tests recommended for parsers, serializers, mathematical functions

## Output Format

### Aligned Refactorings
Suggestions that respect the project's detected conventions:
```
**[Smell Name]** in `{file}:{line}`
Current: {code snippet}
Suggested: {refactored code}
Rationale: {why this is better, referencing detected conventions}
```

### Convention Improvements
Optional suggestions for better practices (informational tone):
```
Your project uses {current convention}. Consider {suggested convention} because {reasoning}.
Example: {before → after}
```
