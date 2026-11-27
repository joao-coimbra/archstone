---
name: archstone
description: 'Apply Archstone DDD and Clean Architecture conventions. Use when developers: (1) Create domain entities, aggregates, or value objects, (2) Write application use cases, (3) Define repository contracts, (4) Work with domain events or event handlers, (5) Ask about Either, Maybe, EntityId, UniqueEntityId, WatchedList, DomainEvents, shouldRun, or UseCaseError. Triggers on: "entity", "aggregate", "value object", "use case", "repository", "domain event", "Either", "Maybe", "EntityId", "UniqueEntityId", "WatchedList", "DomainEvents", "archstone".'
---

## Critical: Follow Archstone Conventions

Everything you know about DDD patterns may differ from how Archstone implements them. Always follow the rules below — do not apply generic DDD patterns that contradict them.

When working with Archstone:

1. Check `node_modules/archstone/` for the installed version
2. Import from public entry points only (`archstone/core`, `archstone/domain/enterprise`, `archstone/domain/application`) — never deep paths
3. All entities must extend `Entity<Props>` or `AggregateRoot<Props>` — never use plain classes
4. All value objects must extend `ValueObject<Props>`
5. Use cases must implement `UseCase<Input, Output>` and **never throw** — return `Either` or `Maybe`
6. `Findable.findById` returns `Promise<Maybe<T>>` — check with `.isNothing()` / `.isJust()`, unwrap with `.value` (never treat as `T | null`)
7. Repository contracts are interfaces only — implementations belong in infrastructure
8. Domain events are raised inside aggregates and dispatched after persistence — never before
9. Import `DomainEvent`, `DomainEvents`, and `EventHandler<T>` from `archstone/core` (enterprise re-exports are deprecated)
10. Identity is `EntityId` from `archstone/core`. `EntityId` and `EntityId.withDefault(fn)` ship in 1.6.0. `new EntityId()` stores no id, so the insert omits the key and the database assigns it. `new EntityId(value)` stores that string. A blank string throws. `EntityId.withDefault(fn)` returns an `EntityId` class whose `toValue()` is `string`: omitting the argument stores `fn()`, and passing a string stores that string. The value is never `undefined`. Never a plain `string`, and never insert `null` in place of an omitted key. `UniqueEntityId` exported by Archstone is deprecated and will be removed in 2.0. Until then `new UniqueEntityId()` still generates a UUID v7 with `Bun.randomUUIDv7`. New code does not import `UniqueEntityId` from Archstone. The project defines its own constructor with `EntityId.withDefault(fn)`
11. Use case errors must `implement UseCaseError` — not `extend Error`

If you are unsure about a pattern, check [Conventions Reference](references/conventions.md) before writing code.

## Layer Boundaries

Always respect the layer rules. Never place infrastructure code in `domain/`, and never import concrete implementations into use cases.

See [Layer Rules](references/layers.md) for details.

## Entities & Aggregates

Use a static `create()` factory. Pass `id` as the second constructor argument (not inside `Props`). Use `Optional<T, K>` for auto-generated fields like `createdAt`. See [Entity Patterns](references/entity.md).

## Value Objects

Use a static `create()` factory with validation. Prefer returning `Either` when callers must handle failure; if `create()` throws, wrap with `attempt()` or `try/catch` in use cases and return `left()`. See [Value Object Patterns](references/value-object.md).

## Use Cases

Implement `UseCase<Input, Output>`. Output is `Either<UseCaseError, Value>` or `Maybe<Value>`. Error classes must `implement UseCaseError`. See [Use Case Patterns](references/use-case.md).

## Repository Contracts

Define as interfaces only. Use `Repository<T>` or compose `Findable`, `Creatable`, `Saveable`, `Deletable`. `findById` takes `string` (`entity.id.toValue()`) and returns `Promise<Maybe<T>>`. See [Repository Patterns](references/repository.md).

## Domain Events

Raise inside the aggregate via `addDomainEvent()`. After persistence, `await DomainEvents.dispatchEventsForAggregate(aggregate.id)`. The events are cleared only after the handlers settle. Handlers implement `EventHandler<T>` from `archstone/core`. In tests, use `clearHandlers` / `clearMarkedAggregates` / `shouldRun`. See [Domain Event Patterns](references/domain-events.md).

## WatchedList

Subclass `WatchedList<T>` and implement `compareItems`. Use for aggregate-owned collections that need add/remove tracking. See [WatchedList Patterns](references/watched-list.md).

## Testing

Use `bun:test`. Co-locate test files as `*.spec.ts`. Use in-memory repository implementations. Isolate `DomainEvents` in `beforeEach`. See [Testing Patterns](references/testing.md).

## References

- [Conventions](references/conventions.md) — quick rules summary
- [Imports](references/imports.md) — import paths for all exports
- [Layers](references/layers.md) — layer boundary rules
- [Entity Patterns](references/entity.md) — Entity and AggregateRoot examples
- [Value Object Patterns](references/value-object.md) — ValueObject examples
- [Use Case Patterns](references/use-case.md) — UseCase, Either, and Maybe examples
- [Repository Patterns](references/repository.md) — repository interface and in-memory examples
- [Domain Event Patterns](references/domain-events.md) — EventHandler, shouldRun, and dispatch examples
- [WatchedList Patterns](references/watched-list.md) — collection change tracking
- [Testing Patterns](references/testing.md) — bun:test and in-memory repo examples
