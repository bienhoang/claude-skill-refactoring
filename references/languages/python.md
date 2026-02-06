# Python Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `pyproject.toml` — PRIMARY (ruff, black, mypy, pytest config under `[tool.*]` sections)
2. `.ruff.toml` / `ruff.toml` — Ruff-specific rules, line-length, lint rules
3. `setup.cfg` — Legacy (flake8, pytest); DEPRECATED but still common
4. `tox.ini` — Multi-environment testing config
5. `.pre-commit-config.yaml` — Hook order reveals tool priorities
6. `mypy.ini` / `.mypy.ini` — Type checking strictness

### Convention Inference
- **Python version:** Read `pyproject.toml` `requires-python` or ruff `target-version` (e.g. `"py38"` → 3.8+)
- **Naming style:** Scan 10+ function/variable names. Python near-universally uses `snake_case` — flag deviations
- **Quote style:** Scan 5+ string literals for `"` vs `'` consistency (~80% threshold)
- **Formatter:** Check for black/ruff format config — if present, use its `line-length` as authoritative
- **Line length:** Read from `[tool.ruff] line-length` or `[tool.black] line-length` (typical: 88 or 100)
- **Import style:** Check for isort config (`[tool.isort]` or `[tool.ruff.isort]`); note grouping rules

### Framework Detection
Scan imports in top-level modules + check `pyproject.toml` `[project] dependencies`:
- **Django:** `settings.py` + `manage.py` + `INSTALLED_APPS` in settings
- **Flask:** `app = Flask(__name__)` pattern + `app.route` decorator
- **FastAPI:** `fastapi.FastAPI` import + Pydantic model usage + `@app.get()` decorators
- **Pydantic:** `from pydantic import BaseModel` — check v2 vs v3 via installed version
- **SQLAlchemy:** `declarative_base()` or mapped ORM classes + `Session` usage
- **Celery:** `@app.task` decorator + `celery.py` module

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `[tool.black]` config found → use its `line-length` and `target-version` as authoritative formatting source
2. IF `[tool.ruff]` config found without black → use ruff's `line-length` and `target-version`
3. IF ruff `target-version` set → restrict version-gated idiom suggestions to that version or lower
4. IF `requires-python >= 3.10` → enable pattern matching suggestions
5. IF no formatter config → infer line-length and quote style from scanning 10+ lines of existing code
6. IF Django detected → apply Django-specific patterns (see Framework section)
7. IF FastAPI detected → apply async-first patterns and Pydantic model suggestions
8. Precedence: `pyproject.toml [tool.*]` > standalone config files > code inference

## Common Smells & Fixes

### 1. Mutable Default Arguments
**Smell:** `def f(items=[])` — shared mutable state across calls
**Fix:** Use `None` sentinel: `def f(items=None): items = items or []`
**Example:** `def add(item, lst=[])` → `def add(item, lst=None): lst = lst if lst is not None else []`

### 2. Bare Except
**Smell:** `except:` catches SystemExit, KeyboardInterrupt
**Fix:** Use `except Exception:` at minimum, prefer specific exceptions
**Example:** `except:` → `except ValueError as e:`

### 3. Global Mutable State
**Smell:** Module-level mutable variables modified by functions
**Fix:** Encapsulate in class, use dependency injection, or pass as parameters
**Example:** `CONFIG = {}` modified by `setup()` → `class AppConfig` with explicit init

### 4. Unused Imports
**Smell:** Dead imports; especially from wildcard `from x import *`
**Fix:** Remove unused imports; use explicit imports only
**Example:** Remove via autofix (`ruff --fix`) or manual cleanup

### 5. Nested Function Complexity
**Smell:** Multiple levels of `def` inside `def` with closures
**Fix:** Extract inner functions to module-level; pass shared state as parameters
**Example:** 3-deep nested defs → flat functions with explicit args

### 6. Manual Resource Management
**Smell:** `f = open(...)` without `with` statement
**Fix:** Use context managers for file/DB/network handles
**Example:** `f = open('x'); f.read(); f.close()` → `with open('x') as f: f.read()`

### 7. String Concatenation in Loop
**Smell:** `s += x` in loop creates O(n²) string copies
**Fix:** Collect in list, use `"".join()`
**Example:** `for x in items: s += str(x)` → `s = "".join(str(x) for x in items)`

### 8. Unnecessary Else After Return
**Smell:** `if cond: return x; else: return y`
**Fix:** Remove `else` — code after return is already unreachable
**Example:** `if x: return True; else: return False` → `return bool(x)`

### 9. isinstance Cascade
**Smell:** Multiple `isinstance()` checks in if/elif chain
**Fix:** Use `@singledispatch`, strategy pattern, or (3.10+) `match` statement
**Example:** 5-way isinstance → `@singledispatch` with registered handlers

### 10. Type Checking with type()
**Smell:** `type(x) == int` fails for subclasses
**Fix:** Use `isinstance(x, int)`
**Example:** `if type(x) == list:` → `if isinstance(x, list):`

### 11. Dict/List Instead of Dataclass
**Smell:** Untyped nested dicts for structured data
**Fix:** Use `@dataclass` or Pydantic `BaseModel` for typed structures
**Example:** `user = {"name": "x", "age": 1}` → `@dataclass class User: name: str; age: int`

