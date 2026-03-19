# Archstone — AI Instructions

## Project Overview

Archstone is a TypeScript architecture foundation for backend services based on Domain-Driven Design (DDD) and Clean Architecture. It provides reusable base classes, contracts, and utilities that eliminate boilerplate across projects.

## Architecture Principles

- **core/** — zero domain knowledge; pure language utilities (`Either`, `ValueObject`, `UniqueEntityId`, `WatchedList`)
- **domain/enterprise/** — pure domain model; no framework or infrastructure dependencies
- **domain/application/** — orchestration layer; use cases and repository contracts only
- Infrastructure implementations (database adapters, HTTP handlers) belong outside this library

## Runtime & Tooling

Use **Bun** exclusively — do not use Node.js, npm, yarn, or pnpm.

| Task | Command |
|------|---------|
| Install dependencies | `bun install` |
| Run tests | `bun test` |
| Build | `bun run build` |
| Lint & format | `bun x ultracite fix` |
| Publish | `bun publish --access public` |
| Bump version | `bun pm version patch\|minor\|major` |

## Code Conventions

- All entities must extend `Entity<Props>` or `AggregateRoot<Props>`
- All value objects must extend `ValueObject<Props>`
- Use cases must implement `UseCase<Input, Output>` and return `Either` — never throw
- Repository contracts are interfaces only; never place implementations in `domain/`
- Use `UniqueEntityId` for all entity identifiers (UUID v7)
- Use `Optional<T, K>` to make props optional in factory methods
- Use `WatchedList<T>` for tracked collections inside aggregates
- Domain events: raise inside aggregate via `addDomainEvent`, dispatch in infrastructure after persistence

## Testing

Use `bun test` with `bun:test`.

```ts
import { test, expect } from "bun:test"

test("example", () => {
  expect(1).toBe(1)
})
```

- Test files: `*.spec.ts` co-located with the source file
- Keep tests focused on behavior, not implementation details
- Use in-memory repository implementations for use case tests

## Path Aliases

`@/` resolves to `src/` — use it for all internal imports.

Always import from the **entry-point index**, never from deep file paths. Deep imports cause the dts bundler to inline type declarations into each sub-path bundle, which breaks TypeScript's nominal typing when a consumer mixes sub-path imports.

```ts
// ✅ correct — import from entry-point index
import { Either } from "@/core/index.ts"
import { UniqueEntityId } from "@/core/index.ts"

// ❌ wrong — deep path causes dts inlining and type conflicts
import { Either } from "@/core/either.ts"
import { UniqueEntityId } from "@/core/unique-entity-id.ts"
```

## Gotchas

Sharp edges that have caused real issues — check these before assuming a bug:

- `UseCaseError` must be `implements UseCaseError`, **not** `extends Error`
- `Deletable<T>.delete()` takes the full entity, not an id
- `DomainEvents.dispatchEventsForAggregate()` takes `UniqueEntityId`, not a string — never pass `.toValue()`
- `Findable<T>.findById()` takes `string` — pass `id.toValue()`, not the `UniqueEntityId` object
- `clearEvents()` is called internally by `dispatchEventsForAggregate` — never call it manually
- `EventHandler<T>` is a generic interface — `implements EventHandler<YourEvent>`, not `extends`; requires both `setupSubscriptions()` and `handle(event: T): Promise<void>`
- `bun publish` does not add `node_modules/.bin` to PATH for lifecycle scripts — use `bunx <binary>` in scripts
- Internal imports must use entry-point indices (`@/core/index.ts`), not deep paths — deep paths cause the dts bundler to inline type declarations into each sub-path bundle, which breaks TypeScript's nominal typing for types with `private` fields (e.g. `UniqueEntityId`) when consumers mix sub-path imports

## Agent Skills

`skills/use-archstone/` ships with the package since v1.1.0. Install into any consumer project:

```bash
bun x skills add joao-coimbra/archstone
```

## Contributing Workflow

- Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`
- Commit style: Conventional Commits (feat, fix, chore, docs, refactor, test)
- All commits must pass `bun test` and `bun x ultracite fix` before pushing
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for full contributor guidelines

## Merge Procedure

- Never use `--squash` — rewrites history and causes local divergence on `git pull`
- Never use `--delete-branch` — repo auto-deletes merged branches
- Always sync local master with `git pull` after merge

```bash
gh pr merge <number> --merge
git checkout master && git pull
```

### Feature / Fix / Docs Branch Full Flow

```bash
# Create branch
git checkout -b <type>/<name>

# ... commits ...

# Push and open PR
git push -u origin <type>/<name>
gh pr create --title "<title>" --body "<body>"

# Merge and sync
gh pr merge <number> --merge
git checkout master && git pull
```

## Release Procedure

- Never use `git push --tags` — pushes all local tags including unwanted ones
- Never create git tags for RC versions
- Always use annotated tags (`-a`) — the Release GA reads the tag message as the GitHub Release body
- GA does **not** publish to npm — always publish locally before tagging
- Working tree must be clean before `bun pm version`

### Stable Release (RC → x.y.z)

```bash
# 1. Bump version
bun pm version <x.y.z>

# 2. Publish to npm (latest dist-tag)
bun run release

# 3. Push version bump via PR
git checkout -b release/v<x.y.z>
git push -u origin release/v<x.y.z>
gh pr create --title "chore: release v<x.y.z>" --body "..."
gh pr merge <number> --merge
git checkout master && git pull

# 4. Create annotated tag — message becomes the GitHub Release body
git tag -a v<x.y.z> -m "v<x.y.z>

- change 1
- change 2"

# 5. Push tag individually
git push origin v<x.y.z>
```

### RC / Pre-release

```bash
bun pm version prerelease --preid rc
bun run release --tag next
# commit + push via PR as normal — NO git tag
```

### dist-tags

| Tag | Use |
|-----|-----|
| `latest` | stable releases |
| `next` | RC / pre-release (never use `rc` — deprecated) |

### GA Workflows

- **CI**: runs on every master push and PR — lint + tests
- **Release**: triggers on `v*` tag push — builds, zips dist, creates GitHub Release using tag annotation as body

## Code Quality (Ultracite / Biome)

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Most issues are automatically fixable. Run `bun x ultracite fix` before committing.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers — extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions — don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully — don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
