# PHP Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `composer.json` — PRIMARY (dependencies, autoloading, PHP version constraint, scripts)
2. `phpstan.neon` / `phpstan.neon.dist` — PHPStan static analysis config (level 0-9)
3. `psalm.xml` — Psalm static analyzer config (error levels)
4. `phpcs.xml` / `phpcs.xml.dist` — PHP CodeSniffer config (PSR ruleset)
5. `.php-cs-fixer.php` / `.php-cs-fixer.dist.php` — PHP CS Fixer formatting config

### Convention Inference
- **PHP version:** Read `composer.json` `"require": { "php": ">=8.1" }` — gates enums, readonly, match
- **Naming:** PSR-1/PSR-12 standard: StudlyCaps classes, camelCase methods, UPPER_CASE constants
- **Autoloading:** Check `composer.json` `"autoload": { "psr-4": {} }` for namespace-to-directory mapping
- **Indentation:** Scan 5+ files; PSR-12 specifies 4 spaces
- **Type strictness:** Check for `declare(strict_types=1);` at top of files — indicates type-safe project
- **Static analysis level:** PHPStan level (0-9) or Psalm error level indicates project strictness

### Framework Detection
Check `composer.json` `"require"` section + directory structure:
- **Laravel:** `laravel/framework` dependency + `app/` dir + `routes/web.php` + `artisan` CLI
- **Symfony:** `symfony/framework-bundle` dependency + `config/services.yaml` + `bin/console`
- **WordPress:** `wp-config.php` + `wp-content/` directory + `functions.php`

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `phpcs.xml` present with PSR-12 ruleset THEN use as authoritative naming/formatting
2. IF `.php-cs-fixer.php` present THEN formatting is non-negotiable
3. IF PHP version >= 8.1 THEN suggest enums for string constants, readonly properties
4. IF PHP version >= 8.0 THEN suggest named arguments, match expression, nullsafe `?->`
5. IF PHP version < 8.0 THEN no match expressions, no named args, no union types
6. IF `declare(strict_types=1)` found in >50% of files THEN enforce strict typing in suggestions
7. IF PHPStan level >= 6 THEN suggestions must not introduce type errors
8. IF Laravel project THEN follow Laravel naming (PascalCase controllers, snake_case DB columns, StudlyCaps models)
9. IF Symfony project THEN follow Symfony conventions (services.yaml config, autowiring patterns)
10. Precedence: phpcs/php-cs-fixer config > PSR-12 defaults > framework conventions > code inference

## Common Smells & Fixes

### 1. Magic Numbers/Strings
**Smell:** Literal values scattered in business logic with no context
**Fix:** Extract to named class constants or enum cases
**Example:** `if ($status === 'active')` → `if ($status === UserStatus::Active)`

### 2. Empty Catch Blocks
**Smell:** `catch (Exception $e) { }` — silent error swallowing
**Fix:** Log error, re-throw, or handle with explicit recovery
**Example:** Empty catch → `catch (\Throwable $e) { $this->logger->error($e->getMessage(), ['exception' => $e]); }`

### 3. Unused Use Statements
**Smell:** `use SomeNamespace\Class;` imported but never referenced
**Fix:** Remove unused imports; configure PHP CS Fixer to auto-clean
**Example:** Run `php-cs-fixer fix --rules=no_unused_imports`

### 4. Mutation of Pass-by-Reference Parameters
**Smell:** `function process(&$data)` — hidden side effects, hard to trace
**Fix:** Return new values; use immutable patterns
**Example:** `function process(&$arr)` → `function process(array $arr): array { return [...$arr, $new]; }`

### 5. God Class
**Smell:** Class with >300 LOC or 10+ public methods mixing responsibilities
**Fix:** Extract into focused classes by domain concern
**Example:** `UserController` with auth + profile + billing → separate controllers per concern

### 6. Spaghetti Inheritance
**Smell:** Deep inheritance chains (3+ levels) with overridden methods
**Fix:** Use composition; extract shared behavior into traits or services
**Example:** `A extends B extends C extends D` → flat classes with injected services

### 7. Null Pointer Chains
**Smell:** `$user->getAddress()->getCity()` — NPE if any returns null
**Fix:** Use nullsafe operator `?->` (PHP 8.0+) or explicit null checks
**Example:** `$user->getAddress()->getCity()` → `$user?->getAddress()?->getCity()`

### 8. Service Locator Pattern
**Smell:** `$container->get(SomeService::class)` — hides dependencies
**Fix:** Use constructor injection; declare dependencies explicitly
**Example:** Service locator calls → `public function __construct(private SomeService $svc) {}`

### 9. Untyped Array Properties
**Smell:** `/** @var array */ private $items;` — no item type information
**Fix:** Use typed collections, PHPDoc `@var array<int, Item>`, or dedicated collection classes
**Example:** `private $items = [];` → `/** @var list<Item> */ private array $items = [];`

