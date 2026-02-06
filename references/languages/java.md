# Java Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `pom.xml` — PRIMARY if Maven project (dependencies, plugins, source/target version)
2. `build.gradle.kts` / `build.gradle` — PRIMARY if Gradle project (dependencies, plugins, compatibility)
3. `checkstyle.xml` — Checkstyle rules (naming, formatting, complexity)
4. `pmd-ruleset.xml` — PMD static analysis configuration
5. `.mvn/maven.config` — Maven wrapper config
6. `gradle.properties` — Gradle version, JVM memory settings

### Convention Inference
- **Build system:** `pom.xml` = Maven; `build.gradle*` = Gradle. Check plugin sections for additional tooling
- **Java version:** Read `pom.xml` `<maven.compiler.source>` / `<maven.compiler.target>` or `build.gradle` `java { sourceCompatibility = JavaVersion.VERSION_17 }`
- **Code style:** Check for google-java-format plugin or Spotless plugin — if present, use as authoritative formatting source
- **Naming conventions:** PascalCase classes (standard), camelCase methods/fields, CONSTANT_CASE constants. Scan for deviations
- **Indentation:** Scan 5+ source files (usually 4 spaces in Java)
- **Package structure:** Check for `com.org.project` hierarchy — note domain-driven vs layer-based organization

### Framework Detection
Scan Maven/Gradle dependencies + check main class annotations:
- **Spring Boot:** `spring-boot-starter` dependency + `@SpringBootApplication` on main class + `application.yml`/`.properties`
- **Quarkus:** `quarkus-core` dependency + `@QuarkusMain` + `application.properties`
- **Micronaut:** `micronaut-core` dependency + `io.micronaut` plugin + compile-time DI
- **Jakarta EE:** `jakarta.enterprise` imports + `@WebServlet`, `@Component` annotations
- **Hibernate:** `org.hibernate` dependencies + `@Entity`, `@Table` annotations + HQL queries
- **MyBatis/jOOQ:** `@Select` annotations (MyBatis), jOOQ DSL usage

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF checkstyle.xml present THEN use its naming and formatting rules as authoritative
2. IF google-java-format or Spotless plugin configured THEN formatting is non-negotiable; use its settings
3. IF Java version >= 17 THEN suggest pattern matching for `instanceof`, sealed classes
4. IF Java version >= 16 THEN suggest `record` for immutable data classes
5. IF Java version < 16 THEN suggest Lombok `@Data` / `@Value` instead of records
6. IF Java version >= 14 THEN suggest text blocks for multi-line strings
7. IF Spring Boot project THEN apply Spring patterns (constructor injection, `@ConfigurationProperties`)
8. IF Quarkus project THEN apply CDI patterns, native image considerations
9. Java naming conventions (PascalCase classes, camelCase methods) are near-universal — flag deviations
10. Precedence: checkstyle/Spotless config > build tool settings > code inference

## Common Smells & Fixes

### 1. NullPointerException Risk
**Smell:** Unchecked null returns/params — runtime NPE
**Fix:** Use `Optional<T>` for return types; `@NonNull`/`@Nullable` annotations for params
**Example:** `String name = user.getName()` → `Optional.ofNullable(user.getName()).orElse("Unknown")`

### 2. Checked Exception Abuse
**Smell:** Checked exceptions for programming errors or unrecoverable conditions
**Fix:** Use `RuntimeException` subclasses for code bugs; checked exceptions only for recoverable IO/network errors
**Example:** `throws Exception` on every method → specific unchecked exceptions where appropriate

### 3. Getter/Setter Boilerplate
**Smell:** Verbose accessor patterns on data classes with 10+ fields
**Fix:** Use `record` (Java 16+) for immutable data; Lombok `@Data`/`@Value` for older versions
**Example:** 50-line POJO → `record User(String name, int age, String email) {}`

### 4. Mutable Fields in Shared Objects
**Smell:** Public collections modified externally — thread safety issues
**Fix:** Return `Collections.unmodifiableList()`, `List.copyOf()`, or use immutable collections
**Example:** `public List<Item> getItems() { return items; }` → `return List.copyOf(items);`

### 5. Static Utility Classes
**Smell:** "Utils" class accumulating unrelated methods
**Fix:** Move methods to domain objects they operate on; use composition over utility aggregation
**Example:** `StringUtils.formatName(user)` → `user.getFormattedName()`

### 6. Stringly-Typed Code
**Smell:** String constants for config keys, statuses, types
**Fix:** Use enums or value objects for type safety
**Example:** `if (status.equals("ACTIVE"))` → `if (status == Status.ACTIVE)`

### 7. Anonymous Inner Classes
**Smell:** Verbose anonymous class for single-method interfaces
**Fix:** Replace with lambda expression (Java 8+)
**Example:** `new Comparator<String>() { public int compare(...) {...} }` → `(a, b) -> a.compareTo(b)`

### 8. Explicit For-Loop Iteration
**Smell:** Index-based `for (int i = 0; ...)` loops for simple iteration
**Fix:** Use enhanced for-loop or Stream API
**Example:** `for (int i = 0; i < list.size(); i++) { process(list.get(i)); }` → `list.forEach(this::process);`

### 9. Manual Null Checks
**Smell:** Deep if-chains checking nulls at every level
**Fix:** Use `Optional` chains with `map()`, `flatMap()`, `orElse()`
**Example:** `if (user != null && user.getAddr() != null)` → `Optional.of(user).map(User::getAddr).map(Addr::getCity).orElse("")`

