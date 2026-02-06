# C/C++ Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `CMakeLists.txt` — PRIMARY build system (target definitions, C++ standard, dependencies)
2. `compile_commands.json` — Clang compilation database for tooling (LSP, linters, refactoring tools)
3. `.clang-format` — Code formatting rules (style, indentation, brace placement)
4. `.clang-tidy` — Static analysis config (enabled checks, warning levels)
5. `Makefile` — Traditional build system; infer compiler flags and conventions
6. `conanfile.txt` / `conanfile.py` — Conan package manager dependencies
7. `vcpkg.json` — vcpkg package manager manifest
8. `meson.build` — Meson build system configuration
9. `.clangd` — Clangd LSP configuration (compilation flags, index settings)

### Convention Inference
- **C++ standard:** Read `CMakeLists.txt` for `CMAKE_CXX_STANDARD` (11/14/17/20/23) — gates language features
- **Build system:** CMake = modern; Makefile = traditional; check for Meson, Bazel, xmake
- **Naming style:** Scan headers for `snake_case`, `camelCase`, `PascalCase`, `m_prefix`, `_suffix` patterns
- **Header style:** Check for `#pragma once` vs `#ifndef` include guards
- **Const correctness:** Scan function signatures for trailing `const` on methods
- **Smart pointer usage:** Scan for `std::unique_ptr`, `std::shared_ptr` vs raw pointers
- **Error handling:** Check for exceptions vs error codes (return codes, `std::optional`, `std::expected`)
- **Namespace conventions:** Scan for nested namespaces, inline namespaces, anonymous namespaces
- **RAII patterns:** Check for custom resource wrappers vs manual cleanup

### Framework Detection
Check `CMakeLists.txt` `find_package()` / `target_link_libraries()` + scan includes:
- **Qt:** `find_package(Qt5)` or `Qt6` — `QObject`, signals/slots, MOC generation
- **Boost:** `find_package(Boost)` — `boost::` namespace, header-only + compiled libraries
- **gRPC:** `find_package(gRPC)` — protobuf, async streaming, `grpc::Server`
- **Poco:** `find_package(Poco)` — `Poco::Net`, `Poco::Data`, event-driven patterns
- **wxWidgets:** `find_package(wxWidgets)` — GUI framework, `wxApp`, `wxFrame`
- **SFML:** `find_package(SFML)` — Graphics, window, audio, networking
- **Dear ImGui:** Vendored typically — `ImGui::` namespace, immediate mode GUI
- **OpenCV:** `find_package(OpenCV)` — `cv::Mat`, computer vision algorithms
- **Eigen:** Header-only — `Eigen::` namespace, matrix operations
- **Catch2/GTest:** Testing frameworks — `find_package(Catch2)` / `find_package(GTest)`

## Convention Rules

Rules applied in precedence order (first match wins):

1. C++ standard version is PRIMARY GATE — never suggest features from newer standard than project uses
2. IF `.clang-format` exists THEN formatting is non-negotiable; respect style (brace placement, spacing)
3. IF `.clang-tidy` exists THEN align suggestions with enabled checks; respect disabled warnings
4. IF `CMAKE_CXX_STANDARD` < 11 THEN legacy C++98/03 — suggest upgrade in Convention Improvements
5. IF C++11 THEN suggest `nullptr`, `auto`, range-based for, lambdas, move semantics
6. IF C++14 THEN suggest generic lambdas, `std::make_unique`, binary literals
7. IF C++17 THEN suggest structured bindings, `std::optional`, `if constexpr`, `std::string_view`
8. IF C++20 THEN suggest concepts, ranges, coroutines, modules, `std::span`
9. IF C++23 THEN suggest `std::expected`, `std::mdspan`, `std::print`
10. IF Qt detected THEN apply Qt naming conventions (`camelCase`, `Q` prefix), signals/slots patterns
11. IF exceptions disabled (`-fno-exceptions`) THEN never suggest `throw`; use error codes
12. IF RTTI disabled (`-fno-rtti`) THEN never suggest `dynamic_cast` or `typeid`
13. Precedence: Compiler standard > clang-format/tidy config > CMake settings > code inference

## Common Smells & Fixes

### 1. Raw Pointer Ownership
**Smell:** Raw pointers with unclear ownership — who deletes? Memory leaks or double-free
**Fix:** Use `std::unique_ptr` for exclusive ownership, `std::shared_ptr` for shared ownership
**Example:** `Widget* w = new Widget();` → `auto w = std::make_unique<Widget>();`

### 2. Manual Memory Management
**Smell:** Explicit `new`/`delete` pairs scattered throughout code
**Fix:** Use RAII — smart pointers, containers, custom resource wrappers
**Example:** `int* arr = new int[100]; /* ... */ delete[] arr;` → `std::vector<int> arr(100);`