### 10. Silent Try-Catch-Return-Null
**Smell:** `try { ... } catch (\Exception $e) { return null; }` — masks errors
**Fix:** Let exceptions propagate, log and re-throw, or return Result type
**Example:** Return null → throw domain exception or return `Result::failure($e)`

### 11. Procedural Code in OOP Context
**Smell:** Functions defined outside classes; global state manipulation
**Fix:** Encapsulate in classes with proper dependency injection
**Example:** `function processOrder($data)` at file level → `OrderProcessor::process()`

### 12. Circular Dependencies Between Namespaces
**Smell:** Package A imports from B which imports from A — fragile architecture
**Fix:** Extract shared types to a common package; use interfaces at boundaries
**Example:** Introduce shared interface package that both depend on

### 13. Partial Type Hints
**Smell:** Some params typed, others not; mixed typing discipline
**Fix:** Add type declarations to all params and returns; use `mixed` if truly any type
**Example:** `function process($data)` → `function process(array $data): ProcessResult`

### 14. Missing Return Type Declarations
**Smell:** Methods without return type — callers must guess
**Fix:** Add return types to all methods; use `void` for no-return methods
**Example:** `public function save($entity)` → `public function save(Entity $entity): void`

### 15. Transaction Without Rollback
**Smell:** DB transaction started but no rollback on failure — data corruption risk
**Fix:** Use try/catch with rollback in catch; or use framework transaction helpers
**Example:** `$db->beginTransaction(); $db->execute(...);` → wrap in try/catch with `$db->rollBack()` in catch

## Idiomatic Refactorings

Version-gated — only suggest if project's PHP version supports it:

### PHP 8.3+
- Typed class constants: `const string NAME = 'value';`
- `#[\Override]` attribute for explicit method override marking

### PHP 8.1+
- Replace string constants → native enums: `enum Status: string { case Active = 'active'; }`
- Use `readonly` properties for immutable value objects
- Use intersection types: `function process(Countable&Iterator $items)`
- Use first-class callables: `array_map($this->transform(...), $items)`

### PHP 8.0+
- Replace switch → `match` expression (strict comparison, returns value)
- Use named arguments for clarity: `new User(name: 'John', age: 30)`
- Use nullsafe operator: `$user?->getAddress()?->getCity()`
- Use union types: `function process(int|string $id): Response|null`
- Use constructor property promotion: `public function __construct(private string $name) {}`

### General (all modern versions)
- Replace `array_push($arr, $item)` → `$arr[] = $item`
- Replace `isset($arr['key']) ? $arr['key'] : 'default'` → `$arr['key'] ?? 'default'`
- Replace manual getters/setters → readonly properties or constructor promotion
- Replace `sprintf` for simple cases → string interpolation `"Hello {$name}"`

## Framework-Specific Patterns

### Laravel
- **Eloquent patterns:** Use scopes for reusable queries; avoid raw queries when Eloquent suffices
- **Service container:** Bind interfaces to implementations; use contextual binding for strategy pattern
- **Middleware:** Keep focused on single concern; use middleware groups for route-level concerns
- **Form requests:** Move validation from controllers to FormRequest classes
- **Resource controllers:** Use `--resource` scaffolding; stick to 7 RESTful actions
- **N+1 prevention:** Use `with()` eager loading; check with `preventLazyLoading()` in dev

### Symfony
- **Services.yaml:** Use autowiring for DI; manually wire only when disambiguation needed
- **Event dispatcher:** Use events for decoupled cross-cutting concerns; avoid for core business logic
- **Messenger:** Use for async processing; define handlers per message type
- **Form types:** Create reusable form types; use data transformers for complex mapping
- **Security:** Use voters for authorization logic; avoid checking roles directly in controllers
- **Doctrine ORM:** Use repositories for query logic; avoid DQL in controllers; use QueryBuilder for complex queries

## Testing

### Frameworks & Tools
- **PHPUnit:** `vendor/bin/phpunit` — standard test framework
- **Pest:** `vendor/bin/pest` — modern, expressive syntax built on PHPUnit
- **Mockery:** Mock object framework — `Mockery::mock(Service::class)`
- **PHPStan/Psalm:** Static analysis as testing complement
- **Laravel testing:** `$this->get('/api/users')->assertOk()` — built-in HTTP testing
- **Infection:** Mutation testing — `vendor/bin/infection`

### Convention-Aware Testing Suggestions
- IF Pest detected → suggest Pest syntax (`it()`, `expect()`) for new tests
- IF PHPUnit only → suggest keeping PHPUnit; note Pest migration path if desired
- IF Laravel → suggest feature tests with `RefreshDatabase`, factory-based test data
- IF Symfony → suggest `WebTestCase` for functional tests, `KernelTestCase` for service tests
- IF no test framework detected → suggest PHPUnit as default; Pest for greenfield projects

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
