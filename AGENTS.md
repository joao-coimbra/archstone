# Archstone — AI Instructions

## Project Overview

Archstone is a **zero-dependency TypeScript library** that provides the architectural foundation for backend services based on Domain-Driven Design (DDD) and Clean Architecture. It ships reusable base classes, contracts, and utilities so consumer projects never write this boilerplate themselves.

The library is published to npm as `archstone` and exposes four entry points:

| Entry point                    | Layer                   |
| ------------------------------ | ----------------------- |
| `archstone`                    | re-exports everything   |
| `archstone/core`               | pure language utilities |
| `archstone/domain/enterprise`  | domain model primitives |
| `archstone/domain/application` | orchestration contracts |

### Agent notes

- Test git hooks with `bunx lefthook run pre-commit`
- When creating several PRs at once, stack them so each branch starts from the previous one — not all from `main`

### Keep `skills/use-archstone` in sync

`skills/use-archstone/` is the consumer-facing agent skill (installed via `bun x skills add joao-coimbra/archstone`). It must stay accurate against the public API.

**When to update it (required in the same PR):**

- Public exports or signatures change under `src/core`, `src/domain/enterprise`, or `src/domain/application`
- Import paths, layer rules, or recommended patterns in `AGENTS.md` change for consumers
- New primitives ship that consumers should use (`Maybe`, `attempt`, `shouldRun`, etc.)
- Examples in JSDoc, the README, or the tutorial would lead an agent to generate wrong code

**What to update:**

1. `skills/use-archstone/SKILL.md` — critical rules + triggers
2. Matching files under `skills/use-archstone/references/`
3. Keep `.agents/skills/use-archstone` as a symlink to that folder (do not duplicate content)

**Do not** ship an API change that agents would misuse without updating the skill in the same change.

### Keep the README and the tutorial in sync

`README.md` and `docs/tutorial.md` explain the public API to new users. They must agree with the code and with each other.

**When to update them (required in the same PR):**

- A public class, function, method, or signature changes under `src/core`, `src/domain/enterprise`, or `src/domain/application`
- A recommended pattern changes: imports, `Either` / `Maybe`, repositories, domain events, or factories
- An example in either document would no longer compile, or would contradict the other document

**What to update:**

1. `README.md` — what Archstone is, when to use it, and the building blocks
2. `docs/tutorial.md` — the registration walkthrough, wherever it shows the changed API

Update both documents in the same change. If the change appears in only one of them, bring the other into agreement before merging. If neither document shows the changed API, leave them as they are.

```bash
git checkout -b pr-1 && git add <files> && git commit && git push
gh pr create --head pr-1 --base main

git checkout -b pr-2 && git add <files> && git commit && git push
gh pr create --head pr-2 --base pr-1
```

Only stack when PRs are sequential and independent. If they touch the same files, resolve that before splitting.

## Logical Architecture

Three layers, each with a strict dependency rule — inner layers never import outer ones:

```
┌─────────────────────────────────────────┐
│  infrastructure  (not in this repo)     │ ← database adapters, HTTP handlers
├─────────────────────────────────────────┤
│  domain / application                   │ ← use cases, repository interfaces
├─────────────────────────────────────────┤
│  domain / enterprise                    │ ← entities, aggregates, value objects
├─────────────────────────────────────────┤
│  core                                   │ ← Either, Maybe, ValueObject, UniqueEntityId…
└─────────────────────────────────────────┘
```

Infrastructure implementations (database adapters, HTTP handlers) live outside this library — never add them here.

## Source Structure

```
src/
  core/                 ← pure language utilities (see Core Layer below)
  domain/
    enterprise/         ← domain model (see Domain / Enterprise below)
    application/        ← use cases & repo contracts (see Domain / Application below)
```

## Runtime & Tooling

Use **Bun 1.4** exclusively — never Node.js, npm, yarn, or pnpm. The repo pins `packageManager` to `bun@1.4.5`.