### 3. C-Style Casts
**Smell:** `(Type)value` — unsafe, no type checking, hides errors
**Fix:** Use C++ casts — `static_cast`, `dynamic_cast`, `const_cast`, `reinterpret_cast`
**Example:** `int* p = (int*)ptr;` → `int* p = static_cast<int*>(ptr);`

### 4. Macro Overuse
**Smell:** Function-like macros without type safety or scope
**Fix:** Use `constexpr` functions, `inline` functions, or templates
**Example:** `#define MAX(a,b) ((a)>(b)?(a):(b))` → `template<typename T> constexpr T max(T a, T b) { return a > b ? a : b; }`

### 5. God Header Files
**Smell:** Single header with 50+ includes, all types/functions — long compile times
**Fix:** Split into focused headers, use forward declarations, pimpl idiom
**Example:** `utils.h` with everything → `string_utils.h`, `math_utils.h`, `io_utils.h`

### 6. Include-What-You-Use Violations
**Smell:** Source files relying on transitive includes — brittle, breaks on refactoring
**Fix:** Include headers for all directly used types/functions
**Example:** Using `std::vector` without `#include <vector>` → add explicit include

### 7. Raw Loops Instead of Algorithms
**Smell:** Manual loops for common operations — verbose, error-prone
**Fix:** Use `<algorithm>` — `std::find`, `std::transform`, `std::accumulate`, or ranges (C++20)
**Example:** `for(size_t i=0; i<v.size(); ++i) if(v[i]==x) return i;` → `auto it = std::find(v.begin(), v.end(), x);`

### 8. Magic Numbers
**Smell:** Hardcoded numeric literals without meaning
**Fix:** Use `constexpr` variables or `enum class` for named constants
**Example:** `if(status == 404)` → `constexpr int HTTP_NOT_FOUND = 404; if(status == HTTP_NOT_FOUND)`

### 9. Exception Safety Violations
**Smell:** Functions that leave objects in invalid state when exceptions thrown
**Fix:** Use RAII, strong exception guarantee, or `noexcept` where guaranteed
**Example:** Manual cleanup → RAII wrappers that clean up in destructors

### 10. Naked new/delete in Constructors
**Smell:** Constructor allocates with `new`, destructor deallocates — exception unsafe
**Fix:** Use smart pointers or member containers instead of raw pointers
**Example:** `class C { T* p; C() : p(new T) {} ~C() { delete p; } }` → `class C { std::unique_ptr<T> p; };`

### 11. Global State
**Smell:** Mutable global variables or singletons — testing nightmare, thread-unsafe
**Fix:** Dependency injection, pass as function parameters, or use thread-local storage
**Example:** `static Database db;` accessed globally → `Database& db` passed to constructors

### 12. Const-Correctness Violations
**Smell:** Missing `const` on methods that don't modify object state
**Fix:** Mark non-modifying methods `const`, use `const&` for read-only parameters
**Example:** `int size() { return data.size(); }` → `int size() const { return data.size(); }`

### 13. RAII Violations
**Smell:** Resource acquisition not tied to object lifetime — leaks or cleanup code
**Fix:** Wrap resources in classes with constructor/destructor pairs
**Example:** `FILE* f = fopen(...); /* ... */ fclose(f);` → Custom `File` class or `std::unique_ptr<FILE, decltype(&fclose)>`

### 14. Copy vs Move Semantics Confusion
**Smell:** Expensive copies when moves would suffice — performance issues
**Fix:** Implement move constructor/assignment, use `std::move()` explicitly, return by value
**Example:** `std::vector<int> copy = vec;` in loop → `auto moved = std::move(vec);` when ownership transferred

### 15. Unsafe C String Handling
**Smell:** `strcpy`, `strcat`, `sprintf` — buffer overflows, no bounds checking
**Fix:** Use `std::string`, or bounded C functions (`strncpy`, `snprintf`)
**Example:** `char buf[10]; strcpy(buf, input);` → `std::string buf = input;`

## Idiomatic Refactorings

Version-gated — only suggest if project's C++ standard supports it:

### C++23
- Use `std::expected<T, E>` for error handling without exceptions
- Use `std::print` / `std::println` for type-safe formatted output
- Use `std::mdspan` for multi-dimensional array views
- Use `if consteval` for compile-time vs runtime paths
- Use deducing `this` for CRTP elimination

### C++20
- Use concepts for template constraints — `template<std::integral T>`
- Use ranges for composable algorithms — `views::filter | views::transform`
- Use coroutines for async/generator patterns — `co_await`, `co_yield`
- Use `std::span` for array views (non-owning, bounds-safe)
- Use modules for faster compilation and better encapsulation (when supported)
- Use `std::format` for type-safe string formatting
- Use three-way comparison (`<=>`) spaceship operator

