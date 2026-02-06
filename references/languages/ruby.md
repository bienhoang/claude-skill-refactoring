# Ruby Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `Gemfile` — PRIMARY (gem dependencies, Ruby version constraint, RuboCop/StandardRB presence)
2. `.rubocop.yml` — RuboCop linting config (enabled cops, metrics, exclusions)
3. `.standard.yml` — StandardRB config (opinionated subset of RuboCop; overrides .rubocop.yml)
4. `.ruby-version` — Ruby version targeting (rbenv/asdf)
5. `Rakefile` — Build tasks; presence indicates project automation patterns

### Convention Inference
- **Ruby version:** Read `.ruby-version` or Gemfile `ruby '3.2.0'` constraint — gates pattern matching, ractors
- **Naming:** `snake_case` methods/variables, `PascalCase` classes/modules — near-universal in Ruby
- **Predicate methods:** Scan for `?` suffix on boolean methods (Ruby convention)
- **Mutating methods:** Scan for `!` suffix on destructive methods
- **Indentation:** 2 spaces (Ruby standard); verify from .rubocop.yml or scan files
- **String style:** Check for single vs double quotes preference (RuboCop `Style/StringLiterals`)
- **Frozen string literals:** Check for `# frozen_string_literal: true` magic comment

### Framework Detection
Check Gemfile gems + directory structure:
- **Rails:** `rails` gem + `config/routes.rb` + `app/controllers/` + `db/schema.rb`
- **Sinatra:** `sinatra` gem + no `app/` structure + single-file or modular app
- **Hanami:** `hanami` gem + `slices/` directory structure
- **RSpec:** `rspec` gem + `spec/` directory + `spec_helper.rb`

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `.rubocop.yml` present THEN use its enabled cops and metric thresholds as authoritative
2. IF `.standard.yml` present THEN StandardRB formatting is non-negotiable (subset of RuboCop)
3. IF Ruby version >= 3.0 THEN suggest pattern matching (`case/in`); enable frozen string literals
4. IF Ruby version >= 2.7 THEN keyword argument separation enforced
5. IF Ruby version < 3.0 THEN no pattern matching; use traditional `case/when`
6. IF Rails project THEN follow Rails conventions (RESTful routes, concerns, ActiveRecord patterns)
7. Ruby naming conventions (`snake_case`, `?`/`!` suffixes) are community-enforced — flag deviations
8. IF `# frozen_string_literal: true` found in >50% of files THEN enforce in all new files
9. Precedence: .rubocop.yml/.standard.yml > Gemfile version > Rails conventions > code inference

## Common Smells & Fixes

### 1. Long Parameter Lists
**Smell:** Method with 5+ parameters — hard to call correctly
**Fix:** Use keyword arguments, parameter object (Struct/Data), or builder pattern
**Example:** `def create(name, age, email, role, active)` → `def create(name:, age:, email:, role:, active: true)`

### 2. Missing ? on Predicate Methods
**Smell:** Boolean-returning method without `?` suffix — violates Ruby convention
**Fix:** Add `?` suffix to all methods returning true/false
**Example:** `def valid` → `def valid?`

### 3. attr_accessor When attr_reader Suffices
**Smell:** `attr_accessor` exposing writer when only reader is needed — leaky encapsulation
**Fix:** Use `attr_reader`; add explicit setter only if external mutation required
**Example:** `attr_accessor :name` → `attr_reader :name` with `initialize` setting `@name`

### 4. Mutable Default Arguments
**Smell:** `def process(items = [])` — shared mutable state across calls
**Fix:** Use `nil` default with conditional initialization
**Example:** `def f(opts = {})` → `def f(opts = nil); opts = opts || {}; end` or use `.freeze`

### 5. Bare Rescue
**Smell:** `rescue` without exception class — catches `StandardError` silently
**Fix:** Rescue specific exceptions; log or re-raise
**Example:** `rescue => e` → `rescue ActiveRecord::RecordNotFound => e`

### 6. God Class
**Smell:** Class with 300+ LOC or 10+ public methods mixing responsibilities
**Fix:** Extract into service objects, form objects, or query objects
**Example:** Fat `User` model → `UserRegistrationService`, `UserQuery`, `UserPresenter`

### 7. Too Many Instance Variables
**Smell:** Class with 7+ instance variables — trying to do too much
**Fix:** Extract related variables into separate objects
**Example:** `@name, @email, @street, @city, @zip, @phone, @fax, @company` → extract `Address`, `ContactInfo`

### 8. Duplicate Code in Controllers/Models
**Smell:** Same logic repeated across multiple controllers or models
**Fix:** Extract to concerns (modules), service objects, or shared parent class
**Example:** Auth checks in 5 controllers → `Authenticatable` concern or `before_action`

### 9. Unused Local Variables
**Smell:** Variables assigned but never read — dead code
**Fix:** Remove or prefix with `_` if intentionally unused
**Example:** `result = process(data)` (never used) → `_result = process(data)` or remove

