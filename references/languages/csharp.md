# C# Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project/solution root in priority order:
1. `.editorconfig` — PRIMARY (Roslyn analyzer rules, naming conventions, formatting)
2. `.csproj` — Project config (target framework, package references, language version, nullable context)
3. `global.json` — SDK version targeting for consistent build environment
4. `.sln` — Solution structure; reveals multi-project organization
5. `Directory.Build.props` — Shared project settings across solution (centralized package versions, common properties)

### Convention Inference
- **Target framework:** Read `.csproj` `<TargetFramework>` (e.g., `net8.0`, `net6.0`)
- **C# version:** Read `.csproj` `<LangVersion>` or infer from target framework (net8.0 → C# 12)
- **Nullable context:** Check `.csproj` `<Nullable>enable</Nullable>` — critical for null safety patterns
- **Naming:** PascalCase classes/methods/properties, camelCase locals, `_camelCase` private fields, `I` prefix for interfaces
- **Async convention:** Methods returning `Task`/`Task<T>` must have `Async` suffix
- **Formatting:** Read `.editorconfig` `dotnet_naming_rule` and `csharp_style_*` settings
- **Analyzers:** Check for Roslyn analyzer packages in `.csproj` (StyleCop.Analyzers, SonarAnalyzer)

### Framework Detection
Check `.csproj` `<PackageReference>` entries + project structure:
- **ASP.NET Core:** `Microsoft.AspNetCore.App` framework reference or `Microsoft.AspNetCore.*` packages + `Program.cs` with `WebApplication.CreateBuilder()`
- **Entity Framework:** `Microsoft.EntityFrameworkCore.*` packages + `DbContext` classes
- **Blazor:** `Microsoft.AspNetCore.Components.*` packages + `.razor` files
- **MediatR:** `MediatR` package + `IRequest`/`IRequestHandler` implementations
- **Minimal API:** `app.MapGet()` / `app.MapPost()` patterns in `Program.cs`

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `.editorconfig` has `dotnet_naming_rule` entries THEN naming is non-negotiable; use those rules
2. IF `<Nullable>enable</Nullable>` in .csproj THEN enforce nullable reference type patterns — never suggest `null!` suppression
3. IF C# version >= 12 THEN suggest primary constructors, collection expressions
4. IF C# version >= 11 THEN suggest raw string literals, file-scoped types
5. IF C# version >= 10 THEN suggest `required` modifier, global usings, file-scoped namespaces
6. IF C# version >= 9 THEN suggest `record` for DTOs, init-only properties, top-level statements
7. IF ASP.NET Core project THEN apply middleware pipeline, DI registration, minimal API patterns
8. IF Entity Framework detected THEN apply DbContext lifecycle, migration patterns
9. C# naming conventions (PascalCase public, _camelCase private, IPrefix interfaces) are .NET-standard — flag deviations
10. Precedence: .editorconfig > .csproj settings > Roslyn analyzer rules > code inference

## Common Smells & Fixes

### 1. Async Void Methods
**Smell:** `async void Method()` — exceptions are uncatchable; crashes the process
**Fix:** Change to `async Task Method()` — only use `async void` for event handlers
**Example:** `async void SaveAsync()` → `async Task SaveAsync()`

### 2. Task.Result Blocking
**Smell:** `task.Result` or `task.Wait()` in async context — causes deadlocks
**Fix:** Use `await` instead of blocking
**Example:** `var data = GetDataAsync().Result;` → `var data = await GetDataAsync();`

### 3. Missing ConfigureAwait(false) in Libraries
**Smell:** Library code awaiting without `ConfigureAwait(false)` — captures sync context unnecessarily
**Fix:** Add `ConfigureAwait(false)` in library code; not needed in application/UI code
**Example:** `await httpClient.GetAsync(url)` → `await httpClient.GetAsync(url).ConfigureAwait(false)`

### 4. Returning Null from Task<T>
**Smell:** `return null` from `async Task<T>` — `NullReferenceException` on await
**Fix:** Return `Task.FromResult<T?>(null)` or use nullable return type `Task<T?>`
**Example:** Declare return as `Task<User?>` when null is a valid response

### 5. Mutable Public Fields
**Smell:** `public string Name;` — no encapsulation, no change notification
**Fix:** Use properties with `get; set;` or `get; init;` or `get; private set;`
**Example:** `public int Count;` → `public int Count { get; private set; }`

### 6. Missing Null Checks on Reference Types
**Smell:** Accessing properties without null guard — `NullReferenceException`
**Fix:** Use null-conditional `?.`, null-coalescing `??`, or `ArgumentNullException.ThrowIfNull()`
**Example:** `user.Address.City` → `user?.Address?.City ?? "Unknown"`

### 7. Silent Exception Swallowing
**Smell:** `catch (Exception) { }` — errors disappear silently
**Fix:** Log with context, re-throw, or handle explicitly
**Example:** Empty catch → `catch (Exception ex) { _logger.LogError(ex, "Operation failed"); throw; }`

### 8. God Class
**Smell:** Class with 10+ public methods or 500+ LOC mixing responsibilities
**Fix:** Extract into focused services; use CQRS with MediatR for complex operations
**Example:** `OrderService` with 15 methods → `CreateOrderHandler`, `CancelOrderHandler`, `OrderQuery`

### 9. Unused Private Methods
**Smell:** Private methods never called — dead code
**Fix:** Remove; configure Roslyn analyzer `IDE0051` to flag automatically
**Example:** Delete unused private methods; verify no reflection-based callers

