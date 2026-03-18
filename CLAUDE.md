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

## Release Workflow

Master is branch-protected — all changes go through PRs. Follow this order exactly:

### Stable release (RC → x.y.z)

1. Commit any doc/CLAUDE.md changes needed
2. Bump version (working tree must be clean): `bun pm version <x.y.z>`
3. Publish to npm: `bun run release` — uses `latest` dist-tag
4. Push the version bump via PR:
   ```
   git checkout -b release/v<x.y.z>
   git push -u origin release/v<x.y.z>
   gh pr create ...
   gh pr merge <number> --merge
   git checkout master && git pull
   ```
5. Create an **annotated** tag (the GA reads its message for the GitHub Release body):
   ```
   git tag -a v<x.y.z> -m "v<x.y.z>\n\n- change 1\n- change 2"
   ```
6. Push the tag individually — **never** `git push --tags` (pushes unwanted local tags):
   ```
   git push origin v<x.y.z>
   ```

### RC / pre-release

1. Bump: `bun pm version prerelease --preid rc`
2. Publish: `bun run release --tag next` — uses `next` dist-tag
3. Commit + push via PR as normal — **do not create git tags for RC versions**

### dist-tags

- `latest` → stable releases
- `next` → RC/pre-release
- Never use `rc` as a dist-tag (deprecated)

### GA workflows

- **CI**: runs on every push to master and PRs — lint + tests
- **Release**: triggers on tag push `v*` — builds, zips dist, creates GitHub Release using the tag annotation as the body
- The GA does **not** publish to npm — that is always done locally before tagging
