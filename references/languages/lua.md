# Lua Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `.luacheckrc` — PRIMARY (Luacheck static analyzer: globals, ignored warnings, std library)
2. `.luarc.json` — Lua Language Server config (diagnostics, workspace, runtime version)
3. `.stylua.toml` — StyLua formatter config (indent, column width, quote style)
4. `*.rockspec` — LuaRocks package spec (dependencies, Lua version constraint)
5. `.busted` — Busted test framework config (pattern, output handler)

### Convention Inference
- **Lua version:** Read `.luacheckrc` `std` field or rockspec `lua >= "5.x"` — gates bitwise ops, const, utf8
- **LuaJIT:** Check for `ffi` require, `.luacheckrc` `std = "luajit"` — gates FFI, table.new
- **Naming:** `snake_case` for functions/variables, `SCREAMING_SNAKE` for constants, `PascalCase` for classes/metatables
- **Module system:** Modern `return { ... }` table (standard) vs legacy `module()` (Lua 5.1 deprecated)
- **Formatting:** If `.stylua.toml` exists, read `indent_type`, `indent_width`, `column_width`
- **Globals policy:** Check `.luacheckrc` for `globals`/`read_globals` — strict = no unintended globals

### Framework Detection
Scan requires and directory structure:
- **LÖVE2D:** `main.lua` with `love.load`, `love.update`, `love.draw` callbacks + `conf.lua`
- **OpenResty:** `nginx.conf` with `*_by_lua_*` directives + `ngx.*` and `resty.*` module usage
- **Neovim plugin:** `lua/` + `plugin/` directories + `vim.api.*`, `vim.fn.*`, `vim.cmd` usage
- **Corona/Solar2D:** `main.lua` + `config.lua` + `build.settings` + `display.*` API
- **Defold:** `game.project` + `.script`/`.gui_script` files + `go.*`, `msg.*` modules
- **Lapis:** `nginx.conf` with Lapis + `models/`, `views/` directories + `lapis.*` modules
- **Tarantool:** `box.cfg` usage + `box.space.*` data operations

## Convention Rules

Rules applied in precedence order (first match wins):

1. `.luacheckrc` rules are AUTHORITATIVE — respect `std`, `globals`, disabled warnings
2. IF `.stylua.toml` exists THEN formatting is non-negotiable; respect indent and column width
3. ALL variables must be declared `local` unless explicitly intended as global — primary Lua antipattern
4. Module return style: `local M = {}; ... return M` — never `module()` (deprecated since 5.1)
5. IF Lua 5.4 THEN suggest `<const>`, `<close>`, generational GC
6. IF Lua 5.3 THEN suggest bitwise operators, integer division `//`, `utf8` library
7. IF Lua 5.2 THEN suggest `_ENV`, `goto`, no `setfenv`/`getfenv`
8. IF LuaJIT THEN suggest FFI for C bindings, `table.new` for preallocation
9. IF LÖVE2D detected THEN follow LÖVE callback patterns, resource management in `love.load`
10. IF Neovim detected THEN follow Neovim plugin conventions — `setup()` pattern, `vim.api`
11. Precedence: luacheckrc > stylua config > Lua version > framework conventions > PiL book

## Common Smells & Fixes

### 1. Global Variable Pollution
**Smell:** `function calc(x) result = x * 2; return result end` — implicit global `result` and `calc`
**Fix:** Declare everything `local` — variables, functions, module tables
**Example:** `function calc(x)` → `local function calc(x) local result = x * 2 ...`

### 2. Not Using local
**Smell:** Accessing global table for frequently used functions — performance hit on every call
**Fix:** Localize frequently used functions at module top: `local insert = table.insert`
**Example:** `table.insert(t, v)` in hot loop → `local insert = table.insert; insert(t, v)`

### 3. String Concatenation in Loops
**Smell:** `result = result .. str` in loop — O(n²) due to string immutability, new allocation per concat
**Fix:** Collect into table, join with `table.concat`
**Example:** `for ... result = result .. s end` → `parts[#parts+1] = s; ... table.concat(parts)`

