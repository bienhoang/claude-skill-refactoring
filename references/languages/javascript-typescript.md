# JavaScript/TypeScript Refactoring Patterns

## Discovery

### Config Files to Detect
Scan project root in priority order:
1. `tsconfig.json` — PRIMARY for TypeScript (compilation target, strict mode, paths)
2. `eslint.config.js` / `eslint.config.mjs` — Flat config (NEW STANDARD); check for `{files, rules}` syntax
3. `.eslintrc.json` / `.eslintrc.js` / `.eslintrc.yml` — Legacy ESLint (DEPRECATED but common)
4. `biome.json` / `biome.jsonc` — Biome linter/formatter (can coexist with ESLint)
5. `prettier.config.js` / `.prettierrc` / `.prettierrc.json` — Formatting rules
6. `package.json` — Inline `eslintConfig`, `prettier` objects (fallback)
7. `.browserslistrc` / `package.json` `browserslist` — Target browser versions

### Convention Inference
- **Module system:** `.mjs` files or `"type": "module"` in package.json → ESM; absence → CommonJS
- **ES target:** Read `tsconfig.json` `"target"` (e.g. `"ES2020"`) or `.browserslistrc` for version ceiling
- **Quote style:** Check prettier `singleQuote` setting; or scan 10+ string literals
- **Semicolons:** Check prettier `semi` setting; or scan code for presence/absence pattern
- **Indentation:** Read from editor config, ESLint/Biome/prettier; or infer from 5+ lines (2 vs 4 spaces vs tabs)
- **Naming conventions:** Scan for `camelCase` (variables/functions), `PascalCase` (components/classes), `UPPER_CASE` (constants)
- **TS strictness:** Check `tsconfig.json` `"strict": true` and individual flags (`noImplicitAny`, `strictNullChecks`)

### Framework Detection
Scan `package.json` dependencies + directory structure + entry file imports:
- **React:** `.jsx`/`.tsx` files + `<Component />` JSX syntax + `react` in dependencies
- **Next.js:** `app/` or `pages/` directory + `next.config.js`/`.mjs`/`.ts` + `next` in dependencies
- **Vue:** `.vue` files with `<template>` blocks + `vue` in dependencies
- **Angular:** `.module.ts` with `@NgModule` + `@angular/core` in dependencies
- **Express:** `app = express()` pattern + `express` in dependencies
- **NestJS:** `@Controller()`, `@Module()` decorators + `@nestjs/core` in dependencies
- **Svelte:** `.svelte` files with reactive `$:` assignments + `svelte` in dependencies

## Convention Rules

Rules applied in precedence order (first match wins):

1. IF `tsconfig.json` with `strict: true` → enforce strict type suggestions; never suggest loosening
2. IF `tsconfig.json` `target` set → restrict version-gated idiom suggestions to that ES version
3. IF eslint flat config found → prefer over legacy `.eslintrc.*` (both may coexist during migration)
4. IF prettier config found → use `singleQuote`, `semi`, `printWidth` as authoritative formatting
5. IF both ESLint + Biome present → note conflict; prefer whichever has more rules configured
6. IF `"type": "module"` in package.json → suggest ESM patterns (`import/export`), flag `require()`
7. IF React detected → apply hooks rules, component patterns (see Framework section)
8. IF Next.js detected → apply server component patterns, app router conventions
9. Precedence: tsconfig > eslint/biome > prettier > code inference

## Common Smells & Fixes

### 1. Promise Anti-Pattern
**Smell:** `new Promise()` wrapper around existing promise — unnecessary nesting
**Fix:** Return the promise directly; chain with `.then()` or use `async/await`
**Example:** `new Promise((res) => fetch(url).then(res))` → `fetch(url)`

### 2. Callback Hell
**Smell:** 3+ levels of nested callbacks
**Fix:** Refactor to `async/await` with proper error handling
**Example:** `fs.readFile(f, (err, data) => { parse(data, (err, obj) => {...})})` → `const data = await fs.readFile(f); const obj = await parse(data);`

### 3. `var` Usage
**Smell:** Function-scoped `var` leads to hoisting bugs
**Fix:** Replace with `const` (preferred) or `let`
**Example:** `var x = 1` → `const x = 1`

