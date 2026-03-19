# Core Layer

**Responsibility:** Zero domain knowledge. Pure TypeScript utilities that can be used in any project regardless of domain.

Nothing in this layer may import from `domain/`. If a new utility needs domain concepts, it belongs elsewhere.

## What Lives Here

| Export | Purpose |
|--------|---------|
| `Either<L, R>` | Discriminated union for type-safe error handling — replaces exceptions |
| `ValueObject<Props>` | Base class for immutable objects defined by their attributes |
| `UniqueEntityId` | UUID v7 wrapper used as the identity type for all entities |
| `WatchedList<T>` | Abstract collection that tracks additions and removals for efficient persistence |
| `DomainEvent` | Marker interface every domain event must implement |
| `DomainEvents` | Central registry and dispatcher — singleton |
| `EventHandler<T>` | Generic interface for side-effect handlers |
| `Optional<T, K>` | Utility type to make specific props optional |

## Either

Use `right(value)` for success and `left(error)` for failure. Narrow with `.isRight()` / `.isLeft()`.

```ts
import { Either, left, right } from "@/core/index.ts"

function divide(a: number, b: number): Either<string, number> {
  if (b === 0) return left("division by zero")
  return right(a / b)
}
```

Never throw inside a use case — always return `left(error)`.

## ValueObject

Equality is determined by deep property comparison, not reference. Extend and call `super(props)`.

```ts
class Email extends ValueObject<{ value: string }> {
  get value() { return this.props.value }

  static create(value: string): Email {
    // validate here, return Either if needed
    return new Email({ value })
  }
}
```

## UniqueEntityId

Wraps UUID v7 (time-sortable). Auto-generates if no value is provided.

- `toValue()` → returns the raw string
- `equals(id)` → identity comparison

**Gotcha:** `DomainEvents.dispatchEventsForAggregate()` takes a `UniqueEntityId` — never pass `.toValue()` there.
**Gotcha:** `Findable.findById()` takes a `string` — pass `id.toValue()`, not the object.

## WatchedList

Abstract — subclass it and implement `compareItems(a, b): boolean`. Tracks what was added or removed since the list was last persisted so the repository only writes the diff.

```ts
class AttachmentList extends WatchedList<Attachment> {
  compareItems(a: Attachment, b: Attachment) {
    return a.id.equals(b.id)
  }
}
```

## DomainEvents

Singleton dispatcher. Infrastructure calls it **after** persistence succeeds.

```ts
// subscribe (called inside EventHandler.setupSubscriptions)
DomainEvents.register(this.handle.bind(this), UserCreatedEvent.name)

// dispatch all events queued for an aggregate (infrastructure layer only)
DomainEvents.dispatchEventsForAggregate(aggregate.id)
```

- `clearEvents()` is called internally by `dispatchEventsForAggregate` — never call it manually.
- In tests, call `DomainEvents.clearHandlers()` and `DomainEvents.clearMarkedAggregates()` to isolate state.

## EventHandler

Generic interface. Implement (not extend) with a concrete event type.

```ts
class OnUserCreated implements EventHandler<UserCreatedEvent> {
  constructor(private mailer: Mailer) {
    this.setupSubscriptions()
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), UserCreatedEvent.name)
  }

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.mailer.sendWelcome(event.user.email.value)
  }
}
```

Both `setupSubscriptions()` and `handle()` are required — the interface enforces both.
