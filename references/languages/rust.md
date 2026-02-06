# Rust Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `Cargo.toml` — PRIMARY (manifest: dependencies, features, edition, workspace)
2. `rust-toolchain.toml` — Rust version pinning (overrides rustup default)
3. `rustfmt.toml` / `.rustfmt.toml` — Code formatting rules (max_width, edition, style options)
4. `.clippy.toml` / `clippy.toml` — Clippy lint configuration (threshold values, allowed patterns)
5. `Cargo.lock` — Dependency lock (read-only for libraries; committed for applications)

### Convention Inference
- **Edition:** Read `Cargo.toml` `[package] edition` field — `"2015"`, `"2018"`, or `"2021"`. Gates closure capture, module paths, async patterns
- **Rust version:** Read `rust-toolchain.toml` for pinned version; if absent, infer from edition
- **Naming:** Modules `snake_case`, types `PascalCase`, functions/vars `snake_case` — compiler-enforced, non-negotiable
- **Formatting:** If `rustfmt.toml` exists, read `max_width`, `edition`, `use_field_init_shorthand`, `format_code_in_doc_comments`
- **Lint levels:** If `.clippy.toml` exists, read thresholds (e.g., `cognitive-complexity-threshold`, `too-many-arguments-threshold`)
- **Workspace:** Check `Cargo.toml` for `[workspace]` section — multi-crate project structure

### Framework Detection
Check `Cargo.toml` `[dependencies]` section:
- **Actix-web:** `actix-web` dependency + `#[actix_web::main]` macro + `web::App::new()` pattern
- **Axum:** `axum` dependency + `Router` usage + built on Tokio tower middleware
- **Rocket:** `rocket` dependency + `#[get("/")]` route macros + `#[launch]` attribute
- **Tokio:** `tokio` with features `["full"]` or `["rt", "macros"]` + `#[tokio::main]` macro
- **Serde:** `serde` + `serde_json`/`serde_yaml` + `#[derive(Serialize, Deserialize)]`
- **Diesel:** `diesel` with DB feature (`postgres`, `sqlite`, `mysql`) + `table!` macro + schema module
- **sqlx:** `sqlx` with DB feature + `#[derive(FromRow)]` + compile-time query checking

## Convention Rules

Rules applied in precedence order (first match wins):

1. Rust naming conventions are COMPILER-ENFORCED — `snake_case` functions/modules, `PascalCase` types. Non-negotiable
2. IF `rustfmt.toml` exists THEN formatting is non-negotiable; use its `max_width` and style settings
3. IF `.clippy.toml` sets lint thresholds THEN respect them; do not suggest refactorings that violate configured levels
4. IF edition = `"2021"` THEN suggest modern closure capture, improved trait patterns
5. IF edition = `"2018"` THEN async/await available but use `crate::` module paths
6. IF edition = `"2015"` THEN no async/await, use `self::` module paths — suggest edition upgrade in Convention Improvements
7. IF Tokio detected THEN all async patterns must use Tokio-compatible primitives
8. IF project is a library (`[lib]` in Cargo.toml) THEN prefer `thiserror` for errors, avoid `anyhow`
9. IF project is a binary THEN `anyhow` acceptable for error handling
10. Precedence: Rust compiler rules > rustfmt/clippy config > Cargo.toml settings > code inference

## Common Smells & Fixes

### 1. Excessive .clone()
**Smell:** Heap allocations for `String`/`Vec` when references would suffice
**Fix:** Analyze ownership; use references `&T`, or `Cow<T>` for conditional ownership
**Example:** `fn process(data: String)` called with `process(s.clone())` → `fn process(data: &str)` with `process(&s)`

### 2. Unwrap Everywhere
**Smell:** `unwrap()` panics in production; no error context
**Fix:** Use `?` operator for propagation; `expect("message")` for programmer errors; `unwrap_or_default()` for safe defaults
**Example:** `let val = map.get("key").unwrap()` → `let val = map.get("key").ok_or_else(|| anyhow!("key missing"))?`

### 3. Unboxed Large Enum Variants
**Smell:** Enum with one large variant bloats size of all variants
**Fix:** Wrap large variants in `Box<T>`
**Example:** `enum Msg { Small(u8), Large([u8; 1024]) }` → `enum Msg { Small(u8), Large(Box<[u8; 1024]>) }`

