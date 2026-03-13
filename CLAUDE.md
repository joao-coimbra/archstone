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
| Execute a file | `bun <file>` |
| Run a script | `bun run <script>` |
| Build | `bun build <file>` |

- `Bun.serve()` — HTTP/WebSocket server (not express)
- `bun:sqlite` — SQLite (not better-sqlite3)
- `Bun.sql` — Postgres (not pg)
- `Bun.redis` — Redis (not ioredis)
- `Bun.file` — file I/O (not node:fs)
- Bun auto-loads `.env` — do not use dotenv

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
