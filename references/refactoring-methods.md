# Refactoring Methods Catalog

## Method-Level Refactorings

### Extract Method
- **When:** Code fragment that can be grouped, comment explaining what a block does, method doing multiple things
- **Mechanics:** 1) Identify fragment → 2) Create new method with descriptive name → 3) Copy code → 4) Replace original with call → 5) Pass needed variables as parameters → 6) Run tests
- **Pitfall:** Avoid extracting methods that need 5+ parameters — consider Extract Class instead

### Inline Method
- **When:** Method body is as clear as its name, method is trivial delegation
- **Mechanics:** 1) Verify no polymorphism → 2) Replace all calls with body → 3) Remove method → 4) Run tests

### Replace Temp with Query
- **When:** Temporary variable holding result of an expression, used in multiple places
- **Mechanics:** 1) Extract expression into method → 2) Replace temp usages with method call → 3) Run tests
- **Caveat:** Only when the expression has no side effects

### Introduce Explaining Variable
- **When:** Complex expression hard to understand
- **Mechanics:** 1) Create well-named variable → 2) Assign the sub-expression → 3) Replace sub-expression usage → 4) Run tests

### Split Temporary Variable
- **When:** Temp variable assigned multiple times for different purposes (not loop/accumulator)
- **Mechanics:** 1) Rename first assignment → 2) Make it const/final if possible → 3) Rename subsequent for their purpose → 4) Run tests

### Decompose Conditional
- **When:** Complex conditional (if-else) with non-trivial branches
- **Mechanics:** 1) Extract condition into named method → 2) Extract then-branch into method → 3) Extract else-branch into method → 4) Run tests

### Replace Nested Conditional with Guard Clauses
- **When:** Deep nesting from special-case checks, arrow-shaped code
- **Mechanics:** 1) Identify special cases → 2) Convert to early returns → 3) Flatten the main logic → 4) Run tests
- **Example:**
```python
# Before
def pay(employee):
    if employee.is_active:
        if employee.is_full_time:
            if employee.has_benefits:
                return calculate_full_pay(employee)
            else:
                return calculate_partial_pay(employee)
        else:
            return calculate_part_time_pay(employee)
    else:
        return 0

# After
def pay(employee):
    if not employee.is_active:
        return 0
    if not employee.is_full_time:
        return calculate_part_time_pay(employee)
    if not employee.has_benefits:
        return calculate_partial_pay(employee)
    return calculate_full_pay(employee)
```

### Replace Loop with Pipeline
- **When:** Loop body does filtering, mapping, or accumulating
- **Mechanics:** Use language-native pipeline (list comprehensions, .map/.filter/.reduce, streams)

## Class-Level Refactorings

### Extract Class
- **When:** Class has too many responsibilities, subset of fields/methods form a logical group
- **Mechanics:** 1) Create new class → 2) Move relevant fields → 3) Move relevant methods → 4) Update references → 5) Run tests

### Inline Class
- **When:** Class does too little to justify existence
- **Mechanics:** 1) Move all features into absorbing class → 2) Remove empty class → 3) Run tests

### Move Method / Move Field
- **When:** Method/field used more by another class (Feature Envy)
- **Mechanics:** 1) Create method/field in target → 2) Copy body, adjust references → 3) Delegate or redirect from source → 4) Remove original after all callers updated → 5) Run tests

### Extract Interface / Extract Superclass
- **When:** Multiple classes share common behavior, need to decouple from concrete implementation
- **Mechanics:** 1) Identify common operations → 2) Create interface/superclass → 3) Have classes implement/extend → 4) Update client code to use abstraction → 5) Run tests

### Replace Inheritance with Delegation (Composition)
- **When:** Subclass only uses fraction of parent's interface, inheritance doesn't model is-a relationship
- **Mechanics:** 1) Create field for former parent → 2) Delegate needed methods → 3) Remove inheritance → 4) Run tests

### Replace Delegation with Inheritance
- **When:** Class delegates nearly everything to another class, delegation adds complexity without value
- **Mechanics:** 1) Make delegating class subclass of delegate → 2) Remove delegation methods → 3) Run tests

## Data Organization Refactorings

### Introduce Parameter Object
- **When:** Group of parameters always passed together (data clump)
- **Mechanics:** 1) Create class/struct for the group → 2) Update function signatures → 3) Update callers → 4) Move behavior that operates on the group into the new class → 5) Run tests

### Replace Magic Number/String with Named Constant
- **When:** Literal value with special meaning appears in code
- **Mechanics:** 1) Declare constant with meaningful name → 2) Replace all occurrences → 3) Run tests

### Encapsulate Field
- **When:** Public field accessed directly from outside the class
- **Mechanics:** 1) Create getter/setter (or property) → 2) Replace direct access → 3) Run tests

### Replace Type Code with Strategy/State
- **When:** Type code affects behavior via conditionals
- **Mechanics:** 1) Create interface for behavior → 2) Create implementation per type → 3) Replace conditionals with polymorphic calls → 4) Run tests

### Introduce Null Object / Optional
- **When:** Repeated null checks for same object, null sentinel values
- **Mechanics:** 1) Create Null Object class implementing same interface → 2) Return Null Object instead of null → 3) Remove null checks → 4) Run tests

## API / Interface Refactorings

### Rename Method/Variable
- **When:** Name doesn't communicate purpose
- **Mechanics:** Use IDE rename refactoring for safety → Run tests

### Add / Remove Parameter
- **When:** Method needs more/less info
- **Mechanics:** 1) Create new method signature → 2) Update body → 3) Update callers → 4) Remove old signature → 5) Run tests
- **Prefer:** Introduce Parameter Object over adding many individual parameters

### Separate Query from Modifier (Command-Query Separation)
- **When:** Method both returns value and changes state
- **Mechanics:** 1) Create query method (returns value, no side effects) → 2) Create modifier method (changes state, returns void) → 3) Replace original calls → 4) Run tests

### Preserve Whole Object
- **When:** Extracting values from object just to pass them as separate parameters
- **Mechanics:** 1) Replace parameter list with the whole object → 2) Update method to extract values internally → 3) Run tests

## Architecture-Level Refactorings

### Replace Conditional with Polymorphism
- **When:** Switch/if-else on type code controlling behavior in multiple places
- **Mechanics:** 1) Create class hierarchy or strategy → 2) Move each branch into overriding method → 3) Replace conditional with polymorphic call → 4) Run tests

### Introduce Facade
- **When:** Complex subsystem with many classes, clients need simplified access
- **Mechanics:** 1) Create facade class → 2) Expose high-level methods → 3) Delegate to subsystem internally → 4) Migrate clients to facade → 5) Run tests

### Replace Constructor with Factory Method
- **When:** Complex object creation logic, need to return different types
- **Mechanics:** 1) Create static/class factory method → 2) Move creation logic → 3) Replace `new` calls → 4) Run tests

### Extract Module / Package
- **When:** File/module has grown to contain unrelated functionality
- **Mechanics:** 1) Identify cohesive groups → 2) Create new modules → 3) Move code maintaining dependencies → 4) Update imports → 5) Run tests
