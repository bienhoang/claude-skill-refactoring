# Go Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `.golangci.yml` / `.golangci.yaml` — PRIMARY linting (golangci-lint config with enabled linters, rules)
2. `go.mod` — Module definition, Go version directive, dependencies
3. `go.sum` — Dependency lock file (read-only; confirms dependency versions)
4. `Makefile` — Build/test targets; infer build conventions and common commands
5. `.github/workflows/*.yaml` — CI config; reveals test/build/lint commands used in pipeline

### Convention Inference
- **Go version:** Read `go.mod` `go` directive (e.g., `go 1.21`) — gates generics, slog, range-over-int
- **Lint sophistication:** Presence of `.golangci.yml` = sophisticated linting; absence = basic `go vet` only
- **Package naming:** Lowercase, no underscores — strict Go convention, non-negotiable
- **Naming style:** `camelCase` for unexported, `PascalCase` for exported symbols
- **Error handling:** Scan ~5 functions for `if err != nil { return err }` pattern consistency
- **Interface naming:** Check for verb+"er" suffix convention (Reader, Writer, Handler)
- **Receiver naming:** Scan methods for single letter (`r`, `c`) vs short identifier style
- **Project layout:** Check for `cmd/`, `internal/`, `pkg/` directories (standard Go project layout)

### Framework Detection
Check `go.mod` `require` block + scan imports in `main.go` or `cmd/` directory:
- **Gin:** `github.com/gin-gonic/gin` — `gin.New()`, `engine.GET()` route handlers
- **Echo:** `github.com/labstack/echo` — `echo.New()`, `e.GET()` handlers
- **Fiber:** `github.com/gofiber/fiber` — `fiber.New()`, fasthttp-based
- **chi:** `github.com/go-chi/chi` — `chi.NewMux()`, `mux.Route()` middleware chaining
- **GORM:** `gorm.io/gorm` — `db.Model(&User{})`, chainable query API
- **sqlx:** `github.com/jmoiron/sqlx` — Named queries, struct scanning
- **database/sql:** Standard library — `sql.Open()`, `rows.Scan()` pattern

## Convention Rules

Rules applied in precedence order (first match wins):

1. Go naming conventions are NON-NEGOTIABLE — lowercase packages, PascalCase exports, camelCase unexported
2. IF `.golangci.yml` has specific linters enabled THEN align suggestions with those linter rules
3. IF `go` directive < 1.18 THEN never suggest generics
4. IF `go` directive < 1.21 THEN never suggest range-over-int or `slog` stdlib logging
5. IF `go` directive < 1.13 THEN never suggest error wrapping with `%w`
6. IF `internal/` directory exists THEN respect internal package boundaries in refactoring suggestions
7. IF Gin/Echo/Fiber detected THEN apply framework-specific middleware and handler patterns
8. IF GORM detected THEN apply ORM-specific query and transaction patterns
9. Precedence: Go language spec conventions > golangci-lint config > project structure inference

## Common Smells & Fixes

### 1. Ignoring Errors
**Smell:** `result, _ := functionCall()` without documentation of why error is ignored
**Fix:** Handle the error, log it, or document with `//nolint:errcheck` if intentional
**Example:** `data, _ := ioutil.ReadAll(r)` → `data, err := io.ReadAll(r); if err != nil { return fmt.Errorf("read body: %w", err) }`

### 2. Package-Level Variables
**Smell:** Mutable state at package scope modified by multiple functions
**Fix:** Pass as function parameters or encapsulate in struct fields
**Example:** `var db *sql.DB` at package level → `type App struct { db *sql.DB }` with constructor

### 3. Fat Interface
**Smell:** Interface with 5+ methods when consumers only use 1-2
**Fix:** Define interfaces at the consumer side with only needed methods
**Example:** `type Service interface { Create(); Read(); Update(); Delete(); List(); Count() }` → `type Reader interface { Read() }` at consumer

### 4. init() Side Effects
**Smell:** Complex initialization in `init()` — DB connections, HTTP calls, file I/O
**Fix:** Move to explicit initialization called from `main()` or constructor functions
**Example:** `func init() { db, _ = sql.Open(...) }` → `func NewApp() (*App, error) { db, err := sql.Open(...) }`

### 5. Sentinel Error String Matching
**Smell:** `if err.Error() == "not found"` — fragile string comparison
**Fix:** Use typed errors with `errors.Is()` or `errors.As()`
**Example:** String matching → `var ErrNotFound = errors.New("not found")` + `if errors.Is(err, ErrNotFound)`

### 6. Nil Pointer Dereference
**Smell:** No nil checks before accessing pointer fields — runtime panic
**Fix:** Check for nil before dereferencing; use zero-value defaults
**Example:** `user.Address.City` → `if user != nil && user.Address != nil { city = user.Address.City }`

### 7. Goroutine Leaks
**Smell:** Goroutines spawned without cancellation mechanism — unbounded memory growth
**Fix:** Use `context.Context` with cancellation; pass to goroutines
**Example:** `go process(data)` → `go func() { select { case <-ctx.Done(): return; default: process(data) } }()`

### 8. Defer in Loop
**Smell:** `defer close(resource)` inside loop — defers accumulate until function returns
**Fix:** Extract loop body into separate function, or close explicitly
**Example:** `for _, f := range files { r, _ := os.Open(f); defer r.Close() }` → extract to `processFile(f)` with defer inside

