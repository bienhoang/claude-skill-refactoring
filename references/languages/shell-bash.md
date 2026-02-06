# Shell/Bash Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `.shellcheckrc` — PRIMARY (ShellCheck linting config, disabled rules, shell dialect)
2. `.editorconfig` — Shell section with indent_style, indent_size, end_of_line
3. `.shfmt.yaml` / `shfmt.toml` — shfmt formatter config (indent, binary_next_line, space_redirects)
4. Shebang line in script — `#!/bin/bash`, `#!/bin/sh`, `#!/usr/bin/env bash` determines shell type

### Convention Inference
- **Shell type:** Read shebang — `bash` (most common), `sh` (POSIX portable), `zsh` (macOS default)
- **Bash version:** Check for Bash 4+ features (associative arrays, `${var,,}`, `readarray`) vs Bash 5+ (`wait -p`)
- **ShellCheck usage:** Presence of `.shellcheckrc` or `# shellcheck` directives = sophisticated linting
- **shfmt style:** Read indent (tabs/2/4), binary_next_line, switch_case_indent, function_next_line
- **Safety flags:** Scan script header for `set -euo pipefail` — indicates defensive coding style
- **Function style:** `name() { }` (POSIX) vs `function name { }` (bash keyword) — detect from existing code
- **Variable naming:** `lowercase_snake` for locals, `UPPERCASE_SNAKE` for constants/env vars

### Framework Detection
Check test directory and project structure:
- **Bats:** `test/*.bats` files — Bash Automated Testing System, `@test` blocks
- **shellspec:** `spec/*_spec.sh` files — BDD-style shell testing
- **shunit2:** `tests/*_test.sh` with `. shunit2` — xUnit-style shell testing

## Convention Rules

Rules applied in precedence order (first match wins):

1. Shebang determines shell dialect — NEVER suggest bashisms in `#!/bin/sh` scripts
2. IF `.shellcheckrc` exists THEN respect enabled/disabled rules; suggest fixes aligned with config
3. IF `set -euo pipefail` present THEN maintain strict error handling throughout
4. ALL variable expansions must be quoted: `"$var"`, `"$(cmd)"`, `"${array[@]}"`
5. ALL functions must declare `local` for internal variables — prevent global pollution
6. IF Bash 4+ THEN associative arrays, `${var,,}`, `readarray` available
7. IF Bash 5+ THEN `wait -p`, improved `nameref` available
8. IF POSIX sh THEN only POSIX features: `[ ]` not `[[ ]]`, no arrays, no `local` (use functions)
9. Error handling: check exit codes after critical commands (`cd`, `rm`, file operations)
10. Precedence: Shebang > ShellCheck config > shfmt config > safety flags > community practice

## Common Smells & Fixes

### 1. Unquoted Variables
**Smell:** `echo $file` — word splitting and glob expansion on spaces/wildcards
**Fix:** Quote all variable expansions: `"$var"`, `"${var}"`, `"$(command)"`
**Example:** `rm $files` → `rm "$files"` or `rm "${files[@]}"`

### 2. Missing Safety Flags
**Smell:** Script without `set -euo pipefail` — silent failures, undefined variables used
**Fix:** Add `set -euo pipefail` after shebang (bash) or `set -eu` (POSIX sh)
**Example:** Missing → `#!/bin/bash` + `set -euo pipefail` on line 2

### 3. Dangerous eval Usage
**Smell:** `eval "$user_input"` — command injection vulnerability
**Fix:** Avoid eval entirely; use arrays for dynamic command construction
**Example:** `eval "rm $files"` → `files=("file1" "file2"); rm "${files[@]}"`

### 4. Parsing ls Output
**Smell:** `for file in $(ls *.txt)` — breaks on spaces, special chars, newlines
**Fix:** Use glob patterns directly; use `find` with `-print0`/`-exec` for complex searches
**Example:** `for f in $(ls *.txt)` → `for f in *.txt; do [[ -e "$f" ]] || continue; ...`

### 5. Useless Use of cat
**Smell:** `cat file | grep pattern` — unnecessary process, wasted pipe
**Fix:** Pass file as argument to consuming command; use input redirection
**Example:** `cat file | grep pattern` → `grep pattern file`

### 6. Command Injection Risk
**Smell:** `curl $url` with unvalidated user input — argument injection
**Fix:** Quote and validate input; use `--` to separate options from arguments
**Example:** `curl $url` → `[[ "$url" =~ ^https?:// ]] && curl -- "$url"`

### 7. Not Using local in Functions
**Smell:** `result="value"` in function — pollutes global namespace, variable collisions
**Fix:** Declare all function variables with `local`
**Example:** `my_func() { result="x"; }` → `my_func() { local result="x"; }`

### 8. Hardcoded Paths
**Smell:** `cd /home/user/project` — breaks on other machines, not configurable
**Fix:** Use variables with defaults: `${VAR:-default}` or `${VAR:?error}`
**Example:** `/var/log/app.log` → `"${LOG_DIR:-/var/log}/app.log"`

### 9. Missing Error Handling
**Smell:** `cd "$dir"; rm -rf *` — catastrophic if `cd` fails, deletes wrong directory
**Fix:** Check exit code after critical commands with `|| exit 1` or `|| die`
**Example:** `cd "$dir"` → `cd "$dir" || { echo "Failed to cd" >&2; exit 1; }`

