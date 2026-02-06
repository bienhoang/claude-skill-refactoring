# Dart Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `pubspec.yaml` — PRIMARY (project name, SDK constraint, dependencies, dev_dependencies)
2. `analysis_options.yaml` — Linter rules, analyzer settings, strict mode
3. `build.yaml` — Code generation config (json_serializable, freezed, built_value)
4. `dart_test.yaml` — Test configuration (platforms, concurrency, timeout)
5. `.dart_tool/package_config.json` — Resolved package paths (read-only)

### Convention Inference
- **SDK version:** Read `pubspec.yaml` `environment.sdk` constraint — gates null safety, patterns, records, sealed classes
- **Null safety:** SDK `>=2.12.0` = sound null safety; below = legacy nullable-by-default
- **Lint ruleset:** Check `analysis_options.yaml` `include:` — `flutter_lints`, `lints`, `pedantic`, or custom
- **Strict mode:** Check for `implicit-casts: false`, `implicit-dynamic: false` in analyzer config
- **Naming:** `lowerCamelCase` for vars/functions, `UpperCamelCase` for classes/types — enforced by linter
- **File naming:** `snake_case.dart` — Dart convention, non-negotiable
- **Code gen:** Presence of `build.yaml` or `.g.dart`/`.freezed.dart` files indicates code generation

### Framework Detection
Check `pubspec.yaml` `dependencies` section:
- **Flutter:** `flutter: sdk: flutter` — widget tree, `StatelessWidget`/`StatefulWidget`, `BuildContext`
- **Riverpod:** `flutter_riverpod` or `riverpod` — `Provider`, `StateNotifier`, `ConsumerWidget`
- **Bloc:** `flutter_bloc` — `Bloc<Event, State>`, `BlocProvider`, `BlocBuilder`
- **Provider:** `provider` — `ChangeNotifierProvider`, `Consumer`, `context.watch`
- **GetX:** `get` — `GetxController`, `Obx`, reactive `.obs` variables
- **Shelf:** `shelf` + `shelf_router` — server-side HTTP handlers, middleware pipeline
- **Dart Frog:** `dart_frog` — file-based routing, server-side Dart
- **Serverpod:** `serverpod` — full-stack Dart framework with ORM

## Convention Rules

Rules applied in precedence order (first match wins):

1. `analysis_options.yaml` rules are AUTHORITATIVE — respect all enabled lints and analyzer settings
2. IF `implicit-casts: false` AND `implicit-dynamic: false` THEN enforce strict typing everywhere
3. IF SDK constraint `>=3.0.0` THEN suggest patterns, records, sealed classes, switch expressions
4. IF SDK constraint `>=2.17.0` THEN suggest enhanced enums, super parameters
5. IF SDK constraint `>=2.12.0` THEN enforce null safety; never suggest nullable-by-default patterns
6. IF SDK constraint `<2.12.0` THEN suggest null safety migration in Convention Improvements
7. IF Flutter detected THEN apply Flutter widget patterns, `const` constructors, `Key` usage
8. IF Riverpod/Bloc detected THEN apply state management patterns specific to that library
9. IF `prefer_const_constructors` lint enabled THEN enforce `const` on all eligible constructors
10. Precedence: analysis_options.yaml > SDK constraints > framework conventions > Dart style guide

## Common Smells & Fixes

### 1. Excessive setState
**Smell:** Multiple `setState()` calls in same method — redundant rebuilds
**Fix:** Batch state changes in single `setState()` call; or use state management (Riverpod, Bloc)
**Example:** `setState(() { _a++; }); setState(() { _b++; });` → `setState(() { _a++; _b++; });`

### 2. God Widget
**Smell:** Single widget with 200+ line `build()` method mixing layout, logic, styling
**Fix:** Extract into smaller, focused widget classes; use composition over nesting
**Example:** Inline `Container(child: Column(children: [...]))` → `const HeaderSection()`, `const ContentList()`

### 3. Missing Const Constructors
**Smell:** Immutable widget without `const` constructor — prevents compile-time constant optimization
**Fix:** Add `const` to constructor and use `const` at call sites
**Example:** `MyWidget({required this.title})` → `const MyWidget({super.key, required this.title})`

### 4. Improper FutureBuilder Usage
**Smell:** `FutureBuilder(future: fetchData())` — creates new Future every rebuild, infinite loop
**Fix:** Store Future in `initState()`, pass stored reference to `FutureBuilder`
**Example:** `future: fetchData()` in build → `late final _future = fetchData();` in initState, `future: _future` in build

### 5. Missing Dispose
**Smell:** `TextEditingController`, `AnimationController`, `StreamSubscription` without `dispose()` — memory leaks
**Fix:** Override `dispose()` method to clean up all controllers and subscriptions
**Example:** Missing dispose → `@override void dispose() { _controller.dispose(); super.dispose(); }`

### 6. Implicit Dynamic Types
**Smell:** `var data = jsonDecode(response);` — implicit `dynamic`, no type safety
**Fix:** Add explicit type annotations for decoded JSON and API responses
**Example:** `var data = jsonDecode(res);` → `final Map<String, dynamic> data = jsonDecode(res);`

### 7. Poor Error Handling
**Smell:** Bare `catch (e) { print(e); }` — catches everything, no stack trace, swallows errors
**Fix:** Catch specific exceptions, use `catch (e, stack)`, rethrow when appropriate
**Example:** `catch (e) {}` → `on NetworkException catch (e, stack) { logger.error(e, stack); rethrow; }`

### 8. Not Using Collection-If/For
**Smell:** Building list with conditional `.add()` calls — verbose, mutable
**Fix:** Use collection-if and collection-for in list literals
**Example:** `if (show) children.add(Text('x'));` → `[if (show) const Text('x')]`

