---
name: archstone
description: 'Apply Archstone DDD and Clean Architecture conventions. Use when developers: (1) Create domain entities, aggregates, or value objects, (2) Write application use cases, (3) Define repository contracts, (4) Work with domain events or event handlers, (5) Ask about Either, UniqueEntityId, WatchedList, or UseCaseError. Triggers on: "entity", "aggregate", "value object", "use case", "repository", "domain event", "Either", "UniqueEntityId", "archstone".'
---

## Critical: Follow Archstone Conventions

Everything you know about DDD patterns may differ from how Archstone implements them. Always follow the rules below — do not apply generic DDD patterns that contradict them.

When working with Archstone:

1. Check `node_modules/archstone/` for the installed version
2. All entities must extend `Entity<Props>` or `AggregateRoot<Props>` — never use plain classes
3. All value objects must extend `ValueObject<Props>`
4. Use cases must implement `UseCase<Input, Output>` and **never throw** — always return `Either`
5. Repository contracts are interfaces only — implementations belong in infrastructure
6. Domain events are raised inside aggregates and dispatched after persistence — never before
7. Use `UniqueEntityId` for all entity identifiers — never a plain `string`
8. The left side of `Either` must `implement UseCaseError` — not `extend Error`

If you are unsure about a pattern, check [Conventions Reference](references/conventions.md) before writing code.

## Layer Boundaries

Always respect the layer rules. Never place infrastructure code in `domain/`, and never import concrete implementations into use cases.

See [Layer Rules](references/layers.md) for details.

## Entities & Aggregates

Use a static `create()` factory. Pass `id` as the second constructor argument. Use `Optional<T, K>` for auto-generated fields. See [Entity Patterns](references/entity.md).

## Value Objects

Use a static `create()` factory with validation. Value object `create()` may throw — wrap calls inside use cases with `try/catch` and return `left()`. See [Value Object Patterns](references/value-object.md).

## Use Cases

Implement `UseCase<Input, Output>`. Return `left()` for errors, `right()` for success. Error classes must `implement UseCaseError`. See [Use Case Patterns](references/use-case.md).

## Repository Contracts

Define as interfaces only. Use `Repository<T>` or compose `Findable`, `Creatable`, `Saveable`, `Deletable`. Note: `findById` takes `string` — pass `entity.id.toValue()`. See [Repository Patterns](references/repository.md).

## Domain Events

Raise inside the aggregate via `addDomainEvent()`. Dispatch after persistence via `DomainEvents.dispatchEventsForAggregate(aggregate.id)`. Define handlers as classes implementing `EventHandler<T>`. See [Domain Event Patterns](references/domain-events.md).

## Testing

Use `bun:test`. Co-locate test files as `*.spec.ts`. Use in-memory repository implementations. See [Testing Patterns](references/testing.md).

## References

- [Conventions](references/conventions.md) — quick rules summary
- [Imports](references/imports.md) — import paths for all exports
- [Layers](references/layers.md) — layer boundary rules
- [Entity Patterns](references/entity.md) — Entity and AggregateRoot examples
- [Value Object Patterns](references/value-object.md) — ValueObject examples
- [Use Case Patterns](references/use-case.md) — UseCase and Either examples
- [Repository Patterns](references/repository.md) — repository interface and in-memory examples
- [Domain Event Patterns](references/domain-events.md) — EventHandler and dispatch examples
- [Testing Patterns](references/testing.md) — bun:test and in-memory repo examples