### 10. Bashisms in sh Scripts
**Smell:** `[[ ]]`, arrays, `local` in `#!/bin/sh` script — not POSIX, breaks on dash/ash
**Fix:** Use POSIX equivalents: `[ ]` for tests, positional params for lists
**Example:** `[[ $x == "val" ]]` → `[ "$x" = "val" ]`

### 11. Not Using Arrays for Lists
**Smell:** `files="file1 file2 file with spaces"` — breaks on spaces
**Fix:** Use bash arrays with proper quoting
**Example:** `files="a b c"; rm $files` → `files=("a" "b" "c"); rm "${files[@]}"`

### 12. cd Without Error Check
**Smell:** `cd /important/dir; rm -rf *` — deletes current directory contents if cd fails
**Fix:** Always check cd exit code; use subshell for temporary directory changes
**Example:** `cd dir; rm *` → `cd dir || exit 1; rm *` or `(cd dir && rm *)`

### 13. Temporary Files Without mktemp
**Smell:** `tmpfile="/tmp/myapp.$$"` — predictable name, race condition, security risk
**Fix:** Use `mktemp` with trap for cleanup
**Example:** `echo > /tmp/app.$$` → `tmpfile=$(mktemp); trap 'rm -f "$tmpfile"' EXIT`

### 14. Missing ShellCheck Directives
**Smell:** Intentional word splitting without documentation — ShellCheck warns, intent unclear
**Fix:** Add `# shellcheck disable=SCXXXX` with explanation for intentional patterns
**Example:** `cmd $options` → `# shellcheck disable=SC2086 # Intentional word splitting` + `cmd $options`

### 15. Excessive Subshell Spawning
**Smell:** `var=$(cat file | grep pat | awk '{print $1}')` — 3 processes for one task
**Fix:** Combine into single command; use shell built-ins where possible
**Example:** `cat file | grep pat | awk '{print $1}'` → `awk '/pat/ {print $1}' file`

## Idiomatic Refactorings

Version-gated — only suggest if script's shell/version supports it:

### Bash 5+
- Use `wait -p` to get PID of completed background job
- Use improved `nameref` (`declare -n ref=var`) for indirect variable access
- Use negative array indices: `${array[-1]}` for last element

### Bash 4+
- Use associative arrays: `declare -A map; map[key]=value`
- Use case modification: `${var^^}` (uppercase), `${var,,}` (lowercase)
- Use `readarray -t lines < file` instead of while-read loop for reading file into array
- Use `**` globstar for recursive globbing (with `shopt -s globstar`)

### POSIX sh
- Use parameter expansion for string operations: `${var#prefix}`, `${var%suffix}`
- Use `case` for pattern matching: `case "$str" in *pattern*) ... ;; esac`
- Use command grouping with `{ }` for redirection: `{ cmd1; cmd2; } > output`
- Use `$(command)` over backticks for command substitution

### General (all versions)
- Use `trap cleanup EXIT` for guaranteed cleanup on exit/error
- Use `die()` helper function for consistent error messages and exit
- Use `log()` function with levels for structured logging to stderr
- Use getopts for standard argument parsing: `while getopts "vo:h" opt; do ... done`
- Use heredocs for multi-line strings: `cat <<'EOF' ... EOF`
- Use `command -v` instead of `which` for portable command detection

## Framework-Specific Patterns

(Shell scripts don't have frameworks, but common structural patterns apply)

### Argument Parsing
- **getopts:** Standard POSIX option parsing — `while getopts "vo:h" opt; do case "$opt" in ...`
- **Long options:** Manual parsing with `case "$1" in --verbose) ... ;;` loop
- **Validation:** Check required arguments early; print usage on error

### Cleanup Traps
- **EXIT trap:** `trap cleanup EXIT` — guaranteed cleanup on normal/error exit
- **Signal handling:** `trap 'exit 130' INT` (Ctrl-C), `trap 'exit 143' TERM` (kill)
- **Multiple cleanup:** Chain functions: `trap 'cleanup_temp; cleanup_locks' EXIT`

### Structured Logging
- **Log levels:** Define constants `LOG_ERROR=0`, `LOG_INFO=2`, `LOG_DEBUG=3`
- **Log function:** `log() { printf '[%s] [%s] %s\n' "$(date -Iseconds)" "$1" "$2" >&2; }`
- **Helper functions:** `error()`, `warn()`, `info()`, `debug()` wrapping `log()`

## Testing

### Frameworks & Tools
- **Bats:** `@test "description" { run my_func; assert_success; assert_output "expected"; }` — most popular
- **shellspec:** BDD-style — `Describe 'func'; It 'works'; When call func; The output should eq "x"; End`
- **shunit2:** xUnit-style — `testMyFunc() { result=$(my_func); assertEquals "expected" "$result"; }`
- **ShellCheck:** Static analysis — `shellcheck script.sh` for finding bugs before runtime

### Convention-Aware Testing Suggestions
- IF Bats detected → use `bats-assert` and `bats-support` helper libraries
- IF shellspec detected → use `Include` for sourcing scripts, `Mock` for mocking commands
- IF shunit2 detected → use `setUp`/`tearDown` for test isolation
- IF no test framework → suggest Bats (most popular, active community)
- Always suggest ShellCheck in CI pipeline — catches most common shell script bugs
- Use `mktemp -d` in test setup, `rm -rf` in teardown for test isolation

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