### 4. Table as Namespace Abuse
**Smell:** `utils.math.string.helper = {}` — deeply nested namespaces, complexity for no benefit
**Fix:** Flat module structure; one table per module file
**Example:** `utils.math.string` → separate `math_utils.lua` returning flat table

### 5. Deeply Nested Callbacks
**Smell:** 4+ levels of callback nesting — hard to read, hard to debug, error handling scattered
**Fix:** Use coroutines for sequential async flow; or break into named functions
**Example:** `async_a(function() async_b(function() ... end) end)` → coroutine with `yield`

### 6. Not Using Metatables Properly
**Smell:** Manual `__index` assignment without `setmetatable` — incomplete OOP setup
**Fix:** Use `setmetatable({}, Class)` pattern with `Class.__index = Class`
**Example:** `obj.__index = obj` → `local Obj = {}; Obj.__index = Obj; setmetatable(instance, Obj)`

### 7. Magic Numbers
**Smell:** `if player.health < 20 then player.speed = player.speed * 0.5` — unexplained constants
**Fix:** Extract to named constants at module top
**Example:** `20` → `local LOW_HEALTH_THRESHOLD = 20`

### 8. Long Functions
**Smell:** Function with 80+ lines mixing validation, processing, formatting — hard to test
**Fix:** Extract into focused helper functions with single responsibility
**Example:** `process_turn()` 150 lines → `validate_move()`, `apply_move()`, `update_scores()`

### 9. Missing Nil Checks
**Smell:** `user.profile.name` — crashes with "attempt to index nil value" if profile is nil
**Fix:** Check each level for nil; use short-circuit `and` for safe navigation
**Example:** `user.profile.name` → `user and user.profile and user.profile.name`

### 10. No pcall for Error Handling
**Smell:** `json.decode(response)` — unprotected call, crashes on invalid input
**Fix:** Wrap with `pcall` or `xpcall` for recoverable errors
**Example:** `json.decode(s)` → `local ok, data = pcall(json.decode, s); if not ok then ...`

### 11. Module Pollution (Legacy module())
**Smell:** `module("mymod", package.seeall)` — deprecated, pollutes global namespace
**Fix:** Use modern module pattern: `local M = {}; ... return M`
**Example:** `module("x", package.seeall)` → `local M = {}; function M.foo() ... end; return M`

### 12. Inefficient Table Operations
**Smell:** Linear search in loop: `for i=1,#t do if t[i]==x then...` — O(n) per lookup
**Fix:** Build lookup set/map for O(1) access when searching repeatedly
**Example:** Loop search → `local set = {}; for _,v in ipairs(t) do set[v]=true end; if set[x] then...`

### 13. Coroutine Misuse
**Smell:** Coroutine that never yields — blocks cooperative scheduler, defeats purpose
**Fix:** Add `coroutine.yield()` at appropriate points in long-running coroutines
**Example:** `while true do heavy_work() end` → `while true do heavy_work(); coroutine.yield() end`

### 14. C-Style For Loops Instead of ipairs/pairs
**Smell:** `for i=1,#array do print(array[i]) end` — misses iterator benefits, off-by-one risk
**Fix:** Use `ipairs` for sequential arrays, `pairs` for hash tables
**Example:** `for i=1,#t do f(t[i]) end` → `for i,v in ipairs(t) do f(v) end`

### 15. Not Leveraging Multiple Return Values
**Smell:** Returning table/struct when multiple returns would be simpler and cheaper
**Fix:** Use Lua's multiple return values for simple function results
**Example:** `return {q=math.floor(a/b), r=a%b}` → `return math.floor(a/b), a%b`

## Idiomatic Refactorings

Version-gated — only suggest if project's Lua version supports it:

### Lua 5.4
- Use `<const>` for immutable locals: `local MAX <const> = 100` — compile-time constant
- Use `<close>` for to-be-closed variables: `local f <close> = io.open(...)` — auto-cleanup
- Use generational GC: `collectgarbage("generational")` for better performance with short-lived objects
- Use `warn()` function for runtime warnings

