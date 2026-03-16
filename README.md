<div align="center">

# archstone

**TypeScript architecture foundation for backend services.**
Stop re-implementing DDD boilerplate. Focus on your domain.

[![npm](https://img.shields.io/npm/v/archstone?style=flat-square&color=black)](https://www.npmjs.com/package/archstone)
[![license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-5-black?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![bun](https://img.shields.io/badge/Bun-runtime-black?style=flat-square&logo=bun)](https://bun.sh)

</div>

---

Archstone gives you the structural pieces of **Domain-Driven Design** and **Clean Architecture** — entities, value objects, aggregates, domain events, use cases, and repository contracts — so every project starts from a solid, consistent foundation.

## Install

```bash
bun add archstone
# or
npm install archstone
```

## At a Glance

| Building block | What it does |
|---|---|
| `Entity` / `AggregateRoot` | Identity-based domain objects; aggregates raise domain events |
| `ValueObject` | Equality by value, not reference |
| `UniqueEntityId` | UUID v7 identity wrapper |
| `WatchedList` | Tracks additions and removals in a collection |
| `Either` | Functional error handling — no throwing in use cases |
| `UseCase` | Contract for application use cases returning `Either` |
| `Repository` | CRUD interface contracts — implementations live in infra |

## Usage

### Either — handle errors without throwing

```ts
import { Either, left, right } from 'archstone/core'

type Result = Either<UserNotFoundError, User>

async function findUser(id: string): Promise<Result> {
  const user = await repo.findById(id)
  if (!user) return left(new UserNotFoundError(id))
  return right(user)
}

const result = await findUser('123')

if (result.isLeft()) {
  console.error(result.value) // UserNotFoundError
} else {
  console.log(result.value)   // User
}
```

### Entity & AggregateRoot — model your domain

```ts
import { AggregateRoot } from 'archstone/domain/enterprise'
import { UniqueEntityId, Optional } from 'archstone/core'

interface OrderProps {
  customerId: UniqueEntityId
  total: number
  createdAt: Date
}

class Order extends AggregateRoot<OrderProps> {
  get customerId() { return this.props.customerId }
  get total()      { return this.props.total }

  static create(props: Optional<OrderProps, 'createdAt'>): Order {
    const order = new Order({
      ...props,
      createdAt: props.createdAt ?? new Date(),
    })
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

### ValueObject — equality by value

```ts
import { ValueObject } from 'archstone/core'

interface EmailProps { value: string }

class Email extends ValueObject<EmailProps> {
  get value() { return this.props.value }

  static create(raw: string): Email {
    if (!raw.includes('@')) throw new Error('Invalid email')
    return new Email({ value: raw.toLowerCase() })
  }
}

const a = Email.create('user@example.com')
const b = Email.create('user@example.com')
a.equals(b) // true
```

### WatchedList — track collection changes

```ts
import { WatchedList } from 'archstone/core'

class TagList extends WatchedList<Tag> {
  compareItems(a: Tag, b: Tag) { return a.id.equals(b.id) }
}

const tags = new TagList([existingTag])
tags.add(newTag)
tags.remove(existingTag)

tags.getNewItems()     // [newTag]
tags.getRemovedItems() // [existingTag]
```

### Domain Events — decouple side effects

```ts
import { DomainEvents } from 'archstone/domain/enterprise'

// Register a handler
DomainEvents.register(
  (event) => sendWelcomeEmail(event as UserCreatedEvent),
  UserCreatedEvent.name,
)

// Dispatch after persisting the aggregate
await userRepository.create(user)
DomainEvents.dispatchEventsForAggregate(user.id)
```

### Repository Contracts — keep infra out of your domain

```ts
import { Repository, Creatable } from 'archstone/domain/application'

// Compose the interface you need
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}

// Or only what you need
export interface AuditRepository extends Creatable<AuditLog> {}
```

## Package Exports

```
archstone/core              → Either, ValueObject, UniqueEntityId, WatchedList, Optional
archstone/domain            → all domain exports
archstone/domain/enterprise → Entity, AggregateRoot, DomainEvent, DomainEvents, EventHandler
archstone/domain/application → UseCase, UseCaseError, repository contracts
```

## Layer Architecture

```
src/
├── core/                   # Zero domain knowledge — pure utilities
│   ├── either.ts
│   ├── value-object.ts
│   ├── unique-entity-id.ts
│   ├── watched-list.ts
│   └── types/optional.ts
│
└── domain/
    ├── enterprise/         # Pure domain model — no framework deps
    │   ├── entities/
    │   │   ├── entity.ts
    │   │   └── aggregate-root.ts
    │   └── events/
    │       ├── domain-event.ts
    │       ├── domain-events.ts
    │       └── event-handler.ts
    │
    └── application/        # Use cases & repository contracts
        ├── use-cases/
        │   ├── use-case.ts
        │   └── use-case.error.ts
        └── repositories/
            ├── repository.ts
            ├── findable.ts
            ├── creatable.ts
            ├── saveable.ts
            └── deletable.ts
```

---

<div align="center">

[Contributing](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [MIT License](./LICENSE)

</div>
