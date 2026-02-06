# Language-Specific Refactoring Patterns

## Python

### Common Smells & Fixes
- **Mutable default arguments:** `def f(items=[])` → `def f(items=None): items = items or []`
- **Bare except:** `except:` → `except SpecificError:` or at minimum `except Exception:`
- **God function with nested defs:** Extract to module-level functions or a class
- **Manual resource management:** Use `with` statement (context managers)
- **String concatenation in loop:** Use `"".join()` or f-strings
- **Repeated isinstance checks:** Use `@singledispatch` or strategy pattern
- **Global state:** Encapsulate in a class or use dependency injection

### Pythonic Refactorings
- Replace `for` loop building list → list comprehension or `map/filter`
- Replace index-based iteration → `enumerate()`, `zip()`
- Replace `dict.has_key()` or `key in dict.keys()` → `key in dict`
- Replace manual `__init__` boilerplate → `@dataclass`
- Replace `namedtuple` with mutable needs → `@dataclass`
- Replace `type()` checks → `isinstance()` with ABC
- Replace nested dicts → typed dataclasses or Pydantic models

### Testing
- Framework: `pytest` (preferred), `unittest`
- Mocking: `unittest.mock`, `pytest-mock`
- Coverage: `pytest-cov`
- Run: `pytest -v --tb=short`
- Snapshot: `pytest --snapshot-update` (with syrupy)

## JavaScript / TypeScript

### Common Smells & Fixes
- **Callback hell:** Refactor to `async/await` with proper error handling
- **`var` usage:** Replace with `const` (preferred) or `let`
- **`== null` checks:** Use optional chaining `?.` and nullish coalescing `??`
- **Prototype manipulation:** Convert to ES6+ `class` syntax
- **`any` type (TS):** Replace with proper types, generics, or `unknown`
- **Barrel exports re-exporting everything:** Only export what's needed
- **Implicit globals:** Add `"use strict"` or use modules

### Idiomatic Refactorings
- Replace `for` loop → `.map()`, `.filter()`, `.reduce()`
- Replace promise chains → `async/await`
- Replace constructor + manual assignment → class fields or destructuring
- Replace `Object.assign` → spread operator `{...obj}`
- Replace string enums → `as const` objects (TS) or actual enums
- Replace large switch → `Record<string, Handler>` lookup map
- Replace default exports → named exports for better refactoring support

### Testing
- Framework: `vitest` (modern), `jest`, `mocha`
- Mocking: Built-in (`vi.mock` / `jest.mock`)
- Coverage: `--coverage` flag (c8/v8 or istanbul)
- Run: `npx vitest run` or `npx jest`
- E2E: `playwright`, `cypress`

## Java

### Common Smells & Fixes
- **Checked exception overuse:** Convert to RuntimeException subclasses where appropriate
- **Getter/Setter boilerplate:** Use Lombok `@Data` or Java records
- **Null returns:** Use `Optional<T>`
- **Mutable collections as fields:** Return unmodifiable views or use `List.copyOf()`
- **Static utility classes:** Consider if methods belong on the data they operate on
- **Stringly-typed code:** Introduce enums or value objects

### Idiomatic Refactorings
- Replace anonymous inner class → lambda (for functional interfaces)
- Replace `for` loop → Stream API (`stream().filter().map().collect()`)
- Replace data class boilerplate → `record` (Java 16+)
- Replace builder pattern boilerplate → Lombok `@Builder`
- Replace `null` checks → `Optional.ofNullable().map().orElse()`
- Replace `instanceof` cascade → pattern matching (Java 17+)
- Replace mutable POJO → immutable record + wither methods

### Testing
- Framework: JUnit 5, TestNG
- Mocking: Mockito, WireMock (HTTP)
- Coverage: JaCoCo
- Run: `mvn test` or `gradle test`
- Integration: `@SpringBootTest`, Testcontainers

## Go

### Common Smells & Fixes
- **Ignoring errors:** `result, _ := f()` → Always handle or explicitly document why ignored
- **Package-level variables:** Pass as function params or use struct fields
- **Interface pollution:** Define interfaces at the consumer, not the provider; keep interfaces small
- **`init()` functions:** Prefer explicit initialization in `main()` or constructors
- **Returning `(T, error)` with sentinel errors:** Define typed errors with `errors.New` or custom error types

### Idiomatic Refactorings
- Replace large interface → break into 1-2 method interfaces (Interface Segregation)
- Replace `switch` on type → use type assertion with interface method
- Replace shared mutable state → channels or sync primitives
- Replace god struct → smaller structs with composition (embedding)
- Replace string keys → typed constants or iota enums
- Replace `panic` in library code → return `error`

### Testing
- Framework: `testing` (standard library)
- Mocking: interfaces + manual mocks, `gomock`, `testify/mock`
- Coverage: `go test -coverprofile`
- Run: `go test ./... -v`
- Table-driven tests pattern is strongly preferred

## Rust

### Common Smells & Fixes
- **Excessive `.clone()`:** Analyze ownership, use references or `Cow<T>`
- **`unwrap()` everywhere:** Replace with `?` operator, `expect()` with message, or proper error handling
- **Large `enum` variants:** Box large variants to keep enum size small
- **Stringly-typed errors:** Use `thiserror` for library errors, `anyhow` for application errors

### Idiomatic Refactorings
- Replace manual `match` on Option/Result → combinators (`.map()`, `.and_then()`, `.unwrap_or()`)
- Replace `&String` parameter → `&str`; `&Vec<T>` → `&[T]`
- Replace manual trait impl → derive macros where applicable
- Replace index-based iteration → iterators with `.iter()`, `.into_iter()`
- Replace shared mutability → `RefCell`, channels, or restructure ownership

### Testing
- Framework: built-in `#[cfg(test)]` modules
- Run: `cargo test`
- Integration: `tests/` directory (separate binary)
- Property testing: `proptest`, `quickcheck`
