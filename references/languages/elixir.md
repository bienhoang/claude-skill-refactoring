# Elixir Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `mix.exs` — PRIMARY (Elixir version, OTP version, dependencies, project config)
2. `.formatter.exs` — Code formatting rules (line_length, import_deps, inputs)
3. `.credo.exs` — Static analysis config (Credo checks, priority levels)
4. `config/config.exs` — Compile-time configuration
5. `config/runtime.exs` — Runtime configuration (Elixir 1.11+)

### Convention Inference
- **Elixir version:** Read `mix.exs` `elixir:` constraint — gates `dbg`, `then`, `tap`, duration sigils
- **OTP version:** Check `.tool-versions` or `mix.exs` for OTP constraint — gates OTP-specific features
- **Naming:** Modules `PascalCase`, functions/variables `snake_case`, atoms `:lowercase_snake` — enforced by community
- **Private functions:** `defp` keyword; convention to prefix helpers with `do_` for clarity
- **Pipe style:** Scan code for multi-line pipes (standard) vs inline pipes (rare)
- **Formatting:** If `.formatter.exs` exists, read `line_length`, `import_deps`, `inputs`
- **Credo strictness:** If `.credo.exs` exists, check enabled checks and priority threshold

### Framework Detection
Check `mix.exs` `deps` function:
- **Phoenix:** `{:phoenix, "~> 1.7"}` — MVC, contexts, router, controllers, LiveView
- **Phoenix LiveView:** `{:phoenix_live_view, "~> 1.0"}` — server-rendered reactive UI
- **Ecto:** `{:ecto_sql, "~> 3.x"}` — database wrapper, changesets, migrations, Repo
- **Absinthe:** `{:absinthe, "~> 1.7"}` — GraphQL schema, resolvers, middleware
- **Oban:** `{:oban, "~> 2.x"}` — background job processing with PostgreSQL
- **Nerves:** `{:nerves, "~> 1.x"}` — embedded systems, firmware deployment
- **Broadway:** `{:broadway, "~> 1.0"}` — data processing pipelines, message queues

## Convention Rules

Rules applied in precedence order (first match wins):

1. `.formatter.exs` formatting is AUTHORITATIVE — `mix format` output is non-negotiable
2. IF `.credo.exs` has specific checks enabled THEN align suggestions with those checks
3. IF Elixir version `>=1.17` THEN suggest duration sigils, improved function captures
4. IF Elixir version `>=1.14` THEN suggest `dbg()` for debugging instead of `IO.inspect`
5. IF Elixir version `>=1.12` THEN suggest `then/2` and `tap/2` for pipe chains
6. IF Phoenix detected THEN follow context-based architecture — no business logic in controllers
7. IF Ecto detected THEN changesets in schema modules, composable queries
8. IF OTP patterns detected (GenServer, Supervisor) THEN validate supervision tree structure
9. Pattern matching is PREFERRED over conditional logic — use multi-clause functions
10. Precedence: formatter.exs > Credo config > Elixir version > framework conventions > community guide

## Common Smells & Fixes

### 1. Nested case/cond
**Smell:** 3+ levels of nested `case` statements — pyramid of doom
**Fix:** Use `with` statement for sequential pattern matching with early exit
**Example:** `case a do {:ok, x} -> case b(x) do ... end end` → `with {:ok, x} <- a, {:ok, y} <- b(x), do: y`

### 2. Long Pipe Chains Without Named Functions
**Smell:** Pipes with inline anonymous functions — hard to read, hard to test
**Fix:** Extract anonymous functions into named private functions
**Example:** `|> Enum.map(fn x -> x * 2 end)` → `|> double_values()` with `defp double_values(list), do: ...`

### 3. God Module
**Smell:** Single module with 50+ public functions mixing unrelated concerns
**Fix:** Split into Phoenix contexts or focused modules by responsibility
**Example:** `UserHelpers` with everything → `Accounts` context, `Auth` module, `UserNotifier`

### 4. Rescue Without Specific Exception
**Smell:** `rescue _ -> nil` — catches everything, hides bugs silently
**Fix:** Rescue specific exception types; let unexpected errors crash (let it crash philosophy)
**Example:** `rescue _ -> nil` → `rescue Ecto.NoResultsError -> nil`

### 5. Not Using Pattern Matching
**Smell:** `if Tuple.to_list(result) |> hd() == :ok` — verbose, un-idiomatic
**Fix:** Use multi-clause function heads with pattern matching
**Example:** `if elem(result, 0) == :ok` → `def handle({:ok, val}), do: val`

### 6. String Concatenation in Loops
**Smell:** `acc <> format_row(row)` in `Enum.reduce` — O(n²) string allocation
**Fix:** Use IO lists and `IO.iodata_to_binary/1` for efficient string building
**Example:** `acc <> str` in loop → `Enum.map(&format/1) |> IO.iodata_to_binary()`

### 7. Improper GenServer State
**Smell:** GenServer state grows unbounded — no eviction, no size limit
**Fix:** Add TTL/max-size constraints; consider ETS for large caches
**Example:** `Map.put(state, key, val)` unbounded → add `evict_if_needed/1` with max size

### 8. Missing Supervision Trees
**Smell:** `MyApp.Worker.start_link()` without supervisor — no restart on crash
**Fix:** Add workers as children under `Supervisor` with appropriate restart strategy
**Example:** Direct `start_link()` → `children = [{MyApp.Worker, []}]` under supervisor

