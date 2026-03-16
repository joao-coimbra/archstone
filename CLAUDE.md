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

```ts
import { Either } from "@/core/either"
import { Entity } from "@/domain/enterprise/entities/entity"
```

## Gotchas

Sharp edges that have caused real issues — check these before assuming a bug:

- `UseCaseError` must be `implements UseCaseError`, **not** `extends Error`
- `Deletable<T>.delete()` takes the full entity, not an id
- `DomainEvents.dispatchEventsForAggregate()` takes `UniqueEntityId`, not a string — never pass `.toValue()`
- `Findable<T>.findById()` takes `string` — pass `id.toValue()`, not the `UniqueEntityId` object
- `clearEvents()` is called internally by `dispatchEventsForAggregate` — never call it manually
- `EventHandler` is an interface — `implements EventHandler`, not `extends`
- `bun publish` does not add `node_modules/.bin` to PATH for lifecycle scripts — use `bunx <binary>` in scripts

## Agent Skills

`skills/archstone/` ships with the package since v1.1.0. Install into any consumer project:

```bash
bun x skills add joao-coimbra/archstone
```

## Contributing Workflow

- Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`
- Commit style: Conventional Commits (feat, fix, chore, docs, refactor, test)
- All commits must pass `bun test` and `bun x ultracite fix` before pushing
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for full contributor guidelines
- Publish: bump version with `bun pm version patch|minor|major`, then `bun publish --access public`