### 10. Magic Numbers/Strings
**Smell:** Literal values in business logic without context
**Fix:** Extract to constants, configuration, or enum values
**Example:** `if (retryCount > 3)` → `if (retryCount > MaxRetries)`

### 11. Complex LINQ Without Local Variables
**Smell:** Single LINQ chain spanning 10+ lines — unreadable and hard to debug
**Fix:** Break into named intermediate variables for clarity
**Example:** Long LINQ → `var activeUsers = users.Where(u => u.IsActive);` then `var sorted = activeUsers.OrderBy(u => u.Name);`

### 12. Circular Project References
**Smell:** Project A references B which references A — prevents clean architecture
**Fix:** Extract shared types to a common project; depend on abstractions
**Example:** Introduce `*.Contracts` or `*.Abstractions` project for shared interfaces

### 13. Static Utility Classes
**Smell:** `static class StringHelper` accumulating unrelated methods
**Fix:** Use extension methods on relevant types; or inject as service with interface
**Example:** `StringHelper.Format(user)` → `user.ToDisplayFormat()` as extension method

### 14. Over-Parameterization
**Smell:** Method with 5+ parameters — hard to call correctly
**Fix:** Use parameter object (record/class), builder pattern, or options pattern
**Example:** `Create(name, age, email, role, active)` → `Create(new CreateUserRequest { ... })`

### 15. Bare Throw Outside Catch
**Smell:** `throw ex;` instead of `throw;` in catch block — loses original stack trace
**Fix:** Use `throw;` (without argument) to preserve stack trace
**Example:** `catch (Exception ex) { throw ex; }` → `catch (Exception ex) { throw; }`

## Idiomatic Refactorings

Version-gated — only suggest if project's C# version supports it:

### C# 12 (net8.0)
- Use primary constructors: `class UserService(IRepository repo)` instead of explicit constructor + field
- Use collection expressions: `int[] nums = [1, 2, 3];`
- Use `required` on constructor parameters for mandatory initialization

### C# 11 (net7.0)
- Use raw string literals for multi-line: `"""..."""` instead of `@"..."` with escaping
- Use file-scoped types: `file class InternalHelper` for implementation details
- Use list patterns: `if (list is [var first, .., var last])`

### C# 10 (net6.0)
- Use `required` modifier for mandatory properties: `public required string Name { get; init; }`
- Use global usings: `global using System.Collections.Generic;`
- Use file-scoped namespaces: `namespace MyApp;` instead of block syntax
- Use `const` string interpolation

### C# 9 (net5.0)
- Replace class DTOs → `record`: `record UserDto(string Name, int Age);`
- Use init-only properties: `public string Name { get; init; }`
- Use pattern matching enhancements: relational patterns `> 0 and < 100`
- Use top-level statements for simple programs

### General
- Replace manual null checks → null-conditional `?.` and null-coalescing `??`
- Replace `if/else` assignment → pattern matching `switch` expression
- Replace string interpolation → `$"Hello {name}"` instead of `string.Format`
- Replace `foreach` with side effects → LINQ for transformations
- Use `using` declaration (no braces) instead of `using` block for shorter scope

## Framework-Specific Patterns

### ASP.NET Core
- **Minimal API:** Use `app.MapGet()` for simple endpoints; group with `MapGroup()` for related routes
- **Middleware pipeline:** Order matters; authentication before authorization before endpoints
- **DI registration:** Use `builder.Services.AddScoped<IService, Service>()` — match lifetime to usage
- **Options pattern:** Use `IOptions<T>` / `IOptionsSnapshot<T>` for typed configuration binding
- **Exception handling:** Use `app.UseExceptionHandler()` for global error handling; return `ProblemDetails`

### Entity Framework Core
- **DbContext lifecycle:** Scoped per request in web apps; use `IDbContextFactory<T>` for background services
- **Migrations:** Use `dotnet ef migrations add` for schema changes; never modify generated migrations
- **Query optimization:** Use `AsNoTracking()` for read-only queries; `Include()` for eager loading
- **Change tracking:** Understand tracked vs untracked entities; use `Entry()` for explicit state management

### Blazor
- **Component lifecycle:** Understand `OnInitializedAsync`, `OnParametersSetAsync`, `OnAfterRenderAsync`
- **State management:** Use `cascading values` for shared state; Fluxor/Blazor-State for complex state
- **JS interop:** Minimize; use `IJSRuntime` only when native JS needed

## Testing

### Frameworks & Tools
- **xUnit** (preferred): `dotnet test` — modern, parallel by default, constructor injection for setup
- **NUnit:** `dotnet test` — mature, `[TestFixture]` class-based organization
- **MSTest:** `dotnet test` — Microsoft's test framework
- **Moq:** `Mock<IService>()` — popular mocking library
- **FluentAssertions:** `result.Should().BeEquivalentTo(expected)` — expressive assertions
- **Testcontainers:** Docker-based integration tests for databases
- **Bogus:** Fake data generation for test data

### Convention-Aware Testing Suggestions
- IF xUnit detected → suggest constructor injection for setup, `IAsyncLifetime` for async setup/teardown
- IF NUnit only → suggest keeping NUnit; note xUnit migration path for parallel execution
- IF ASP.NET Core → suggest `WebApplicationFactory<T>` for integration tests
- IF Entity Framework → suggest in-memory database for unit tests, Testcontainers for integration
- IF Blazor → suggest `bUnit` for component testing
- IF no test framework → suggest xUnit as default

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
