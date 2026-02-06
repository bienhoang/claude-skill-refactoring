# Swift Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `Package.swift` — PRIMARY for SPM projects (Swift tools version, dependencies, targets)
2. `.swiftlint.yml` — SwiftLint linting config (enabled/disabled rules, custom thresholds)
3. `.xcodeproj/` / `.xcworkspace/` — Xcode project structure (build settings, targets)
4. `Podfile` — CocoaPods dependency manager
5. `Cartfile` — Carthage dependency manager

### Convention Inference
- **Swift version:** Read `Package.swift` `swift-tools-version:` or Xcode build settings `SWIFT_VERSION`
- **Naming:** PascalCase types/protocols, lowerCamelCase functions/variables/properties — Swift standard
- **Protocol naming:** `-able`/`-ible` suffix for capability protocols (e.g., `Equatable`, `Codable`)
- **File naming:** `TypeName.swift`, `Type+Extension.swift` for extensions
- **Indentation:** Check .swiftlint.yml or scan files (4 spaces common, some use 2)
- **Optional patterns:** Scan for force unwrap `!` frequency — high usage indicates unsafe practices
- **Access control:** Check for `internal` (default) vs explicit `public`/`private` discipline

### Framework Detection
Check imports in source files + project structure:
- **SwiftUI:** `import SwiftUI` + `@main` app decorator + `View` protocol conformance
- **UIKit:** `import UIKit` + `UIViewController` subclasses + storyboard/xib files
- **Combine:** `import Combine` + `Publisher`/`Subscriber` usage + `@Published` properties
- **Vapor:** `import Vapor` + `routes.swift` + async route handlers
- **SwiftData:** `import SwiftData` + `@Model` macro + `ModelContainer`

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `.swiftlint.yml` present THEN use its rules as authoritative; respect disabled rules
2. IF Swift version >= 6.0 THEN enforce strict concurrency, `Sendable`, complete data race safety
3. IF Swift version >= 5.9 THEN suggest `@Observable` macro (replaces `ObservableObject`)
4. IF Swift version >= 5.5 THEN suggest async/await, actors; deprecate completion handler patterns
5. IF Swift version < 5.5 THEN use completion handlers, DispatchQueue-based concurrency
6. IF SwiftUI project THEN prefer value types (`struct`), use `@State`/`@Binding`/`@Environment`
7. IF UIKit project THEN follow delegate/coordinator patterns, MVC/MVVM architecture
8. Swift naming conventions (PascalCase types, camelCase members) are compiler-warned — non-negotiable
9. Precedence: .swiftlint.yml > Swift version > framework conventions > code inference

## Common Smells & Fixes

### 1. Force Unwrapping
**Smell:** `let value = optional!` — crashes at runtime if nil
**Fix:** Use `guard let`, `if let`, or nil-coalescing `??`
**Example:** `let name = user.name!` → `guard let name = user.name else { return }`

### 2. Retain Cycles in Closures
**Smell:** Strong reference to `self` in escaping closures — memory leak
**Fix:** Use `[weak self]` or `[unowned self]` in closure capture list
**Example:** `service.fetch { self.update($0) }` → `service.fetch { [weak self] in self?.update($0) }`

### 3. Excessive Optionals
**Smell:** Properties declared optional when they should have defaults — nil proliferation
**Fix:** Use non-optional with default value; make optional only when nil is semantically meaningful
**Example:** `var count: Int? = nil` → `var count: Int = 0`

### 4. Missing Error Handling in Closure Chains
**Smell:** Result/completion handlers that ignore `.failure` cases
**Fix:** Handle both `.success` and `.failure`; or use async/await with try/catch
**Example:** `switch result { case .success(let v): use(v); default: break }` → handle `.failure`

### 5. God Class
**Smell:** ViewController/View with 500+ LOC mixing UI, networking, business logic
**Fix:** Extract into MVVM with separate ViewModel, services, and coordinators
**Example:** Fat ViewController → ViewModel for logic, Coordinator for navigation, Service for networking

### 6. Missing MARK Comments
**Smell:** Large file without `// MARK:` organization — hard to navigate
**Fix:** Add `// MARK: - Section Name` for logical groupings (Lifecycle, Actions, Private, Extensions)
**Example:** Add `// MARK: - Lifecycle`, `// MARK: - Actions`, `// MARK: - Private Methods`

### 7. Protocol Not Organized via Extensions
**Smell:** Protocol conformance methods mixed with other methods in class body
**Fix:** Use extensions for each protocol conformance
**Example:** `class MyVC: UIViewController, UITableViewDelegate { /* mixed */ }` → separate `extension MyVC: UITableViewDelegate { }`

### 8. Unnecessary Type Annotation
**Smell:** `let name: String = "hello"` — type inference handles this
**Fix:** Remove annotation when type is obvious from initializer
**Example:** `let count: Int = 42` → `let count = 42`

### 9. Magic Numbers in Layout/Timing
**Smell:** `view.frame = CGRect(x: 16, y: 44, width: 343, height: 200)` — what do these mean?
**Fix:** Extract to named constants or use Auto Layout constraints
**Example:** `inset(by: 16)` → `inset(by: Constants.horizontalPadding)`