### 4. Stringly-Typed Errors
**Smell:** Plain `String` as error type — no structured error handling
**Fix:** Use `thiserror` for libraries (typed errors); `anyhow` for applications (context chains)
**Example:** `Err("failed".to_string())` → `#[derive(thiserror::Error)] enum AppError { #[error("failed")] Failed }`

### 5. Silent Result Ignore
**Smell:** `let _ = func();` discarding `Result` without checking
**Fix:** Handle the error or use `let _ =` with explicit `// Intentionally ignoring` comment
**Example:** `let _ = file.sync_all();` → `file.sync_all().map_err(|e| warn!("sync failed: {e}"))?;`

### 6. Mutable Static
**Smell:** `static mut X: T` without synchronization — unsafe and undefined behavior
**Fix:** Use `std::sync::Mutex<T>`, `OnceLock`, or atomic types
**Example:** `static mut COUNTER: u32 = 0;` → `static COUNTER: AtomicU32 = AtomicU32::new(0);`

### 7. Over-Annotated Lifetimes
**Smell:** Explicit lifetime annotations where elision rules already apply
**Fix:** Remove annotations covered by elision rules; let compiler infer
**Example:** `fn first<'a>(s: &'a str) -> &'a str` → `fn first(s: &str) -> &str`

### 8. &String Parameter
**Smell:** `fn process(s: &String)` — unnecessarily specific, requires `String` allocation from callers
**Fix:** Accept `&str` for maximum flexibility
**Example:** `fn greet(name: &String)` → `fn greet(name: &str)`

### 9. &Vec<T> Parameter
**Smell:** `fn process(v: &Vec<T>)` — unnecessarily specific
**Fix:** Accept `&[T]` (slice) for flexibility
**Example:** `fn sum(nums: &Vec<i32>)` → `fn sum(nums: &[i32])`

### 10. Blocking in Async
**Smell:** `std::thread::sleep()` or blocking I/O in `async fn` — blocks entire executor thread
**Fix:** Use `tokio::time::sleep()`, `tokio::fs::*`, `tokio::io::*`
**Example:** `async fn process() { std::thread::sleep(Duration::from_secs(1)); }` → `tokio::time::sleep(Duration::from_secs(1)).await;`

### 11. Unsafe Without Documentation
**Smell:** `unsafe { }` blocks without safety comments explaining invariants
**Fix:** Add `// SAFETY: ...` comment above every unsafe block explaining why it's sound
**Example:** `unsafe { ptr.read() }` → `// SAFETY: ptr is guaranteed non-null by constructor invariant\nunsafe { ptr.read() }`

### 12. Manual Match on Option/Result
**Smell:** `match opt { Some(x) => f(x), None => default }` — verbose
**Fix:** Use combinators: `.map()`, `.and_then()`, `.unwrap_or()`, `.unwrap_or_else()`
**Example:** `match opt { Some(x) => x * 2, None => 0 }` → `opt.map(|x| x * 2).unwrap_or(0)`

### 13. Panic in Library Code
**Smell:** `panic!()` or `unreachable!()` in library functions — unrecoverable for consumers
**Fix:** Return `Result<T, E>` for recoverable errors; document where panics can occur
**Example:** `panic!("invalid state")` → `return Err(Error::InvalidState)`

### 14. Index-Based Loops
**Smell:** `for i in 0..vec.len() { vec[i] }` — bounds checking overhead, less idiomatic
**Fix:** Use iterators: `.iter()`, `.into_iter()`, `.iter_mut()`
**Example:** `for i in 0..items.len() { process(&items[i]) }` → `for item in &items { process(item) }`

### 15. Shared Mutability Anti-Pattern
**Smell:** Attempting to share mutable state across threads without proper synchronization
**Fix:** Use `Arc<Mutex<T>>`, channels (`mpsc`), or restructure to avoid shared mutable state
**Example:** Shared `Vec` across threads → `Arc<Mutex<Vec<T>>>` or `mpsc::channel()` for message passing

## Idiomatic Refactorings

