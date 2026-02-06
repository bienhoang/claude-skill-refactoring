# Kotlin Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `build.gradle.kts` / `build.gradle` — PRIMARY (Kotlin version, plugins, dependencies, ktlint/detekt config)
2. `gradle.properties` — Kotlin version (`kotlin.version`), JVM target, Compose compiler version
3. `libs.versions.toml` — Gradle version catalog (centralized dependency versions)
4. `.editorconfig` — ktlint reads from here for formatting rules
5. `detekt.yml` — Detekt static analysis config (complexity thresholds, naming rules)

### Convention Inference
- **Kotlin version:** Read from `gradle.properties` `kotlin.version` or `libs.versions.toml` — gates context parameters, K2 compiler
- **JVM target:** Read `build.gradle.kts` `jvmTarget` — affects available Java interop features
- **Naming:** PascalCase classes, camelCase functions/properties, UPPER_CASE constants — Kotlin standard
- **Data classes:** Scan for `data class` usage frequency — indicates immutability preference
- **Extension functions:** Scan for `fun Type.method()` patterns — indicates Kotlin-idiomatic style
- **Coroutine usage:** Check for `kotlinx-coroutines` dependency + `suspend` function prevalence
- **Null safety:** Check for `!!` operator frequency — high usage indicates weak null handling

### Framework Detection
Check `build.gradle.kts` plugins + dependencies:
- **Android:** `com.android.application` or `com.android.library` plugin + `compileSdk` setting
- **Jetpack Compose:** `org.jetbrains.compose` or `compose = true` in build config + `@Composable` functions
- **Spring Boot (Kotlin):** `org.springframework.boot` plugin + `spring-boot-starter-*` dependencies
- **Ktor:** `io.ktor:ktor-server-core` dependency + routing DSL
- **Coroutines:** `org.jetbrains.kotlinx:kotlinx-coroutines-core` dependency + `suspend` functions
- **KMM/Multiplatform:** `kotlin("multiplatform")` plugin + `commonMain`/`androidMain` source sets

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF ktlint configured (plugin or dependency) THEN formatting is non-negotiable
2. IF detekt configured THEN use its complexity thresholds and naming rules as authoritative
3. IF Kotlin version >= 2.0 THEN suggest context parameters (replacing context receivers); K2 compiler improvements
4. IF Kotlin version >= 1.9 THEN K2 compiler opt-in available; suggest Enum improvements
5. IF Kotlin version < 1.9 THEN avoid K2-specific features
6. IF Android project THEN follow Android Kotlin style (ViewModels, lifecycle awareness, Hilt/Koin DI)
7. IF Compose project THEN follow Compose guidelines (stateless composables, state hoisting, remember)
8. IF Spring Boot Kotlin THEN use data classes for DTOs, coroutines for async, extension functions for DSLs
9. Kotlin naming conventions (PascalCase types, camelCase members) are IDE-enforced — flag deviations
10. Precedence: ktlint/detekt config > Gradle settings > framework conventions > code inference

## Common Smells & Fixes

### 1. Nullable Returns Instead of Sealed Classes
**Smell:** `fun find(id: Int): User?` — caller must handle null without knowing why
**Fix:** Use sealed class or `Result<T>` for explicit success/failure
**Example:** `fun find(id: Int): User?` → `sealed class FindResult { data class Found(val user: User) : FindResult(); data object NotFound : FindResult() }`

### 2. Missing Coroutine Scope
**Smell:** Launching coroutines without proper scope — memory leak, no cancellation
**Fix:** Use structured concurrency: `viewModelScope`, `lifecycleScope`, or `coroutineScope {}`
**Example:** `GlobalScope.launch { fetch() }` → `viewModelScope.launch { fetch() }`

### 3. Blocking Calls in Coroutines
**Smell:** `Thread.sleep()` or blocking I/O inside `suspend` function — blocks dispatcher thread
**Fix:** Use `delay()`, `withContext(Dispatchers.IO)`, or suspend-compatible APIs
**Example:** `suspend fun load() { Thread.sleep(1000) }` → `suspend fun load() { delay(1000) }`