### 9. Unsafe Type Assertion
**Smell:** `x := val.(Type)` without ok check — panics if wrong type
**Fix:** Use 2-value assertion: `x, ok := val.(Type)`
**Example:** `s := v.(string)` → `s, ok := v.(string); if !ok { return fmt.Errorf("expected string, got %T", v) }`

### 10. Bare panic() in Library Code
**Smell:** `panic()` in library functions — unrecoverable for callers
**Fix:** Return `error` instead; let callers decide how to handle
**Example:** `panic("invalid input")` → `return fmt.Errorf("invalid input: %s", input)`

### 11. God Struct
**Smell:** Struct with 20+ fields mixing unrelated concerns
**Fix:** Break into smaller, cohesive structs with composition (embedding)
**Example:** `type App struct { /* 25 fields */ }` → `type App struct { Server; DB; Config }`

### 12. String Constants Without Types
**Smell:** Untyped string constants for enums — no compile-time safety
**Fix:** Use `iota` with typed constants
**Example:** `const StatusActive = "active"` → `type Status int; const (Active Status = iota; Inactive)`

### 13. Pointer vs Value Return Inconsistency
**Smell:** Mixing `(*T, error)` and `(T, error)` return patterns inconsistently
**Fix:** Use pointer returns for large structs or when nil is meaningful; value for small types
**Example:** Establish consistent pattern within package

### 14. Shadowed Variables
**Smell:** Inner scope var with same name as outer — especially `err` in nested ifs
**Fix:** Use different names or restructure to avoid shadowing
**Example:** `err := outer(); if x { err := inner() }` → `err := outer(); if x { innerErr := inner() }`

### 15. Silent Failures Without Logging
**Smell:** Errors handled but not logged — impossible to debug in production
**Fix:** Add structured logging (slog, zap, logrus) at error boundaries
**Example:** `if err != nil { return err }` → `if err != nil { slog.Error("process failed", "err", err); return err }`

## Idiomatic Refactorings

Version-gated — only suggest if project's Go version supports it:

### Go 1.21+
- Use `range` over integers: `for i := range 10` instead of `for i := 0; i < 10; i++`
- Use `slog` (structured logging stdlib) instead of third-party loggers
- Use `slices` and `maps` packages for common operations

### Go 1.20+
- Use `comparable` constraint in generic functions
- Use `errors.Join()` for combining multiple errors

### Go 1.18+
- Replace interface{} → `any` type alias
- Use generics for type-safe utility functions (min, max, contains, filter)
- Use fuzzing in tests: `func FuzzXxx(f *testing.F)`

### Go 1.16+
- Use `//go:embed` for embedding static files into binary
- Use `io.ReadAll()` instead of deprecated `ioutil.ReadAll()`

### Go 1.13+
- Use error wrapping with `fmt.Errorf("context: %w", err)`
- Use `errors.Is()` and `errors.As()` for error chain inspection

### General (all versions)
- Replace large interface → break into 1-2 method interfaces (Interface Segregation)
- Replace type switch → interface with method per type
- Replace shared mutable state → channels or `sync.Mutex`
- Replace god struct → smaller structs with embedding (composition)
- Replace string keys → typed constants with `iota`
- Use table-driven tests for all test functions
- Use `context.Context` as first parameter for cancellation/timeouts

## Framework-Specific Patterns

### Gin / Echo / Fiber
- **Middleware patterns:** Chain middleware with `Use()`; keep each middleware focused on single responsibility
- **Error handling middleware:** Centralize error responses in recovery/error middleware
- **Request validation:** Use binding tags (`binding:"required"`) or dedicated validator middleware
- **Route grouping:** Group by API version or domain; apply auth middleware per group
- **Graceful shutdown:** Handle `os.Signal` for clean server shutdown with `context` timeout

### GORM
- **Preloading:** Use `Preload()` to avoid N+1 queries; `Joins()` for inner join preload
- **Transaction patterns:** Use `db.Transaction(func(tx *gorm.DB) error { ... })` for atomic operations
- **Migration:** Use `AutoMigrate()` in dev; version-controlled SQL migrations in production
- **Hooks:** Use `BeforeCreate`, `AfterUpdate` hooks sparingly — prefer explicit service calls

### Standard Library (net/http)
- **Handler pattern:** Use `http.HandlerFunc` or implement `http.Handler` interface
- **Middleware chaining:** Wrap handlers: `func middleware(next http.Handler) http.Handler`
- **Context usage:** Extract request-scoped values from `r.Context()`
- **Structured responses:** Create `respondJSON()` helper for consistent API responses

## Testing

### Frameworks & Tools
- **testing** (standard library): `func TestXxx(t *testing.T)` — run with `go test ./... -v`
- **testify:** `assert.Equal(t, expected, actual)`, `require.NoError(t, err)` for cleaner assertions
- **gomock:** `mockgen` for interface mock generation
- **testify/mock:** Manual mock structs implementing interfaces
- **go test -coverprofile:** `go test -coverprofile=coverage.out ./...` then `go tool cover -html=coverage.out`
- **httptest:** `httptest.NewRecorder()` and `httptest.NewServer()` for HTTP handler testing

### Convention-Aware Testing Suggestions
- Table-driven tests are STRONGLY preferred in Go — suggest for all new test functions
- IF testify detected → use `assert`/`require` patterns; suggest `suite` for test lifecycle
- IF gomock detected → use `mockgen` for interface mocks; keep mock generation in `//go:generate`
- IF no assertion library → suggest testify for cleaner test code; stdlib `testing` is acceptable
- IF Gin/Echo → suggest `httptest` with framework-specific test helpers
- IF GORM → suggest test database with transactions rolled back per test

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