### Lua 5.3
- Use native bitwise operators: `&`, `|`, `~`, `<<`, `>>` (replaces `bit32` library)
- Use integer division: `10 // 3` instead of `math.floor(10/3)`
- Use `utf8` standard library for Unicode string operations
- Use integer subtype: integers and floats are distinct subtypes of number

### Lua 5.2
- Use `_ENV` for sandboxing: `local _ENV = {print=print}` — restricted environment
- Use `goto` for breaking out of nested loops: `goto continue; ::continue::`
- Use `table.pack`/`table.unpack` (renamed from `unpack`)
- Note: `setfenv`/`getfenv` removed — use `_ENV` instead

### LuaJIT
- Use FFI for C bindings: `ffi.cdef[[ int printf(const char*, ...); ]]` — zero-overhead C calls
- Use `table.new(narr, nrec)` for table preallocation — avoids rehashing
- Use `bit` library for bitwise operations (Lua 5.1 compatible)
- Avoid NYI (Not Yet Implemented) patterns that prevent JIT compilation

### General (all versions)
- Replace global functions → `local` declarations at module scope
- Replace string concat in loops → `table.concat` with intermediate table
- Replace `module()` → modern `local M = {}; return M` pattern
- Replace manual `__index` → `setmetatable({}, {__index = Base})` pattern
- Replace linear search → set lookup table for O(1) access
- Use `select('#', ...)` to count varargs (handles nil correctly)
- Use tail calls for recursive algorithms — Lua optimizes proper tail calls

## Framework-Specific Patterns

### LÖVE2D
- **Game loop:** Use `love.load()` for initialization, `love.update(dt)` for logic, `love.draw()` for rendering
- **Delta time:** Always multiply movement by `dt` in `update()` — frame-rate independent
- **Resource loading:** Load all assets in `love.load()` — not in `update()` or `draw()`
- **State management:** Use game state table/machine; switch states cleanly
- **Audio:** Use `"static"` source for short sounds, `"stream"` for music

### Neovim Plugin
- **setup() pattern:** `require("plugin").setup(opts)` — standard Neovim plugin entry point
- **API usage:** `vim.api.nvim_*` for buffer/window/autocommand operations
- **Keymaps:** `vim.keymap.set("n", "<leader>x", function() ... end)` for mappings
- **Autocommands:** `vim.api.nvim_create_autocmd("BufWritePre", { callback = ... })`
- **User commands:** `vim.api.nvim_create_user_command("MyCmd", function() ... end, {})`

### OpenResty
- **Phase handlers:** Use appropriate Lua phase directives (`access_by_lua_*`, `content_by_lua_*`)
- **Cosockets:** Use `ngx.socket.tcp()` for non-blocking I/O — never use LuaSocket in OpenResty
- **Shared dict:** Use `ngx.shared.DICT` for cross-worker shared state
- **Connection pooling:** Use `red:set_keepalive()` for Redis, `sock:setkeepalive()` for TCP
- **Logging:** Use `ngx.log(ngx.ERR, ...)` with appropriate log levels

## Testing

### Frameworks & Tools
- **Busted:** BDD-style — `describe("module", function() it("works", function() assert.are.equal(5, add(2,3)) end) end)`
- **LuaUnit:** xUnit-style — `function TestMod:test_add() lu.assertEquals(add(2,3), 5) end; os.exit(lu.LuaUnit.run())`
- **luassert:** Assertion library — `assert.are.equal(expected, actual)`, `assert.has_error(fn)`, custom matchers
- **Luacheck:** Static analysis — `luacheck .` — catches globals, unused vars, shadowing

### Convention-Aware Testing Suggestions
- IF Busted detected → use `describe`/`it` blocks with `before_each`/`after_each` for setup
- IF LuaUnit detected → use `TestClass:setUp()`/`tearDown()` for test isolation
- IF LÖVE2D → test game logic separately from LÖVE callbacks; mock `love.*` APIs
- IF Neovim → use `plenary.nvim` test harness for Neovim-specific testing
- IF OpenResty → use `Test::Nginx` (Perl) for HTTP-level testing of Lua handlers
- IF no test framework → suggest Busted (most popular, BDD-style, good reporting)

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
