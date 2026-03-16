# Archstone Conventions — Quick Reference

## Always

- Extend `Entity<Props>` or `AggregateRoot<Props>` for domain entities
- Extend `ValueObject<Props>` for value objects
- Use `UniqueEntityId` for all entity identities — never `string`
- Use static `create()` factory — never instantiate directly
- Return `Either<UseCaseError, Value>` from use cases — never throw
- Define repositories as interfaces only
- Raise domain events inside aggregates via `addDomainEvent()`
- Dispatch domain events **after** persistence

## Never

- Never throw inside a use case — use `left()`
- Never use `extends Error` for use case errors — use `implements UseCaseError`
- Never place repository implementations in `domain/`
- Never import concrete classes into use cases
- Never dispatch domain events before persistence
- Never call `clearEvents()` manually — `dispatchEventsForAggregate` handles it
- Never pass `UniqueEntityId` to `findById()` — it takes `string`; use `.toValue()`
- Never use `===` to compare value objects — use `.equals()`
