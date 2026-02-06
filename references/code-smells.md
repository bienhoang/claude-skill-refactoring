# Code Smells Catalog

## Bloaters — Code that has grown too large

### Long Method
- **Signs:** Method > 20 lines, multiple levels of abstraction, needs comments to explain sections, hard to name
- **Severity:** Major
- **Fix:** Extract Method, Replace Temp with Query, Decompose Conditional

### Large Class / God Class
- **Signs:** Class > 300 lines, too many instance variables (>7), too many methods, multiple responsibilities
- **Severity:** Major
- **Fix:** Extract Class, Extract Subclass, Extract Interface

### Long Parameter List
- **Signs:** > 3-4 parameters, boolean flag parameters, parameters that always travel together
- **Severity:** Major
- **Fix:** Introduce Parameter Object, Preserve Whole Object, Replace Parameter with Method Call

### Primitive Obsession
- **Signs:** Using primitives for domain concepts (strings for emails, ints for money), type-code fields, string constants for field names
- **Severity:** Minor-Major
- **Fix:** Replace Data Value with Object, Replace Type Code with Class/Subclass, Extract Class

### Data Clumps
- **Signs:** Same group of variables/parameters appear together repeatedly (e.g., x/y/z coordinates, start/end dates)
- **Severity:** Minor
- **Fix:** Extract Class, Introduce Parameter Object

## Object-Orientation Abusers

### Switch Statements / Long if-else Chains
- **Signs:** Type-checking switch/if-else, same switch repeated in multiple places, adding new types requires modifying multiple switches
- **Severity:** Major
- **Fix:** Replace Conditional with Polymorphism, Replace Type Code with Strategy, Replace Parameter with Explicit Methods

### Refused Bequest
- **Signs:** Subclass uses only a few inherited methods/properties, subclass overrides parent to do nothing or throw
- **Severity:** Minor
- **Fix:** Replace Inheritance with Delegation, Extract Subclass

### Feature Envy
- **Signs:** Method accesses data from another class more than its own, long chains of getters on another object
- **Severity:** Major
- **Fix:** Move Method, Extract Method + Move Method

### Inappropriate Intimacy
- **Signs:** Classes access each other's private fields, bidirectional coupling, excessive friend/internal access
- **Severity:** Major
- **Fix:** Move Method/Field, Extract Class, Replace Inheritance with Delegation

## Change Preventers — Code that makes changes difficult

### Divergent Change
- **Signs:** One class changed for many different reasons, changes to unrelated features require modifying the same class
- **Severity:** Major
- **Fix:** Extract Class (split by responsibility)

### Shotgun Surgery
- **Signs:** One change requires small modifications to many classes, adding a feature touches 10+ files
- **Severity:** Critical
- **Fix:** Move Method/Field to consolidate, Inline Class (merge overly distributed logic)

### Parallel Inheritance Hierarchies
- **Signs:** Creating subclass in one hierarchy forces creating subclass in another
- **Severity:** Major
- **Fix:** Move Method/Field to eliminate one hierarchy, use composition

## Dispensables — Unnecessary code

### Dead Code
- **Signs:** Unreachable code, unused variables/params/methods/classes, commented-out code
- **Severity:** Minor (but easy win)
- **Fix:** Remove. Use IDE/linter to detect. Check version control for history.

### Speculative Generality
- **Signs:** Unused abstractions, abstract classes with one subclass, unused parameters "for future use", overly generic names
- **Severity:** Minor
- **Fix:** Collapse Hierarchy, Inline Class, Remove Parameter, Rename

### Duplicate Code
- **Signs:** Identical or very similar code in 2+ places, copy-paste patterns, same algorithm with minor variations
- **Severity:** Major
- **Fix:** Extract Method, Extract Superclass/Module, Template Method pattern

### Lazy Class
- **Signs:** Class that does too little to justify its existence, wrapper that adds nothing
- **Severity:** Minor
- **Fix:** Inline Class, Collapse Hierarchy

### Comments as Deodorant
- **Signs:** Comments explaining what code does (not why), comments compensating for bad naming, commented-out code blocks
- **Severity:** Minor
- **Fix:** Extract Method (name replaces comment), Rename Variable/Method, remove obvious comments

## Couplers — Excessive coupling between classes

### Message Chains
- **Signs:** `a.getB().getC().getD().doSomething()`, long chains of calls
- **Severity:** Minor-Major
- **Fix:** Hide Delegate, Extract Method, Move Method

### Middle Man
- **Signs:** Class where most methods just delegate to another class, adds no value
- **Severity:** Minor
- **Fix:** Remove Middle Man, Inline Method

### Incomplete Library Class
- **Signs:** Library class missing needed method, workarounds spread through codebase
- **Severity:** Minor
- **Fix:** Introduce Extension Method/Foreign Method, Wrap with Adapter

## Complexity Smells

### Deep Nesting
- **Signs:** > 3 levels of nesting in conditionals/loops, arrow-shaped code
- **Severity:** Major
- **Fix:** Replace Nested Conditional with Guard Clauses, Extract Method, Replace Loop with Pipeline

### Complex Conditional Logic
- **Signs:** Boolean expressions with 3+ conditions, nested ternaries, inverted/double-negation logic
- **Severity:** Major
- **Fix:** Decompose Conditional, Consolidate Conditional, Introduce Explaining Variable, Replace with polymorphism

### Temporal Coupling
- **Signs:** Methods must be called in specific order to work, initialization steps that can be forgotten
- **Severity:** Major
- **Fix:** Builder pattern, encapsulate the sequence in a single method, make invalid states unrepresentable

## Naming Smells

### Unclear Names
- **Signs:** Single-letter names (outside loops), abbreviations, generic names (data, info, manager, handler, process), misleading names
- **Severity:** Minor but pervasive
- **Fix:** Rename to describe purpose/behavior, use domain vocabulary

### Inconsistent Naming
- **Signs:** Mixed conventions (camelCase/snake_case), synonyms for same concept (fetch/get/retrieve), inconsistent verb usage
- **Severity:** Minor
- **Fix:** Establish naming convention, systematic rename across codebase
