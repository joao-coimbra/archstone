# archstone

[![npm version](https://img.shields.io/npm/v/archstone?style=flat-square)](https://www.npmjs.com/package/archstone)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-runtime-black?style=flat-square&logo=bun)](https://bun.sh)

> TypeScript architecture foundation for backend services based on Domain-Driven Design (DDD) and Clean Architecture.

Archstone provides the core building blocks — entities, value objects, aggregates, domain events, use cases, and repository contracts — so you can focus on your domain logic instead of re-implementing the same structural patterns across every project.

## Installation

```bash
bun add archstone
# or
npm install archstone
```

## Packages

| Import path | Contents |
|---|---|
| `archstone/core` | `Either`, `ValueObject`, `UniqueEntityId`, `WatchedList`, `Optional` |
| `archstone/domain` | All domain exports |
| `archstone/domain/enterprise` | `Entity`, `AggregateRoot`, `DomainEvent`, `DomainEvents`, `EventHandler` |
| `archstone/domain/application` | `UseCase`, `UseCaseError`, repository contracts |

## Architecture

```
src/
├── core/          # Language-level utilities with no domain knowledge
│   ├── either.ts              # Functional error handling (Left / Right)
│   ├── value-object.ts        # Base class for value objects
│   ├── unique-entity-id.ts    # UUID v7 identity wrapper
│   ├── watched-list.ts        # Change-tracked collection for aggregates
│   └── types/
│       └── optional.ts        # Optional<T, K> utility type
│
└── domain/
    ├── enterprise/            # Pure domain model — no framework deps
    │   ├── entities/
    │   │   ├── entity.ts          # Identity-based base entity
    │   │   └── aggregate-root.ts  # Event-raising aggregate base
    │   └── events/
    │       ├── domain-event.ts    # DomainEvent interface
    │       ├── domain-events.ts   # Singleton registry & dispatcher
    │       └── event-handler.ts   # EventHandler interface
    │
    └── application/           # Orchestration — use cases & repository contracts
        ├── use-cases/
        │   ├── use-case.ts        # UseCase<Input, Output> interface
        │   └── use-case.error.ts  # Base error type for use case failures
        └── repositories/
            ├── repository.ts      # Full CRUD contract (composed)
            ├── findabe.ts         # Findable<T>
            ├── creatable.ts       # Creatable<T>
            ├── saveble.ts         # Saveable<T>
            └── deletable.ts       # Deletable<T>
```

## Core Concepts

### Either — functional error handling

Use cases never throw. They return an `Either<Error, Value>` — left for failure, right for success.

```ts
import { Either, left, right } from "archstone/core"

type Result = Either<UserNotFoundError, User>

async function findUser(id: string): Promise<Result> {
  const user = await repo.findById(id)
  if (!user) return left(new UserNotFoundError(id))
  return right(user)
}

const result = await findUser("123")
if (result.isLeft()) console.error(result.value) // UserNotFoundError
else console.log(result.value)                    // User
```

### Entity & AggregateRoot

Entities are defined by identity. Aggregates extend that with domain event support.

```ts
import { AggregateRoot } from "archstone/domain/enterprise"
import { UniqueEntityId, Optional } from "archstone/core"

interface OrderProps {
  customerId: UniqueEntityId
  total: number
  createdAt: Date
}

class Order extends AggregateRoot<OrderProps> {
  get customerId() { return this.props.customerId }
  get total() { return this.props.total }

  static create(props: Optional<OrderProps, "createdAt">): Order {
    const order = new Order(
      { ...props, createdAt: props.createdAt ?? new Date() },
    )
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

### ValueObject

Value objects are equal by their properties, not by reference.

```ts
import { ValueObject } from "archstone/core"

interface EmailProps { value: string }

class Email extends ValueObject<EmailProps> {
  get value() { return this.props.value }

  static create(raw: string): Email {
    if (!raw.includes("@")) throw new Error("Invalid email")
    return new Email({ value: raw.toLowerCase() })
  }
}
```

### WatchedList

Track additions and removals in a collection without rewriting the whole thing on save.

```ts
import { WatchedList } from "archstone/core"

class TagList extends WatchedList<Tag> {
  compareItems(a: Tag, b: Tag) { return a.id.equals(b.id) }
}

const tags = new TagList([existingTag])
tags.add(newTag)
tags.remove(existingTag)

tags.getNewItems()     // [newTag]
tags.getRemovedItems() // [existingTag]
```

### Domain Events

Events are raised inside aggregates and dispatched by the infrastructure layer after successful persistence.

```ts
import { DomainEvents } from "archstone/domain/enterprise"

// register a handler
DomainEvents.register(
  (event) => sendWelcomeEmail(event as UserCreatedEvent),
  UserCreatedEvent.name,
)

// infrastructure dispatches after persisting
await userRepository.create(user)
DomainEvents.dispatchEventsForAggregate(user.id)
```

### Repository Contracts

Repositories are defined as interfaces in the application layer. Implementations live in infrastructure.

```ts
import { Repository, Creatable } from "archstone/domain/application"

// application/repositories/user-repository.ts
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}

// or compose only what you need
export interface AuditRepository extends Creatable<AuditLog> {}
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](./LICENSE).
