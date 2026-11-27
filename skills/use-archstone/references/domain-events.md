# Domain Event Patterns

## Rules

- Raise events inside the aggregate via `this.addDomainEvent()`
- Dispatch **after** successful persistence — never before
- Define handlers as classes implementing `EventHandler<T>` from `archstone/core` with `setupSubscriptions()` and `handle(event: T)`
- Call `setupSubscriptions()` in the constructor — just instantiate the handler in the composition root
- Dispatch via `await DomainEvents.dispatchEventsForAggregate(aggregate.id)` — argument is `UniqueEntityId`, and the promise settles when every handler for that save has settled
- `clearEvents()` runs only after those handlers settle — do not call it manually. A rejected handler rejects the dispatch and leaves the events in place
- Test isolation: `DomainEvents.clearHandlers()`, `DomainEvents.clearMarkedAggregates()`, and reset `DomainEvents.shouldRun = true`
- Set `DomainEvents.shouldRun = false` to skip dispatch without clearing handlers. The events stay on the aggregate until a later dispatch or `clearMarkedAggregates()`
- A dispatch that is still running does not deliver those same events again. An event raised while the handlers run stays pending for a later dispatch
- A handler that throws, including a synchronous throw, rejects the dispatch with `AggregateError` and the message `Domain event handlers failed.`

## DomainEvent shape

```ts
import type { DomainEvent, UniqueEntityId } from "archstone/core"

class UserCreatedEvent implements DomainEvent {
  occurredAt = new Date()
  constructor(public readonly user: User) {}
  getAggregateId(): UniqueEntityId {
    return this.user.id
  }
}
```

## Raising Events (inside aggregate)

```ts
class User extends AggregateRoot<UserProps> {
  static create(
    props: Optional<UserProps, "createdAt">,
    id?: UniqueEntityId
  ): User {
    const user = new User(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId()
    )
    user.addDomainEvent(new UserCreatedEvent(user))
    return user
  }
}
```

## Defining a Handler

```ts
import type { EventHandler } from "archstone/core"
import { DomainEvents } from "archstone/core"

class OnUserCreated implements EventHandler<UserCreatedEvent> {
  constructor(private readonly mailer: Mailer) {
    this.setupSubscriptions()
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), UserCreatedEvent.name)
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
  await DomainEvents.dispatchEventsForAggregate(user.id) // UniqueEntityId, not string
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
await DomainEvents.dispatchEventsForAggregate(user.id)
await this.db.insert(user) // wrong order

// ❌ passing string
DomainEvents.dispatchEventsForAggregate(user.id.toValue()) // use UniqueEntityId

// ❌ calling clearEvents() manually
user.clearEvents() // dispatchEventsForAggregate handles this

// ❌ EventHandler is exported from archstone/core
import { EventHandler } from "archstone/domain/enterprise"
```