### 10. Type Casting
**Smell:** `if (obj instanceof String) { String s = (String) obj; }` — verbose and error-prone
**Fix:** Use pattern matching (Java 17+): `if (obj instanceof String s)`
**Example:** Cast + assignment in 2 lines → single pattern match expression

### 11. Mutable POJO
**Smell:** All fields public/mutable with setters — hard to reason about state
**Fix:** Use `record` (Java 16+) for immutability; for mutable state use builder pattern
**Example:** `class Config { public String name; public int port; }` → `record Config(String name, int port) {}`

### 12. Exception-then-Ignore
**Smell:** `catch (Exception e) { }` — silent error swallowing
**Fix:** Log with context, re-throw wrapped, or handle explicitly
**Example:** Empty catch → `catch (IOException e) { log.error("Failed to read {}", path, e); throw new AppException(e); }`

### 13. Pyramid of Doom
**Smell:** Multiple nested if statements creating deep indentation
**Fix:** Use guard clauses (early return), extract methods, or use Optional chains
**Example:** 4-level nested ifs → guard clauses with early returns

### 14. Hard-Coded Strings/Numbers
**Smell:** Magic numbers and string literals scattered in code
**Fix:** Extract to named constants or configuration
**Example:** `if (retries > 3)` → `if (retries > MAX_RETRIES)`

### 15. Tight Coupling
**Smell:** Direct `new` instantiation of dependencies inside business logic
**Fix:** Use constructor injection (Spring) or manual DI; depend on interfaces, not implementations
**Example:** `private final UserRepo repo = new UserRepoImpl();` → constructor injection with interface type

## Idiomatic Refactorings

Version-gated — only suggest if project's Java version supports it:

### Java 17+
- Replace `instanceof` cascade → pattern matching: `if (obj instanceof String s)`
- Use sealed classes for restricted type hierarchies: `sealed class Shape permits Circle, Rect`
- Replace complex switch → switch expressions with pattern matching

### Java 16
- Replace data class boilerplate → `record`: `record Point(int x, int y) {}`
- Records auto-generate `equals()`, `hashCode()`, `toString()`, accessors

### Java 14+
- Replace string concatenation for multi-line → text blocks: `""" ... """`
- Use `instanceof` pattern matching (preview in 14, stable in 16+)

### Java 9+
- Use `List.of()`, `Map.of()`, `Set.of()` for immutable collection creation
- Use module system (`module-info.java`) for encapsulation

### Java 8+
- Replace anonymous inner classes → lambda expressions
- Replace imperative iteration → Stream API (`stream().filter().map().collect()`)
- Replace null checks → `Optional<T>` with `map()`, `flatMap()`, `orElse()`
- Replace manual threading → `CompletableFuture` for async composition
- Use method references: `list.forEach(System.out::println)`

### General
- Replace builder boilerplate → Lombok `@Builder` or record + wither methods
- Replace manual `equals()`/`hashCode()` → `record` or Lombok `@EqualsAndHashCode`
- Replace if/else for assignment → ternary or switch expression

## Framework-Specific Patterns

### Spring Boot
- **Constructor injection:** Prefer over field injection (`@Autowired` on fields); single constructor auto-detected
- **@ConfigurationProperties:** Type-safe config binding instead of `@Value` annotations scattered in code
- **@Transactional scoping:** Place on service methods, not repositories; understand propagation levels
- **Profile-based config:** Use `application-{profile}.yml` for environment-specific settings
- **Exception handling:** Use `@ControllerAdvice` with `@ExceptionHandler` for centralized error responses

### Quarkus
- **CDI patterns:** Use `@ApplicationScoped` for singletons; `@RequestScoped` for per-request state
- **Config properties:** Use `@ConfigProperty` with `SmallRye Config` for type-safe config
- **Native image:** Avoid reflection where possible; use `@RegisterForReflection` when needed
- **REST endpoints:** Use `@Path` + `@GET`/`@POST` (JAX-RS style); Quarkus RESTEasy Reactive for async

### Hibernate / JPA
- **N+1 prevention:** Use `JOIN FETCH` in JPQL or `@EntityGraph` for eager loading specific paths
- **Entity lifecycle:** Understand managed vs detached states; avoid modifying detached entities
- **Lazy loading:** Default for collections; use `FetchType.LAZY` explicitly; load in service layer with transaction
- **Batch operations:** Use `@BatchSize` or `StatelessSession` for bulk inserts/updates

## Testing

### Frameworks & Tools
- **JUnit 5:** `@Test`, `@ParameterizedTest`, `@Nested` for test organization — run with `mvn test` / `gradle test`
- **Mockito:** `@Mock`, `@InjectMocks`, `when().thenReturn()` for unit test isolation
- **JaCoCo:** Code coverage — `mvn jacoco:report` / `gradle jacocoTestReport`
- **Testcontainers:** Docker-based integration tests for databases, message queues
- **WireMock:** HTTP service mocking for integration tests
- **AssertJ:** Fluent assertion library — `assertThat(result).isEqualTo(expected)`

### Convention-Aware Testing Suggestions
- IF JUnit 5 detected → suggest `@ParameterizedTest` for data-driven tests
- IF JUnit 4 only → suggest migration path to JUnit 5 (mostly annotation changes)
- IF Spring Boot → suggest `@SpringBootTest` for integration, `@WebMvcTest` for controller unit tests
- IF Quarkus → suggest `@QuarkusTest` with REST Assured for endpoint testing
- IF no test framework detected → suggest JUnit 5 as default
- IF Hibernate present → suggest Testcontainers for database integration tests

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