### 4. Mutable var in Data Classes
**Smell:** `data class User(var name: String)` — defeats immutability purpose of data classes
**Fix:** Use `val` for all data class properties; create new instance with `copy()` for changes
**Example:** `data class Config(var port: Int)` → `data class Config(val port: Int)` + `config.copy(port = 8080)`

### 5. Missing Error Propagation
**Smell:** `try { ... } catch (e: Exception) { }` — swallowing errors silently
**Fix:** Log with context, re-throw, or use `Result<T>` for typed error handling
**Example:** Empty catch → `catch (e: Exception) { logger.error("Failed", e); throw e }`

### 6. God Class
**Smell:** Class with 500+ LOC or 10+ public methods mixing concerns
**Fix:** Extract into separate classes by responsibility; use extension functions for grouping
**Example:** Fat `UserManager` → `UserRepository`, `UserValidator`, `UserNotificationService`

### 7. !! Operator Overuse
**Smell:** `val name = user!!.name!!` — defeats Kotlin null safety, crashes at runtime
**Fix:** Use safe calls `?.`, Elvis `?:`, `let`, or `require`/`checkNotNull` with message
**Example:** `user!!.name` → `user?.name ?: "Unknown"` or `checkNotNull(user) { "User required" }.name`

### 8. Unstructured Concurrency (GlobalScope)
**Smell:** `GlobalScope.launch { }` — no lifecycle awareness, no cancellation, memory leak
**Fix:** Use structured scope tied to lifecycle: `viewModelScope`, `lifecycleScope`, `coroutineScope`
**Example:** `GlobalScope.launch { fetchData() }` → `viewModelScope.launch { fetchData() }`

### 9. Extension Functions Polluting Namespace
**Smell:** Top-level extension functions on common types (`String.doSpecificThing()`) — pollutes autocomplete
**Fix:** Scope extensions to relevant classes, use private extensions, or convert to regular functions
**Example:** `fun String.toUserId()` at top level → private extension or `UserId.from(string)` factory

### 10. Missing @Suppress Without Reason
**Smell:** `@Suppress("UNCHECKED_CAST")` without explaining why it's safe
**Fix:** Add comment explaining why suppression is safe
**Example:** `@Suppress("UNCHECKED_CAST")` → `@Suppress("UNCHECKED_CAST") // Safe: generic type erased but runtime type guaranteed by serializer`

### 11. Complex When Without Exhaustive Check
**Smell:** `when` expression without `else` branch on non-sealed types — runtime crash risk
**Fix:** Use sealed classes/interfaces for exhaustive `when`; or always include `else`
**Example:** `when (status) { "active" -> ... }` → `when (status) { Status.Active -> ...; Status.Inactive -> ... }` with sealed class

### 12. Too Many Lambda Parameters
**Smell:** Lambda with 3+ parameters — hard to read and maintain
**Fix:** Use named function, data class parameter, or destructuring declaration
**Example:** `callback(name, age, email, role)` → `data class UserInfo(...)` + `callback(userInfo)`

### 13. Silent Failures in Result Handling
**Smell:** `result.getOrNull()` without handling failure — errors disappear
**Fix:** Use `fold()`, `onFailure()`, or explicit `isSuccess`/`isFailure` check
**Example:** `val data = result.getOrNull()` → `result.fold(onSuccess = { use(it) }, onFailure = { log(it) })`

### 14. Circular Dependencies Between Packages
**Smell:** Package A imports from B which imports from A — fragile architecture
**Fix:** Extract shared types to a common package; use interfaces at boundaries
**Example:** Introduce `common` package with shared interfaces

### 15. Type-Unsafe Casting
**Smell:** `val user = obj as User` — throws `ClassCastException` if wrong type
**Fix:** Use safe cast `as?` with null handling, or `is` check with smart cast
**Example:** `val user = obj as User` → `val user = obj as? User ?: return` or `if (obj is User) { obj.name }`

## Idiomatic Refactorings

Version-gated — only suggest if project's Kotlin version supports it:

