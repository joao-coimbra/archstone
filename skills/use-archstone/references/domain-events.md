# Domain Event Patterns

## Rules

- Raise events inside the aggregate via `this.addDomainEvent()`
- Dispatch **after** successful persistence — never before
- Define handlers as classes implementing `EventHandler<T>` from `archstone/core` with `setupSubscriptions()` and `handle(event: T)`
- Call `setupSubscriptions()` in the constructor — just instantiate the handler in the composition root
- Dispatch via `DomainEvents.dispatchEventsForAggregate(aggregate.id)` — argument is `UniqueEntityId`
- `clearEvents()` is called internally by `dispatchEventsForAggregate` — do not call manually
- Test isolation: call `DomainEvents.clearHandlers()` and `DomainEvents.clearMarkedAggregates()` in `beforeEach`

## Raising Events (inside aggregate)

```ts
class User extends AggregateRoot<UserProps> {
  static create(props: Optional<UserProps, 'createdAt'>, id?: UniqueEntityId): User {
    const user = new User(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId(),
    )
    user.addDomainEvent(new UserCreatedEvent(user))
    return user
  }
}
```

## Defining a Handler

```ts
import type { EventHandler } from 'archstone/core'
import { DomainEvents } from 'archstone/core'

class OnUserCreated implements EventHandler<UserCreatedEvent> {
  constructor(private readonly mailer: Mailer) {
    this.setupSubscriptions()
  }

  setupSubscriptions(): void {
    DomainEvents.register(
      this.handle.bind(this),
      UserCreatedEvent.name,
    )
  }

  async handle(event: UserCreatedEvent): Promise<void> {
    await this.mailer.send(event.user.email.value)
  }
}
```

## Dispatching (in repository, after persistence)

```ts
async create(user: User): Promise<void> {
  await this.db.insert(user)
  DomainEvents.dispatchEventsForAggregate(user.id) // UniqueEntityId, not string
}
```

## Composition Root Registration

```ts
// setupSubscriptions() is called in the constructor — just instantiate
new OnUserCreated(mailer)
```

## Common Mistakes

```ts
// ❌ dispatching before persisting
DomainEvents.dispatchEventsForAggregate(user.id)
await this.db.insert(user) // wrong order

// ❌ passing string
DomainEvents.dispatchEventsForAggregate(user.id.toValue()) // use UniqueEntityId

// ❌ calling clearEvents() manually
user.clearEvents() // dispatchEventsForAggregate handles this
```