### 4. `any` Type (TypeScript)
**Smell:** `any` defeats TypeScript's type system
**Fix:** Use proper types, generics, or `unknown` with type guards
**Example:** `function parse(data: any)` → `function parse(data: unknown): Result`

### 5. Weak Equality
**Smell:** `==` allows type coercion — unexpected behavior
**Fix:** Use `===` / `!==`; for null checks use optional chaining `?.`
**Example:** `if (x == null)` → `if (x === null || x === undefined)` or `x?.prop`

### 6. Prototype Pollution
**Smell:** Direct prototype modification or unsafe object merge
**Fix:** Use ES6 classes; for merging use spread `{...obj}` (shallow) or structured clone
**Example:** `obj.__proto__.admin = true` → Use class with proper encapsulation

### 7. Barrel Export Abuse
**Smell:** `export * from './module'` everywhere — circular deps, tree-shake-unfriendly
**Fix:** Export only what's needed; use explicit named re-exports
**Example:** `export * from './utils'` → `export { formatDate, parseDate } from './utils'`

### 8. Implicit Globals
**Smell:** Missing `"use strict"` in scripts; undeclared variable assignments
**Fix:** Use modules (auto-strict) or add `"use strict"` directive
**Example:** `x = 5` (creates global) → `const x = 5`

### 9. Await in Sequential When Parallel Possible
**Smell:** `await a(); await b();` when tasks are independent
**Fix:** Use `Promise.all()` for independent async operations
**Example:** `const x = await fetchA(); const y = await fetchB();` → `const [x, y] = await Promise.all([fetchA(), fetchB()]);`

### 10. Missing Error Handling on Await
**Smell:** `await` without try/catch leads to unhandled rejections
**Fix:** Wrap in try/catch or use `.catch()` at call boundary
**Example:** `const data = await fetch(url)` → `try { const data = await fetch(url) } catch (e) { handleError(e) }`

### 11. Unnecessary Ternary
**Smell:** `x ? true : false` or `x ? x : default`
**Fix:** Use `Boolean(x)` / `!!x` or nullish coalescing `??`
**Example:** `isValid ? true : false` → `Boolean(isValid)` or `!!isValid`

### 12. String Union vs Const Object (TypeScript)
**Smell:** `type Status = "pending" | "done"` scattered across files with no validation
**Fix:** Use `as const` object for runtime + type safety
**Example:** `type S = "a" | "b"` → `const Status = { A: "a", B: "b" } as const; type S = typeof Status[keyof typeof Status]`

### 13. Large Switch Statement
**Smell:** 10+ case branches
**Fix:** Use `Record<string, Handler>` lookup map
**Example:** `switch(type) { case "a": ...; case "b": ... }` → `const handlers: Record<string, Handler> = { a: handleA, b: handleB }; handlers[type]()`

### 14. Default Exports
**Smell:** `export default` — hard to refactor, inconsistent naming across imports
**Fix:** Use named exports for better tooling support
**Example:** `export default function process()` → `export function process()`

### 15. No Null Safety
**Smell:** Accessing deep properties without checks — runtime crashes
**Fix:** Use optional chaining `?.` and nullish coalescing `??`
**Example:** `user.address.street` → `user?.address?.street ?? 'N/A'`

### 16. Async/Await in Non-Async Function
**Smell:** Using `await` in function not marked `async` — syntax error or missed
**Fix:** Mark function as `async` or return promise chain
**Example:** Missing `async` keyword on function containing `await`

## Idiomatic Refactorings

Version-gated — only suggest if project's ES target supports it:

### ES2022+
- Use top-level `await` in ESM modules
- Use static class fields and static initialization blocks
- Use private class fields with `#` prefix: `#privateField`
- Use `Array.at(-1)` instead of `arr[arr.length - 1]`
- Use `Object.hasOwn(obj, key)` instead of `obj.hasOwnProperty(key)`

### ES2020
- Replace nested null checks → optional chaining `?.`
- Replace `x !== null && x !== undefined ? x : default` → nullish coalescing `??`
- Use `BigInt` for large number arithmetic
- Use `globalThis` instead of platform-specific globals