### 10. Mutable State in Value Types
**Smell:** `struct` with `mutating` methods modifying multiple properties — may need class semantics
**Fix:** If mutation is central to the type's purpose, consider using `class` instead
**Example:** Evaluate if reference semantics needed; keep struct if mutation is rare

### 11. Missing @escaping on Closure Parameters
**Smell:** Closure stored for later execution without `@escaping` — compiler error or unexpected behavior
**Fix:** Add `@escaping` annotation when closure outlives function scope
**Example:** `func fetch(completion: () -> Void)` stored in property → add `@escaping`

### 12. Implicitly Unwrapped Optionals as Parameters
**Smell:** `func process(_ value: String!)` — defeats type safety
**Fix:** Use regular optional `String?` or non-optional `String`
**Example:** `func process(_ value: Int!)` → `func process(_ value: Int)`

### 13. Silent Failure Paths
**Smell:** `catch { }` or `try?` silently ignoring errors
**Fix:** Log errors, present to user, or propagate with `try`
**Example:** `try? saveData()` → `do { try saveData() } catch { logger.error("Save failed: \(error)") }`

### 14. Nested Optionals
**Smell:** `let value: String??` from chaining optional operations
**Fix:** Use `flatMap` or restructure to avoid double-wrapping
**Example:** `optional.map { getOptional($0) }` (returns `T??`) → `optional.flatMap { getOptional($0) }`

### 15. Missing Codable Error Handling
**Smell:** `try! JSONDecoder().decode(T.self, from: data)` — crashes on malformed data
**Fix:** Use `do/try/catch` with meaningful error handling
**Example:** `try!` → `do { let model = try decoder.decode(T.self, from: data) } catch { handle(error) }`

## Idiomatic Refactorings

Version-gated — only suggest if project's Swift version supports it:

### Swift 6.0+
- Enforce strict concurrency by default — all types crossing isolation boundaries must be `Sendable`
- Replace manual thread safety → actor isolation
- Complete data race safety at compile time

### Swift 5.9+
- Replace `ObservableObject` + `@Published` → `@Observable` macro (simpler, better performance)
- Use `if`/`switch` expressions: `let x = if condition { a } else { b }`
- Use macros for boilerplate reduction

### Swift 5.5+
- Replace completion handlers → `async`/`await`
- Replace manual thread management → structured concurrency (`TaskGroup`, `async let`)
- Use actors for mutable shared state: `actor Counter { var count = 0 }`
- Replace `DispatchQueue.main.async` → `@MainActor`

### General (all versions)
- Replace `if let x = x` → shorthand `if let x` (Swift 5.7+)
- Replace type checks → protocol conformance where possible
- Replace delegate callbacks → Combine publishers or async sequences
- Use `guard let` for early exit instead of nested `if let`
- Use `Result` type for operations that can fail with typed errors
- Use `Codable` for serialization instead of manual JSON parsing
- Prefer `struct` over `class` for value semantics

## Framework-Specific Patterns

### SwiftUI
- **@Observable (5.9+):** Replace `ObservableObject` + `@Published` → `@Observable` class for cleaner model layer
- **View composition:** Keep views small (<50 lines); extract subviews as computed properties or separate types
- **Environment values:** Use `@Environment` for dependency injection; avoid singletons
- **Navigation:** Use `NavigationStack` + `navigationDestination` (iOS 16+); avoid `NavigationLink` with destination
- **State management:** `@State` for local, `@Binding` for parent-child, `@Environment` for global

### UIKit
- **MVVM-C:** ViewController for UI, ViewModel for logic, Coordinator for navigation
- **Diffable data source:** Replace `reloadData()` → `UICollectionViewDiffableDataSource` for animated updates
- **Compositional layout:** Replace flow layout → `UICollectionViewCompositionalLayout` for complex layouts
- **Combine integration:** Use `assign(to:on:)` and `sink` for reactive bindings in UIKit

### Vapor
- **Async handlers:** All route handlers should be `async` — use `req.db` for database, `req.client` for HTTP
- **Fluent ORM:** Use `@ID`, `@Field`, `@Parent`/`@Children` property wrappers for model definitions
- **Middleware:** Use `app.middleware.use()` for request/response processing pipeline
- **Validation:** Use `Validatable` protocol with `validations()` method

## Testing

### Frameworks & Tools
- **XCTest:** `swift test` / Xcode test navigator — built-in framework
- **Swift Testing (5.9+):** `@Test` macro, `#expect` macro — modern replacement for XCTest
- **swift-snapshot-testing:** Snapshot tests for UI components
- **ViewInspector:** SwiftUI view testing without running UI
- **Quick/Nimble:** BDD-style testing — `describe`, `context`, `it`, `expect`

### Convention-Aware Testing Suggestions
- IF Swift >= 5.9 → suggest Swift Testing framework (`@Test`, `#expect`) for new tests
- IF XCTest only → suggest keeping XCTest; note Swift Testing migration path
- IF SwiftUI → suggest ViewInspector or snapshot testing for view verification
- IF UIKit → suggest XCTest with `XCUITest` for UI testing
- IF Vapor → suggest `XCTVapor` for endpoint testing with test application
- IF no test structure → suggest Swift Testing for greenfield; XCTest for existing projects

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