### 9. Late Overuse
**Smell:** `late final` on fields that should be constructor parameters — runtime errors if not initialized
**Fix:** Use constructor injection with `required` parameters
**Example:** `late final Database db;` with `init()` → `UserService({required this.db})`

### 10. Mutable State in StatelessWidget
**Smell:** Non-final fields in `StatelessWidget` — will never trigger rebuild, silent bugs
**Fix:** Convert to `StatefulWidget` or use state management solution
**Example:** `int counter = 0;` in StatelessWidget → StatefulWidget with `setState`

### 11. Nested Callbacks
**Smell:** Deeply nested `.then()` chains — callback hell, hard to read
**Fix:** Use `async`/`await` syntax for sequential asynchronous operations
**Example:** `fetch().then((u) => load(u).then(...))` → `final u = await fetch(); final d = await load(u);`

### 12. String Concatenation Instead of Interpolation
**Smell:** `'Hello, ' + name + '!'` — verbose, error-prone, poor performance
**Fix:** Use string interpolation with `$variable` or `${expression}`
**Example:** `'Count: ' + count.toString()` → `'Count: $count'`

### 13. Synchronous File I/O in UI
**Smell:** `file.readAsStringSync()` in `build()` — blocks UI thread, janky app
**Fix:** Use async I/O in `initState()` with `FutureBuilder` for display
**Example:** `readAsStringSync()` in build → `readAsString()` in initState + FutureBuilder

### 14. Unused Imports
**Smell:** Accumulated unused imports — clutter, slower analysis, false dependencies
**Fix:** Run `dart fix --apply` to auto-remove; configure IDE to organize on save
**Example:** `import 'dart:async';` unused → remove, run `dart fix --apply`

### 15. Non-Null-Safe Code
**Smell:** Legacy code without null safety — missing `?`, `!`, `late`, nullable-by-default
**Fix:** Migrate with `dart migrate` tool; add `?` for nullable, use `??` for defaults
**Example:** `String name = null;` → `String? name;` with null-aware operators

## Idiomatic Refactorings

Version-gated — only suggest if project's SDK constraint supports it:

### Dart 3.x (3.0+)
- Use **patterns** in switch expressions: `switch (obj) { Point(x: var x) => ... }`
- Use **records** for lightweight data: `(String, int) instead of custom class for pairs`
- Use **sealed classes** for exhaustive pattern matching with compiler enforcement
- Use **switch expressions** (not statements): `return switch (status) { ... };`
- Use **if-case** for pattern matching in conditions: `if (json case {'name': String name}) ...`

### Dart 2.17+ (Enhanced Enums)
- Use enum with fields/methods: `enum Status { active('Active', Colors.green); const Status(this.label, this.color); ... }`
- Use `super.key` in widget constructors instead of explicit key forwarding

### Dart 2.12+ (Null Safety)
- Migrate all code to sound null safety
- Use `?` for nullable types, `!` for null assertion (sparingly), `??` for defaults
- Use `late` for lazily initialized non-nullable fields (when constructor injection not possible)
- Use `required` keyword for mandatory named parameters

### General (all versions)
- Use named constructors: `User.guest()`, `User.fromJson(json)`
- Use factory constructors for caching or returning subtypes
- Use extension methods for adding functionality to existing types
- Use `const` wherever possible for compile-time constants
- Use cascade notation `..` for method chaining on same object
- Use spread operator `...` for combining collections

## Framework-Specific Patterns

### Flutter
- **Widget composition:** Extract widgets into separate classes, not private methods (enables `const`)
- **State management:** Choose one (Riverpod, Bloc, Provider) — don't mix in same project
- **Keys:** Use `ValueKey` for list items with IDs; `GlobalKey` sparingly for form/state access
- **Const constructors:** Mark all immutable widgets `const` — reduces rebuild overhead
- **Theme usage:** Access via `Theme.of(context)` — don't hardcode colors/text styles
- **Responsive layout:** Use `LayoutBuilder`, `MediaQuery`, flex widgets over fixed dimensions

### Riverpod
- **Provider types:** `Provider` (read-only), `StateNotifierProvider` (mutable), `FutureProvider` (async)
- **ConsumerWidget:** Use `ref.watch` in build, `ref.read` in callbacks
- **Auto-dispose:** Use `autoDispose` modifier for providers tied to widget lifecycle

### Shelf (Server-Side)
- **Middleware pipeline:** Chain middleware with `Pipeline().addMiddleware()`
- **Router:** Use `shelf_router` for declarative route definitions
- **Handlers:** Return `Response` objects; use `Response.ok()`, `Response.notFound()`

## Testing

### Frameworks & Tools
- **test:** `test('description', () { expect(result, equals(expected)); })` — run with `dart test`
- **flutter_test:** `testWidgets('desc', (tester) async { ... })` — widget testing with `WidgetTester`
- **mockito:** `@GenerateMocks([MyClass])` + `when(mock.method()).thenReturn(value)` — code-gen mocks
- **integration_test:** `IntegrationTestWidgetsFlutterBinding.ensureInitialized()` — full app testing
- **coverage:** `dart test --coverage` or `flutter test --coverage` then `genhtml` for HTML reports

### Convention-Aware Testing Suggestions
- IF Flutter → use `testWidgets` with `pumpWidget`, `pump`, `pumpAndSettle` for async
- IF Riverpod → use `ProviderContainer` for unit testing providers; `ProviderScope.overrides` for widget tests
- IF Bloc → use `blocTest` from `bloc_test` package for state transition testing
- IF Shelf → use `shelf_test_handler` or direct `Request`/`Response` construction
- IF no test structure → suggest `test/` directory mirroring `lib/` structure
- Widget tests STRONGLY preferred for Flutter UI — faster than integration, more coverage than unit

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
