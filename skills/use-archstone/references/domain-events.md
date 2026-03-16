# Domain Event Patterns

## Rules

- Raise events inside the aggregate via `this.addDomainEvent()`
- Dispatch **after** successful persistence — never before
- Define handlers as classes implementing `EventHandler` with `setupSubscriptions(): void`
- Register handlers in the infrastructure composition root before the first request
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
import type { EventHandler } from 'archstone/domain/enterprise'
import { DomainEvents } from 'archstone/domain/enterprise'

class OnUserCreated implements EventHandler {
  constructor(private readonly mailer: Mailer) {}

  setupSubscriptions(): void {
    DomainEvents.register(
      (event) => this.handle(event as UserCreatedEvent),
      UserCreatedEvent.name,
    )
  }

  private async handle(event: UserCreatedEvent): Promise<void> {
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
// Called once at app startup — in infrastructure, never in domain
new OnUserCreated(mailer).setupSubscriptions()
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
