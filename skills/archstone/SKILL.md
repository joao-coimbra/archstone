---
name: archstone
description: Complete Archstone conventions for DDD and Clean Architecture — apply when writing entities, value objects, use cases, repositories, or domain events in a project that has archstone installed
---

## Trigger

Apply whenever writing code in a project that has `archstone` installed and the work touches domain objects, use cases, repositories, or any DDD/Clean Architecture concept.

---

## Layer Boundaries

- `core/` — zero domain knowledge; pure language utilities (`Either`, `ValueObject`, `UniqueEntityId`, `WatchedList`)
- `domain/enterprise/` — pure domain model; no framework or infrastructure dependencies
- `domain/application/` — use cases and repository contracts only
- Infrastructure (databases, HTTP, ORMs) lives **outside** these layers — never inside `domain/`

---

## Imports

| What | Import path |
|---|---|
| `Either`, `left`, `right`, `ValueObject`, `UniqueEntityId`, `WatchedList`, `Optional` | `archstone/core` |
| `Entity`, `AggregateRoot`, `DomainEvents`, `EventHandler` | `archstone/domain/enterprise` |
| `UseCase`, `UseCaseError`, `Repository`, `Findable`, `Creatable`, `Saveable`, `Deletable` | `archstone/domain/application` |

---

## Entity & AggregateRoot

- Extend `Entity<Props>` for identity-only entities; extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- `id` goes in `Props` as `Optional` and is also passed as the second constructor argument
- Use `Optional<T, K>` to mark auto-generated fields (e.g. `'id' | 'createdAt'`)
- Use `UniqueEntityId` for all identities — never a plain `string`
- Raise events inside the aggregate via `this.addDomainEvent()` — never outside

```ts
import { AggregateRoot } from 'archstone/domain/enterprise'
import { UniqueEntityId, type Optional } from 'archstone/core'

interface OrderProps {
  customerId: UniqueEntityId
  total: number
  createdAt: Date
}

class Order extends AggregateRoot<OrderProps> {
  get customerId() { return this.props.customerId }
  get total()      { return this.props.total }

  static create(props: Optional<OrderProps, 'createdAt'>, id?: UniqueEntityId): Order {
    const order = new Order(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId(),
    )
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

**Mistake:** Adding `id: string` in Props, not passing id as the second constructor arg, or using a plain class instead of `Entity`/`AggregateRoot`.

---

## ValueObject

- Extend `ValueObject<Props>`
- Static `create()` factory with validation — may throw on invalid input (intentional)
- Never mutate `this.props` — return a new instance instead
- Compare with `.equals()` — never `===`

```ts
import { ValueObject } from 'archstone/core'

interface EmailProps { value: string }

class Email extends ValueObject<EmailProps> {
  get value() { return this.props.value }

  static create(raw: string): Email {
    if (!raw.includes('@')) throw new Error('Invalid email address')
    return new Email({ value: raw.toLowerCase().trim() })
  }
}

const a = Email.create('user@example.com')
const b = Email.create('user@example.com')
a.equals(b) // true — compared by value, not reference
```

**Mistake:** Using `===` to compare value objects, or mutating `this.props` directly.

---

## UseCase + Either

- Implement `UseCase<Input, Output>`
- Output is always `Either<UseCaseError, Value>` — **never throw**
- The left side must be a class that `implements UseCaseError` (requires `message: string`) — not `extends Error`
- When constructing value objects inside a use case, wrap in `try/catch` and return `left()`
- Inject repositories via constructor typed as the **interface**, not the concrete class

```ts
import type { UseCase, UseCaseError } from 'archstone/domain/application'
import { Either, left, right } from 'archstone/core'

class UserNotFoundError implements UseCaseError {
  message = 'User not found.'
}

class InvalidEmailError implements UseCaseError {
  message = 'Invalid email address.'
}

type Input  = { userId: string; newEmail: string }
type Output = Either<UserNotFoundError | InvalidEmailError, User>

class UpdateUserEmailUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {} // interface, not concrete

  async execute({ userId, newEmail }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    if (!user) return left(new UserNotFoundError())

    try {
      const email = Email.create(newEmail) // may throw
      user.updateEmail(email)
    } catch {
      return left(new InvalidEmailError())
    }

    await this.repo.save(user)
    return right(user)
  }
}
```

**Mistake:** Using `left(new Error('...'))`, throwing instead of returning `left()`, or injecting a concrete repository class.

---

## Repository Contracts

- Interfaces only — never place implementations inside `domain/`
- Extend `Repository<T>` for full CRUD, or compose granular interfaces:
  - `Findable<T>` — `findById(id: string)` — takes `string`; pass `entity.id.toValue()`
  - `Creatable<T>` — `create(entity: T)`
  - `Saveable<T>` — `save(entity: T)`
  - `Deletable<T>` — `delete(entity: T)` — takes full entity, not an id
- Implementations belong in infrastructure — inject as the interface type

```ts
import type { Repository, Creatable } from 'archstone/domain/application'

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}

// Compose only what you need
export interface AuditRepository extends Creatable<AuditLog> {}
```

**Mistake:** Importing a concrete repository inside a use case, or passing `UniqueEntityId` to `findById` (it takes `string` — use `.toValue()`).

---

## Domain Events

- Raise events inside the aggregate via `this.addDomainEvent()`
- Dispatch **after** successful persistence — never before
- Define handlers as classes that `implement EventHandler` with `setupSubscriptions(): void`
- Call `handler.setupSubscriptions()` in the infrastructure composition root (bootstrap) before the first request
- After persisting, call `DomainEvents.dispatchEventsForAggregate(aggregate.id)` — argument is `UniqueEntityId`
- `aggregate.clearEvents()` is called **internally** by `dispatchEventsForAggregate` — do not call it manually
- Test isolation: call `DomainEvents.clearHandlers()` and `DomainEvents.clearMarkedAggregates()` in `beforeEach`

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

// Composition root
new OnUserCreated(mailer).setupSubscriptions()

// Inside repository, after persisting
await this.db.insert(user)
DomainEvents.dispatchEventsForAggregate(user.id) // UniqueEntityId, not string
```

**Mistake:** Dispatching before persistence, passing `user.id.toValue()` to `dispatchEventsForAggregate`, or calling `clearEvents()` manually.

---

## Testing

- Use `bun:test` — import `test`, `expect`, `beforeEach` from `bun:test`
- Test files: `*.spec.ts` co-located with the source file
- Use in-memory repository implementations for use case tests

```ts
import { test, expect, beforeEach } from 'bun:test'

const repo = new InMemoryUserRepository()
const useCase = new GetUserUseCase(repo)

test('returns user when found', async () => {
  const user = User.create({ name: 'João' })
  await repo.create(user)

  const result = await useCase.execute({ userId: user.id.toValue() })

  expect(result.isRight()).toBe(true)
})
```