### 12. Except-then-Pass
**Smell:** `except SomeError: pass` — silent error swallowing
**Fix:** Log the error, re-raise, or handle explicitly
**Example:** `except Exception: pass` → `except Exception: logger.warning("...", exc_info=True)`

### 13. Late Binding Closure Bug
**Smell:** Functions in loops capture loop variable by reference
**Fix:** Use default argument binding: `lambda x=x: x`
**Example:** `[lambda: i for i in range(3)]` → `[lambda i=i: i for i in range(3)]`

### 14. Comparison to None Without `is`
**Smell:** `x == None` uses equality instead of identity
**Fix:** Use `x is None` or `x is not None`
**Example:** `if x == None:` → `if x is None:`

### 15. Redundant List Wrapping
**Smell:** `list(x for x in y)` or `[x for x in y if True]`
**Fix:** Simplify: `list(y)` or just `[x for x in y]`
**Example:** `list(i for i in range(10))` → `list(range(10))`

### 16. Generator Not Consumed
**Smell:** Generator created but never iterated — wasted computation or memory leak
**Fix:** Consume with `list()`, `for` loop, or `collections.deque(gen, maxlen=0)`
**Example:** `(process(x) for x in items)` without iteration → `for x in items: process(x)`

### 17. Unpacking Mismatch
**Smell:** `a, b = func()` when func returns more/fewer values
**Fix:** Match unpacking to return count; use `*rest` for variable-length
**Example:** `a, b = get_data()` (returns 3) → `a, b, *_ = get_data()`

## Idiomatic Refactorings

Version-gated — only suggest if project's Python version supports it:

### Python 3.10+
- Replace long if/elif chains with `match`/`case` pattern matching
- Use structural pattern matching for type dispatch

### Python 3.9+
- Replace `List[int]`, `Dict[str, int]` → `list[int]`, `dict[str, int]` (no typing import needed)
- Replace `Union[X, None]` → `X | None`

### Python 3.8+
- Use walrus operator `:=` for assignment in conditions: `if (n := len(items)) > 10:`
- Use `TypedDict` for typed dictionary schemas

### Python 3.7+
- Replace manual `__init__` boilerplate → `@dataclass`
- Dict insertion order guaranteed by spec (not just CPython)

### Python 3.6+
- Replace `.format()` and `%` formatting → f-strings: `f"{name} is {age}"`
- Use variable annotations: `name: str = "default"`

### General (all versions)
- Replace for-loop building list → list/dict/set comprehension
- Replace index-based iteration → `enumerate()`, `zip()`
- Replace `dict.has_key()` or `key in dict.keys()` → `key in dict`
- Replace manual dispatch → `@functools.singledispatch`
- Replace repeated try/finally → context manager (`contextlib.contextmanager`)

## Framework-Specific Patterns

### Django
- **Model patterns:** Prefer `Meta.constraints` over manual validation; use `F()` expressions for DB-level ops
- **View patterns:** Use class-based views for CRUD; function views for custom logic. Avoid fat views — move logic to services/managers
- **QuerySet optimization:** Use `select_related()` / `prefetch_related()` to avoid N+1 queries; annotate/aggregate at DB level
- **Signals vs direct calls:** Prefer explicit service calls over signals for business logic (signals are implicit, hard to debug)
- **Settings:** Use `django-environ` or `pydantic-settings` for typed config; avoid `import *` in settings

### Flask
- **App factory pattern:** Use `create_app()` factory instead of module-level `app = Flask(__name__)`
- **Blueprints:** Split routes into blueprints by domain; register in factory
- **Extension init:** Use `ext.init_app(app)` pattern (lazy initialization) not `ext = Ext(app)` at import time
- **Error handling:** Register error handlers on app/blueprint; return JSON errors for API endpoints

### FastAPI
- **Dependency injection:** Use `Depends()` for shared logic (auth, DB sessions); avoid global state
- **Pydantic models:** Separate request/response models; use `model_config` for serialization settings
- **Async endpoints:** Use `async def` for I/O-bound routes; regular `def` for CPU-bound (FastAPI runs sync in threadpool)
- **Router organization:** Split into `APIRouter` per domain; include in main app

## Testing

### Frameworks & Tools
- **pytest** (preferred): `pytest -v --tb=short`
- **unittest**: Standard library; class-based test organization
- **pytest-mock**: `mocker.patch()` for clean mocking
- **pytest-cov**: `pytest --cov=src --cov-report=term-missing`
- **syrupy**: Snapshot testing — `pytest --snapshot-update`
- **hypothesis**: Property-based testing for edge cases
- **factory_boy**: Test data factories for model instances

### Convention-Aware Testing Suggestions
- IF pytest detected → suggest pytest fixtures and parametrize for new tests
- IF unittest only → suggest migration path to pytest (compatible; can run both)
- IF Django → suggest `pytest-django` with `@pytest.mark.django_db`
- IF FastAPI → suggest `httpx.AsyncClient` with `pytest-asyncio`
- IF no test runner detected → suggest pytest as default with basic `conftest.py` setup

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