Edition-gated and version-gated — only suggest if project's edition/version supports it:

### Edition 2021
- Disjoint capture in closures — closures only capture needed fields, not entire struct
- Improved trait object handling — more ergonomic `dyn Trait` usage
- Use `IntoIterator` for arrays: `for x in [1, 2, 3]` (now works directly)

### Edition 2018
- Use `async`/`await` syntax for asynchronous code
- Use `crate::` paths for module imports (replaces `::module` from 2015)
- Use `dyn Trait` explicitly (no bare trait objects)

### Version-Specific (1.56+)
- **1.70+:** Use `OnceLock` for lazy static initialization (replaces `lazy_static!`)
- **1.63+:** Use scoped threads: `std::thread::scope(|s| { s.spawn(|| ...) })`
- **1.56+:** Use const generics for array-size-generic functions

### General (all editions)
- Replace `match` on Option/Result → combinator chains (`.map()`, `.and_then()`)
- Replace `&String` → `&str`; `&Vec<T>` → `&[T]` in function signatures
- Replace manual trait impls → `#[derive(...)]` macros where applicable
- Replace index loops → `.iter()`, `.into_iter()`, `.enumerate()`
- Replace `Rc<RefCell<T>>` patterns → consider restructuring ownership or using channels
- Use `impl Trait` in return position for cleaner function signatures
- Use `?` operator consistently instead of `match` for error propagation

## Framework-Specific Patterns

### Actix-web / Axum
- **Handler patterns:** Use extractors for typed request parsing (`web::Json<T>`, `axum::extract::*`)
- **State management:** Use `web::Data<T>` (Actix) or `Extension<T>` / `State<T>` (Axum) for shared app state
- **Middleware:** Actix: `wrap()` with `Transform` trait. Axum: tower `Layer` middleware
- **Error handling:** Implement `ResponseError` (Actix) or `IntoResponse` (Axum) for custom error types
- **Graceful shutdown:** Use `tokio::signal` for SIGTERM handling with server shutdown

### Tokio
- **Spawn patterns:** Use `tokio::spawn()` for independent tasks; `tokio::select!` for racing futures
- **Cancellation:** Tasks are cancelled when their `JoinHandle` is dropped — design for cancellation safety
- **Structured concurrency:** Use `JoinSet` for managing groups of spawned tasks
- **Blocking code:** Use `tokio::task::spawn_blocking()` for CPU-bound work in async context
- **Channels:** Use `tokio::sync::mpsc` for multi-producer; `watch` for config updates; `oneshot` for request-response

### Serde
- **Derive patterns:** `#[derive(Serialize, Deserialize)]` for struct/enum serialization
- **Field attributes:** `#[serde(rename = "camelCase")]`, `#[serde(skip_serializing_if = "Option::is_none")]`
- **Custom serialization:** Implement `Serialize`/`Deserialize` manually only for complex transformations
- **Default values:** Use `#[serde(default)]` or `#[serde(default = "default_fn")]` for optional fields

## Testing

### Frameworks & Tools
- **Built-in:** `#[cfg(test)] mod tests { ... }` — unit tests within source files, run with `cargo test`
- **Integration tests:** `tests/` directory — separate binary, full crate access
- **doc tests:** Code in doc comments (`///`) is compiled and tested
- **proptest:** Property-based testing — `proptest! { fn test(x in 0..100) { assert!(x < 100) } }`
- **quickcheck:** Alternative property testing with shrinking
- **mockall:** Trait-based mocking — `#[automock]` attribute for mock generation
- **insta:** Snapshot testing — `insta::assert_snapshot!(output)`
- **cargo-tarpaulin:** Code coverage — `cargo tarpaulin --out html`

### Convention-Aware Testing Suggestions
- IF Actix-web → suggest `actix_web::test` module with `TestRequest` builder
- IF Axum → suggest tower `ServiceExt` testing with `oneshot` requests
- IF Tokio → suggest `#[tokio::test]` attribute for async tests
- IF Diesel → suggest test database with transaction rollback per test
- IF no test structure detected → suggest `#[cfg(test)]` modules in source + `tests/` for integration
- Property testing (proptest/quickcheck) recommended for parsing, serialization, mathematical operations

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