### 9. Hardcoded Config
**Smell:** `def api_url, do: "https://api.example.com"` — not configurable per environment
**Fix:** Use `config/runtime.exs` with `Application.fetch_env!/2`
**Example:** Hardcoded string → `Application.fetch_env!(:my_app, :api_url)` with runtime.exs

### 10. Bare Raise
**Smell:** `raise "Invalid data"` — generic RuntimeError, no structured information
**Fix:** Define custom exception modules with `defexception` and specific fields
**Example:** `raise "Invalid"` → `raise MyApp.ValidationError, message: "Invalid", field: :email`

### 11. Unused Variables Without Underscore
**Smell:** `def handle_event("save", params, socket)` with params unused — compiler warning
**Fix:** Prefix unused variables with underscore `_params`
**Example:** `params` unused → `_params`

### 12. Complex With Statements
**Smell:** `with` block with 8+ clauses mixing critical and side-effect operations
**Fix:** Separate main logic from side effects; keep `with` focused on critical path
**Example:** Email/logging in `with` → move side effects after `with` block, use `Task.start`

### 13. Atom Exhaustion from User Input
**Smell:** `String.to_atom(user_input)` — atoms never garbage collected, DoS vulnerability
**Fix:** Use `String.to_existing_atom/1` or keep as strings
**Example:** `String.to_atom(input)` → `String.to_existing_atom(input)` with rescue, or keep as string

### 14. Blocking in GenServer Callbacks
**Smell:** HTTP call inside `handle_call` — blocks GenServer for all clients
**Fix:** Delegate to `Task.Supervisor` with `GenServer.reply/2` for async responses
**Example:** `HTTPoison.get!()` in handle_call → `Task.Supervisor.start_child` + `GenServer.reply`

### 15. Mutable-Thinking Patterns
**Smell:** Attempting to modify data in-place — `user.score = x` (not possible in Elixir)
**Fix:** Use `%{struct | field: new_value}` update syntax or `Map.put/3`
**Example:** Imperative mutation → `Enum.map(users, &%{&1 | score: &1.score + 10})`

## Idiomatic Refactorings

Version-gated — only suggest if project's Elixir version supports it:

### Elixir 1.17+
- Use duration sigils: `~t(5s)` instead of `5_000` for timeouts
- Improved function captures with pattern matching in `&` syntax

### Elixir 1.14+
- Use `dbg/1` instead of `IO.inspect/2` for debugging — shows expression + value
- Use `dbg()` in pipe chains for better debugging workflow

### Elixir 1.12+
- Use `then/2` for intermediate pipe transformations: `data |> fetch() |> then(&process/1)`
- Use `tap/2` for side effects in pipes: `data |> tap(&Logger.info/1) |> process()`

### General (all versions)
- Use multi-clause functions instead of `if`/`case` for dispatch
- Use `Enum.reduce_while/3` for early exit from reductions
- Use `Access` behavior for deep nested updates: `put_in(user, [:profile, :name], "new")`
- Use `with` for sequential pattern matching (replace nested case)
- Use IO lists for string building — `[header, "\n", body]` is O(1) append
- Use `Stream` for lazy evaluation of large datasets
- Use protocols for polymorphism instead of pattern matching on types

## Framework-Specific Patterns

### Phoenix Contexts
- **Rich contexts:** Business logic in context modules, not controllers — `Accounts.register_user/1`
- **Controller simplicity:** Controllers only handle HTTP concerns — params, responses, routing
- **Separation:** Each context owns its schemas, queries, and business rules

### Phoenix LiveView
- **assign_new/3:** Use for expensive computations only needed on initial mount
- **Event handling:** Pattern match on event names in `handle_event/3`
- **Temporary assigns:** Use `temporary_assigns:` for large lists to reduce memory
- **Streams:** Use LiveView streams for efficient list rendering

### Ecto
- **Changesets:** Define in schema modules; separate changesets for different operations (create, update)
- **Composable queries:** Build queries with pipe chains — `base_query() |> filter_active() |> Repo.all()`
- **Fragments:** Use `fragment/1` for database-specific operations
- **Multi:** Use `Ecto.Multi` for transactional operations across multiple schemas

## Testing

### Frameworks & Tools
- **ExUnit:** Built-in — `describe "function/1" do test "does x" do ... end end` — run with `mix test`
- **Mox:** Behavior-based mocks — `Mox.defmock(EmailMock, for: EmailBehaviour)` — verify with `verify_on_exit!`
- **StreamData:** Property-based testing — `check all data <- binary() do assert ... end`
- **Wallaby:** Browser testing — `visit("/login") |> fill_in(Query.text_field("Email"), with: ...)`
- **ExMachina:** Factory library — `build(:user)`, `insert(:user)` for test data
- **Floki:** HTML parsing for testing rendered content

### Convention-Aware Testing Suggestions
- IF Phoenix → use `ConnTest` helpers, `DataCase` for Ecto tests, `ChannelCase` for channels
- IF LiveView → use `live/2`, `render_click/2`, `render_submit/2` for interaction testing
- IF Ecto → use sandbox for isolated database tests; `Repo.checkout` for async
- IF Oban → use `Oban.Testing` for asserting job enqueue behavior
- IF no test structure → suggest `test/` directory mirroring `lib/` with `_test.exs` suffix
- Property testing (StreamData) recommended for encoders, parsers, validation logic

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