Library builds still use **bunup** because stable Bun does not yet emit `.d.ts` (`bun build --dts` lands in 1.5). `bun run probe:native-dts` is the fail-closed readiness check. Schedule the Cursor Cloud Automation in `.cursor/automations/bun-native-dts-SETUP.md` to migrate when ready (disable it when it prints `BUN_NATIVE_DTS_DONE`).

| Task                 | Command                              |
| -------------------- | ------------------------------------ |
| Install dependencies | `bun install`                        |
| Run tests            | `bun test`                           |
| Build                | `bun run build`                      |
| Lint & format        | `bun x ultracite fix`                |
| Publish              | `bun run release`                    |
| Bump version         | `bun pm version patch\|minor\|major` |

## Path Aliases & Import Rules

`@/` resolves to `src/`. Always import from the **layer's index**, never from deep file paths — deep imports cause the dts bundler to inline type declarations and break TypeScript's nominal typing for consumers who mix sub-path imports.

```ts
// ✅ correct
import { Either } from "@/core/index"
import { Entity } from "@/domain/enterprise/index"

// ❌ wrong — deep path breaks dts bundling
import { ValueObject } from "@/core/value-object"
```

## Testing

Framework: `bun:test`. Test files are `*.spec.ts` co-located with their source file.

```ts
import { test, expect } from "bun:test"

test("example", () => {
  expect(1).toBe(1)
})
```

Use in-memory repository implementations for use case tests — never couple tests to a real database.

## Contributing Workflow

- Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`
- Commit style: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`)
- Every commit must pass `bun test` and `bun x ultracite fix` before pushing
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines

## Merge Procedure

- Always merge pull requests with a merge commit (`--merge`)
- Never `--delete-branch` — the repo auto-deletes merged branches
- Always sync main after merge

```bash
gh pr merge <number> --merge
git checkout main && git pull
```

### Branch Full Flow

```bash
git checkout -b <type>/<name>
# ... commits ...
git push -u origin <type>/<name>
gh pr create --title "<title>" --body "<body>"
gh pr merge <number> --merge
git checkout main && git pull
```

## Release Procedure

- Stable tags are created automatically by `auto-tag.yml` when `package.json` changes on `main` — do NOT push tags manually after a release PR merges
- Never `git push --tags` — pushes all local tags including unintended ones
- Never create git tags for RC versions — tag only stable releases
- `auto-tag.yml` pushes an annotated tag whose message is only the version. The GitHub Release body is GitHub's automatically generated release notes (merged pull requests, contributors, full changelog) — do not write a changelog into the tag
- Pushing a stable tag triggers two GAs automatically: `release.yml` creates the GitHub Release and `publish.yml` publishes to npm — no local publish step needed
- Working tree must be clean before `bun pm version`

### Stable Release

```bash
bun pm version <x.y.z>
# bun pm version creates a local annotated tag. Delete it.
# auto-tag.yml creates the published tag after this PR merges.
git tag -d v<x.y.z>

git checkout -b release/v<x.y.z>
git push -u origin release/v<x.y.z>
gh pr create --title "chore: release v<x.y.z>" --body "..."
gh pr merge <number> --merge --auto
git checkout main && git pull

# auto-tag.yml pushes v<x.y.z> — no manual git push origin v<x.y.z>
# release.yml fills the GitHub Release with automatically generated notes
```

### RC / Pre-release

```bash
bun pm version prerelease --preid rc
bun run release --tag next
# commit + push via PR — NO git tag for RCs
```

### dist-tags

| Tag      | Use              |
| -------- | ---------------- |
| `latest` | stable releases  |
| `next`   | RC / pre-release |

## Agent Skills for Consumer Projects

`skills/use-archstone/` ships with the package since v1.1.0:

```bash
bun x skills add joao-coimbra/archstone
```

---

## Core Layer (`src/core`)

**Responsibility:** Zero domain knowledge. Pure TypeScript utilities usable in any project.

Nothing in this layer may import from `domain/`.