### Kotlin 2.0+
- Use context parameters (replacing experimental context receivers)
- K2 compiler is default — leverages improved type inference and performance
- Use `data object` for singleton-like sealed class variants

### Kotlin 1.9+
- Use Enum `entries` property instead of deprecated `values()`
- K2 compiler opt-in available for improved compilation speed
- Use `@SubclassOptInRequired` for sealed hierarchies

### Kotlin 1.8+
- Use `expect`/`actual` for multiplatform declarations
- Use sealed interfaces (in addition to sealed classes)
- Improved Java interop with `@JvmDefault` interface methods

### General (all versions)
- Replace Java-style getters/setters → Kotlin properties: `val name: String`
- Replace `if (x != null) { x.method() }` → safe call `x?.method()`
- Replace `if (x != null) x else default` → Elvis operator `x ?: default`
- Replace explicit type with inference: `val name: String = "hello"` → `val name = "hello"`
- Replace `for` loop building list → `map`, `filter`, `flatMap`
- Replace `when` with constants → `when` with sealed class for exhaustiveness
- Use `apply`/`also`/`let`/`run`/`with` scope functions for initialization and transformation
- Use `lazy` delegate for expensive computed properties
- Use destructuring: `val (name, age) = user`
- Replace utility classes → extension functions + top-level functions

## Framework-Specific Patterns

### Android (Jetpack)
- **ViewModel:** Use `ViewModel` + `StateFlow` for UI state; avoid `LiveData` in new code
- **Compose:** Stateless composables + state hoisting; use `remember` for computation caching; `LaunchedEffect` for side effects
- **Hilt/Koin DI:** Constructor injection for ViewModels; `@HiltViewModel` or Koin `viewModel()` factory
- **Navigation:** Compose Navigation with type-safe routes; avoid fragment transactions in new code
- **Flow patterns:** Use `StateFlow` for state, `SharedFlow` for events; collect with `collectAsStateWithLifecycle()`

### Spring Boot (Kotlin)
- **Data class DTOs:** Use `data class` for request/response objects; `copy()` for transformations
- **Coroutine integration:** Use `suspend` functions in controllers for reactive endpoints
- **Extension functions:** Create DSL-like APIs for configuration and domain logic
- **Null safety:** Leverage Kotlin null safety; avoid `Optional<T>` from Java

### Ktor
- **Routing DSL:** Use `routing { get("/path") { ... } }` for clean endpoint definitions
- **Content negotiation:** Configure `ContentNegotiation` with `kotlinx.serialization` for JSON
- **Authentication:** Use `authenticate("auth-name") { ... }` block for protected routes
- **Status pages:** Configure `StatusPages` for centralized error handling

## Testing

### Frameworks & Tools
- **JUnit 5 + Kotlin:** `./gradlew test` — standard with Kotlin extensions
- **MockK:** `mockk<Service>()` — Kotlin-native mocking (coroutine-aware)
- **Kotest:** `should`, `describe`/`it` — BDD-style with property testing
- **Turbine:** `flow.test { awaitItem() }` — Flow testing library
- **Espresso:** Android UI testing — `onView(withId(R.id.button)).perform(click())`
- **Compose Test:** `composeTestRule.setContent { }` — Compose UI testing
- **kotlinx-coroutines-test:** `runTest { }` — coroutine testing utilities

### Convention-Aware Testing Suggestions
- IF MockK detected → suggest `mockk`/`coEvery`/`coVerify` patterns for coroutine mocking
- IF Kotest detected → suggest `FunSpec`/`DescribeSpec` style for new tests
- IF JUnit 5 only → suggest keeping JUnit 5; note Kotest for more expressive tests
- IF Android → suggest `runTest {}` for coroutine tests, `composeTestRule` for Compose
- IF Spring Boot → suggest `@SpringBootTest` with MockK for service layer testing
- IF Ktor → suggest `testApplication { }` with `client.get("/path")` for endpoint tests
- IF no test framework → suggest JUnit 5 + MockK as default Kotlin testing stack

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
