# Archstone Conventions — Quick Reference

## Always

- Import from `archstone/core`, `archstone/domain/enterprise`, or `archstone/domain/application` — never deep paths
- Extend `Entity<Props>` or `AggregateRoot<Props>` for domain entities
- Extend `ValueObject<Props>` for value objects
- Use `EntityId` for entity identity — never `string`. `new EntityId()` has no id. `new EntityId(value)` stores that string. `EntityId.withDefault(fn)` returns a constructor that uses `fn()` only when the argument is omitted. The `UniqueEntityId` exported by Archstone is deprecated, will be removed soon, and `new UniqueEntityId()` still generates a UUID v7 with `Bun.randomUUIDv7`. Move to `EntityId` or `EntityId.withDefault`
- Use static `create()` factory — never instantiate directly
- Return `Either<UseCaseError, Value>` or `Maybe<Value>` from use cases — never throw
- Treat `Findable.findById` as `Promise<Maybe<T>>` — use `.isNothing()` / `.value`
- Define repositories as interfaces only
- Raise domain events inside aggregates via `addDomainEvent()`
- Dispatch domain events **after** persistence
- Import `DomainEvent` / `DomainEvents` / `EventHandler<T>` from `archstone/core`

## Never

- Never throw inside a use case — use `left()` / `nothing()`
- Never use `extends Error` for use case errors — use `implements UseCaseError`
- Never place repository implementations in `domain/`
- Never import concrete classes into use cases
- Never dispatch domain events before persistence
- Never call `clearEvents()` or `acknowledge()` from a use case — `dispatchEventsForAggregate` removes the events it delivered and leaves any event raised during that dispatch pending
- Never pass `EntityId` to `findById()` — it takes `string`; use `.toValue()`
- Never treat a `Maybe` as `T | null` — `if (!maybe)` is always false
- Never use `===` to compare value objects — use `.equals()`
- Never import `EventHandler` from `archstone/domain/enterprise` — it is exported from `archstone/core`. `DomainEvent` and `DomainEvents` on the enterprise path are deprecated re-exports of the same symbols