| Export               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `Either<L, R>`       | Discriminated union for type-safe error handling |
| `ValueObject<Props>` | Immutable objects defined by attributes          |
| `UniqueEntityId`     | UUID v7 wrapper for entity identity              |
| `WatchedList<T>`     | Collection that tracks additions/removals        |
| `DomainEvent`        | Marker interface for domain events               |
| `DomainEvents`       | Central registry and dispatcher — singleton      |
| `EventHandler<T>`    | Generic interface for side-effect handlers       |
| `Optional<T, K>`     | Utility type to make specific props optional     |

- Use `right(value)` / `left(error)`; never throw inside a use case
- `DomainEvents.dispatchEventsForAggregate()` takes a `UniqueEntityId` — never `.toValue()`
- `Findable.findById()` takes a `string` — pass `id.toValue()`; returns `Promise<Maybe<T>>` — use `.isNothing()` / `.value`
- Import `DomainEvent` / `DomainEvents` / `EventHandler<T>` from `archstone/core`
- In tests: `DomainEvents.clearHandlers()`, `clearMarkedAggregates()`, reset `shouldRun = true`
- Set `DomainEvents.shouldRun = false` to suppress dispatch without clearing handlers

---

## Domain / Enterprise (`src/domain/enterprise`)

**Responsibility:** Pure domain model. No framework, no infrastructure, no application logic.

Never import from `domain/application/` or infrastructure. Only imports from `core/` are allowed.

- Always provide a static `create()` factory — never expose the constructor
- Use `Optional<Props, K>` for props with defaults
- Raise events with `addDomainEvent()`; dispatch happens in infrastructure after persistence
- Never call `clearEvents()` manually
- Prefer `Either<Error, ValueObject>` from `create()` when callers must handle validation failure
- Repository implementations, use case logic, and framework imports do **not** belong here

---

## Domain / Application (`src/domain/application`)

**Responsibility:** Orchestration — use cases and repository contracts. No framework, no infrastructure.

Never import from infrastructure. Only imports from `core/` and `domain/enterprise/` are allowed.

- Every use case implements `UseCase<Input, Output>` and returns `Either` — never throws
- Error classes **implement** `UseCaseError` — they do not extend `Error`
- Define repositories as interfaces only; compose `Findable` / `Creatable` / `Saveable` / `Deletable` / `Repository`
- `Findable.findById()` takes a plain `string` and returns `Promise<Maybe<T>>` — never treat as `T | null`
- `Deletable.delete()` takes the **full entity**, not an id
- Inject repositories via constructor; never instantiate implementations inside a use case
- Keep `skills/use-archstone` updated whenever these contracts change (see Agent notes)

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bunx ultracite fix`
- **Check for issues**: `bunx ultracite check`
- **Diagnose setup**: `bunx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Write functions as arrow functions assigned to `const`, and define them above where they're used
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- When a hook dependency rule fires, first check whether the effect is needed, and whether adding the dependency changes when it runs
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- In JSX, work out a multi-way condition in a variable or helper above the `return`, not in a chain of ternaries

### Accessibility

- Use semantic HTML first; add ARIA only when no native element fits
- Provide meaningful alt text for images
- Use proper heading hierarchy
- Add labels for form inputs
- Make anything clickable a `<button>` or a link, so it works from the keyboard; don't add key handlers to a `<div>`
- Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting, and put braces around every `if` body, including a one-line guard
- Use a single ternary for a choice between two values. For three or more outcomes, use early returns or a lookup; never nest ternaries
- Group related code together and separate concerns
- Avoid import cycles; move shared code into a module both sides import
- Don't leave TODO or FIXME comments in new code. For an existing one, do the task, delete it if it's done, or leave it; never reword it to get past the linter

### Security

- Add `rel="noopener noreferrer"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Avoid barrel files (index files that only re-export other modules) inside an app; a package's entry point is fine
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome will catch most mechanical issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bunx ultracite fix` before committing to ensure compliance.