### 10. Silent Failures (Returning nil)
**Smell:** Method returns `nil` on error instead of raising — callers don't know something failed
**Fix:** Raise descriptive exception; use `Result` pattern for expected failures
**Example:** `return nil if invalid` → `raise InvalidInputError, "input must be positive"`

### 11. Complex Nested Conditionals
**Smell:** 3+ levels of nested if/unless — hard to follow logic
**Fix:** Use guard clauses (early return), extract methods, or use `case/in` pattern matching
**Example:** 3-deep nested ifs → guard clauses with early returns

### 12. String Concatenation in Loops
**Smell:** `str += item` in loop — creates new String objects each iteration
**Fix:** Use `Array#join` or `StringIO`
**Example:** `items.each { |i| result += i.to_s }` → `result = items.map(&:to_s).join`

### 13. Magic Numbers in Business Logic
**Smell:** Literal numbers without context — what does `30` mean?
**Fix:** Extract to named constants or configuration
**Example:** `if days > 30` → `TRIAL_PERIOD_DAYS = 30; if days > TRIAL_PERIOD_DAYS`

### 14. Module Mixins Creating Implicit Dependencies
**Smell:** `include` modules that depend on host class methods — hidden coupling
**Fix:** Make dependencies explicit via method parameters or constructor injection
**Example:** Module calling `self.user` → pass `user` as parameter to module methods

### 15. Missing Frozen String Literal Comment
**Smell:** Files without `# frozen_string_literal: true` — mutable strings cause subtle bugs
**Fix:** Add magic comment to all Ruby files; fix any string mutations
**Example:** Add `# frozen_string_literal: true` at top; replace `str << "x"` with `str + "x"` or `.dup`

## Idiomatic Refactorings

Version-gated — only suggest if project's Ruby version supports it:

### Ruby 3.2+
- Use anonymous rest/keyword forwarding: `def method(...) other_method(...) end`
- Use `Data.define` for immutable value objects: `Point = Data.define(:x, :y)`

### Ruby 3.0+
- Replace `case/when` with type checks → pattern matching `case/in`
- Use rightward assignment: `expression => variable` for pipeline-style code
- Frozen string literals by default behavior (when enabled)
- Use `Hash#except` for excluding keys: `hash.except(:password)`

### Ruby 2.7+
- Keyword argument separation enforced (positional vs keyword)
- Use numbered block parameters: `[1,2,3].map { _1 * 2 }`
- Use `Enumerable#tally` for counting: `array.tally`
- Use `Enumerable#filter_map` to combine select + map

### General (all versions)
- Replace `for` loop → `each`, `map`, `select`, `reduce`
- Replace `if !condition` → `unless condition`
- Replace `condition ? true : false` → just `condition`
- Replace explicit `return` at end of method → implicit return (last expression)
- Replace `Hash[pairs]` → `pairs.to_h`
- Use `&:method_name` for simple blocks: `items.map(&:to_s)`
- Use `tap` for object initialization chains
- Use `then`/`yield_self` for pipeline transformations

## Framework-Specific Patterns

### Rails
- **ActiveRecord patterns:** Use scopes for reusable queries; avoid default_scope; use `find_by` over `where.first`
- **N+1 prevention:** Use `includes()` / `eager_load()` / `preload()`; detect with `bullet` gem
- **Concerns:** Extract shared model/controller behavior; keep concerns focused on one responsibility
- **Service objects:** Move complex business logic out of models/controllers into `app/services/`
- **Callbacks vs service layer:** Prefer explicit service calls over `before_save`/`after_create` for business logic
- **Strong parameters:** Always use `permit()` in controllers; never mass-assign without filtering

### RSpec
- **Structure:** `describe` for class/method, `context` for scenarios, `it` for expectations
- **let/subject:** Use `let` for lazy-evaluated test data; `subject` for the object under test
- **Shared examples:** Extract common behavior tests into `shared_examples`
- **Factories:** Use FactoryBot over fixtures; keep factories minimal; use traits for variants

## Testing

### Frameworks & Tools
- **RSpec** (preferred): `bundle exec rspec` — expressive BDD-style testing
- **Minitest:** `bundle exec rake test` — standard library, faster boot
- **FactoryBot:** Test data factories — `create(:user)`, `build(:user)`
- **shoulda-matchers:** One-liner matchers for Rails validations and associations
- **VCR / WebMock:** HTTP interaction recording/mocking
- **SimpleCov:** Code coverage — `SimpleCov.start` in spec_helper
- **Capybara:** Integration/acceptance testing with browser simulation

### Convention-Aware Testing Suggestions
- IF RSpec detected → suggest `describe`/`context`/`it` structure for new tests
- IF Minitest only → suggest keeping Minitest; note RSpec migration path if more expressiveness needed
- IF Rails → suggest FactoryBot + shoulda-matchers + system tests for full-stack
- IF no test framework → suggest RSpec as default; Minitest for minimal projects
- IF `spec/` exists → suggest organizing by `spec/models/`, `spec/services/`, `spec/requests/`

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