### C++17
- Use structured bindings — `auto [key, value] = *it;`
- Use `std::optional<T>` for nullable values (no heap allocation)
- Use `std::variant<T1, T2>` for type-safe unions
- Use `std::string_view` for read-only string parameters (no allocation)
- Use `if constexpr` for compile-time branching
- Use inline variables for header-only constants
- Use fold expressions in variadic templates

### C++14
- Use generic lambdas — `auto f = [](auto x) { return x * 2; };`
- Use `std::make_unique` (missing in C++11)
- Use binary literals — `0b1010`
- Use `std::integer_sequence` for template metaprogramming

### C++11
- Replace `NULL` → `nullptr`
- Replace `typedef` → `using` type aliases
- Use `auto` for type inference, especially with iterators
- Use range-based for loops — `for (const auto& item : container)`
- Use lambdas instead of functors for small callbacks
- Use move semantics — `std::move()`, rvalue references `T&&`
- Use `= default` and `= delete` for special member functions
- Use `override` keyword on virtual function overrides
- Use `enum class` for scoped enumerations
- Use `static_assert` for compile-time checks

### General (all versions)
- Replace raw arrays → `std::array` (fixed size) or `std::vector` (dynamic)
- Replace manual resource management → RAII wrappers
- Replace output parameters → return by value (rely on RVO/NRVO)
- Replace function pointers → `std::function` or templates
- Replace preprocessor constants → `constexpr` variables
- Use forward declarations to reduce compile-time dependencies
- Apply Rule of Zero — let compiler generate special member functions when possible

## Framework-Specific Patterns

### Qt
- **Naming:** `camelCase` for methods, `PascalCase` for classes, `Q` prefix for Qt types
- **Signals/Slots:** Use `connect()` with function pointers (type-safe, Qt5+) over string-based
- **Memory management:** QObject parent-child ownership — parent deletes children automatically
- **Meta-object system:** Use `Q_OBJECT` macro, `moc` generates meta-information
- **Containers:** Prefer Qt containers (`QVector`, `QString`) in Qt-heavy code for implicit sharing
- **Event loop:** `QCoreApplication::exec()` for event-driven architecture
- **Threading:** Use `QThread` with worker objects moved to thread via `moveToThread()`

### Boost
- **Smart pointers:** Pre-C++11 projects may use `boost::shared_ptr`, migrate to `std::` equivalents
- **String algorithms:** `boost::algorithm::trim`, `split`, `join` for common operations
- **Filesystem:** Use `boost::filesystem` for C++14 and earlier; migrate to `std::filesystem` in C++17+
- **Asio:** Async I/O — `io_context`, handler-based or coroutine-based (C++20)
- **Spirit:** Parser combinators for DSL creation
- **Multi-index:** Advanced container with multiple indexing strategies

### gRPC
- **Service definition:** Define in `.proto` files, generate C++ stubs
- **Async API:** Use completion queue pattern for scalable servers
- **Streaming:** Bidirectional streaming with reader/writer APIs
- **Error handling:** Use `grpc::Status` with status codes and error messages
- **Interceptors:** Middleware for logging, auth, metrics

## Testing

### Frameworks & Tools
- **Google Test (GTest):** `TEST(TestSuite, TestCase)` — run with `ctest` or binary directly
- **Catch2:** `TEST_CASE("description")` — header-only (v2) or compiled (v3), BDD-style sections
- **doctest:** Lightweight alternative to Catch2 — fastest compile times
- **Google Mock (GMock):** `MOCK_METHOD(ReturnType, MethodName, (Args))` — mock objects for interfaces
- **CTest:** CMake's test driver — integrates with GTest/Catch2, runs tests in parallel
- **Valgrind:** Memory leak detection — `valgrind --leak-check=full ./test_binary`
- **AddressSanitizer:** Compile-time instrumentation — `-fsanitize=address` flag
- **Coverage:** `gcov` / `lcov` for coverage reports — `--coverage` compiler flag

### Convention-Aware Testing Suggestions
- IF CMake + GTest → use `gtest_discover_tests()` for automatic test registration
- IF CMake + Catch2 → use `catch_discover_tests()` for CTest integration
- IF Qt → use `QTest` framework with `QTEST_MAIN()` macro
- IF no test framework → suggest GTest (industry standard) or Catch2 (header-only simplicity)
- IF exceptions disabled → suggest testing error codes explicitly in assertions
- Suggest AddressSanitizer + UndefinedBehaviorSanitizer for CI pipelines
- IF C++20 → suggest doctest with faster compilation for large test suites

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