### ES2019+
- Replace manual array flattening → `Array.flat()`, `Array.flatMap()`
- Replace manual object construction → `Object.fromEntries()`

### ES2017+
- Replace `.then()` chains → `async/await`
- Use `Object.entries()`, `Object.values()` for iteration

### ES2015 (ES6)
- Replace constructor functions → `class` syntax
- Replace `function` in callbacks → arrow functions `=>`
- Replace `var` → `const` / `let`
- Replace string concatenation → template literals `` `${x}` ``
- Replace manual property extraction → destructuring `const { a, b } = obj`
- Replace `arguments` → rest parameters `...args`

### TypeScript-Specific
- Replace type assertions → type guards for runtime safety
- Replace union of similar objects → discriminated unions with `kind` field
- Use `satisfies` operator for validation without widening type
- Replace `enum` → `as const` object (tree-shakeable, no runtime overhead)
- Use branded types for domain primitives: `type UserId = string & { __brand: 'UserId' }`
- Use `const` assertions for literal inference: `const routes = [...] as const`

## Framework-Specific Patterns

### React
- **Hooks rules:** Never call hooks conditionally or in loops; always at top level of component
- **Component composition:** Prefer composition over prop drilling; use context sparingly
- **Memoization:** Use `React.memo` for expensive renders; `useMemo`/`useCallback` only when profiling shows need — avoid premature optimization
- **State colocation:** Keep state as close to where it's used as possible; lift only when needed
- **Event handlers:** Define outside JSX or use `useCallback` if passed to memoized children
- **Key prop:** Use stable unique IDs, never array index for dynamic lists

### Next.js (App Router)
- **Server Components:** Default; use `'use client'` only when client interactivity needed
- **Data fetching:** Use `fetch()` in server components (auto-cached); avoid `useEffect` for data loading
- **Route handlers:** Place in `app/api/` with `route.ts`; use proper HTTP method exports
- **Metadata:** Use `generateMetadata()` or static `metadata` export per page
- **Loading/Error:** Use `loading.tsx` and `error.tsx` boundary files per route segment

### Vue (Composition API)
- **Composition over Options:** Prefer `<script setup>` with Composition API for new code
- **Composables:** Extract reusable logic into `use*` functions (equivalent to React hooks)
- **Reactive patterns:** Use `ref()` for primitives, `reactive()` for objects; avoid `reactive()` with destructuring
- **Props/Emits:** Use `defineProps`/`defineEmits` with TypeScript generics for type safety
- **Watchers:** Prefer `computed` over `watch` when possible; use `watchEffect` for side effects

### Express / NestJS
- **Express middleware:** Keep middleware focused; chain with `next()`; handle errors in dedicated error middleware
- **NestJS dependency injection:** Use constructor injection; register providers in module; avoid circular dependencies
- **Route organization:** Group by domain/resource; use router (Express) or controller (NestJS) per resource
- **Validation:** Use class-validator (NestJS) or zod/joi (Express) at API boundary
- **Error handling:** Centralize error responses; use NestJS exception filters or Express error middleware

## Testing

### Frameworks & Tools
- **vitest** (preferred modern): `npx vitest run` — fast, ESM-native, Vite-compatible
- **jest**: `npx jest` — mature ecosystem, wide plugin support
- **playwright**: E2E browser testing — `npx playwright test`
- **cypress**: E2E + component testing — `npx cypress run`
- **testing-library**: DOM testing utilities — `@testing-library/react`, `@testing-library/vue`
- **msw**: API mocking — intercepts at network level, framework-agnostic
- **storybook**: Component isolation testing + visual regression

### Convention-Aware Testing Suggestions
- IF vitest detected → suggest vitest patterns (`describe`, `it`, `expect`, `vi.mock`)
- IF jest only → suggest keeping jest; note vitest migration path if ESM needed
- IF React → suggest `@testing-library/react` with `render`, `screen`, `userEvent`
- IF Next.js → suggest `next/jest` config + server component testing patterns
- IF Vue → suggest `@vue/test-utils` with `mount`/`shallowMount`
- IF no test runner detected → suggest vitest as default with basic config
- IF E2E needed → suggest playwright (modern) over cypress (mature but heavier)

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
