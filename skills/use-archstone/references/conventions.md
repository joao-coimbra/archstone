# Archstone Conventions — Quick Reference

## Always

- Import from `archstone/core`, `archstone/domain/enterprise`, or `archstone/domain/application` — never deep paths
- Extend `Entity<Props>` or `AggregateRoot<Props>` for domain entities
- Extend `ValueObject<Props>` for value objects
- Use `UniqueEntityId` (UUID v7) for all entity identities — never `string`
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
- Never call `clearEvents()` manually — `dispatchEventsForAggregate` handles it
- Never pass `UniqueEntityId` to `findById()` — it takes `string`; use `.toValue()`
- Never treat a `Maybe` as `T | null` — `if (!maybe)` is always false
- Never use `===` to compare value objects — use `.equals()`
- Never import events/handlers from `archstone/domain/enterprise` — deprecated
