<div align="center">

# Archstone

### The TypeScript foundation for serious backend services.

Build on Domain-Driven Design and Clean Architecture — without writing the same boilerplate on every project.

<br />

[![npm version](https://img.shields.io/npm/v/archstone?style=for-the-badge&logo=npm&color=CB3837&logoColor=white)](https://www.npmjs.com/package/archstone)
[![license](https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![bun](https://img.shields.io/badge/Bun-ready-F9F1E1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)

</div>

---

## Why archstone?

Every backend project in DDD needs the same structural pieces — and most teams rewrite them from scratch each time. Archstone gives you a **battle-tested, zero-dependency set of base classes and contracts** so you can skip the boilerplate and go straight to modeling your domain.

```ts
// ❌ Before — scattered, inconsistent, no error contract
class User { id: string }
function createUser() { throw new Error('not found') }

// ✅ After — structured, predictable, type-safe
class User extends AggregateRoot<UserProps> { ... }
async function createUser(): Promise<Either<NotFoundError, User>> { ... }
```

---

## Features

- **`Either`** — functional error handling; use cases never throw
- **`Entity` / `AggregateRoot`** — identity-based domain objects with built-in event support
- **`ValueObject`** — equality by value, not reference
- **`UniqueEntityId`** — UUID v7 identity, consistent across your entire domain
- **`WatchedList`** — track additions and removals in collections without overwriting persistence
- **`UseCase`** — typed contract for application logic
- **Repository contracts** — define your interface in the domain; implement in infrastructure

---

## Install

```bash
bun add archstone
# or
npm install archstone
```

> Zero runtime dependencies. Pure TypeScript.

---

## Usage

### `Either` — stop throwing, start returning

```ts
import { Either, left, right } from 'archstone/core'

type FindUserResult = Either<UserNotFoundError, User>

async function findUser(id: string): Promise<FindUserResult> {
  const user = await repo.findById(id)

  if (!user) return left(new UserNotFoundError(id))
  return right(user)
}

// The caller always handles both cases — no surprises
const result = await findUser('123')

if (result.isLeft()) {
  console.error(result.value) // UserNotFoundError
} else {
  console.log(result.value)   // User ✓
}
```

---

### `Entity` & `AggregateRoot` — model your domain

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

    // Raise domain events from inside the aggregate
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

---

### `ValueObject` — equality that makes sense

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

a.equals(b) // ✅ true — compared by value, not reference
```

---

### `WatchedList` — persist only what changed

```ts
import { WatchedList } from 'archstone/core'

class TagList extends WatchedList<Tag> {
  compareItems(a: Tag, b: Tag) { return a.id.equals(b.id) }
}

const tags = new TagList([existingTag])
tags.add(newTag)
tags.remove(existingTag)

// Send only the diff to your repository — not the whole list
tags.getNewItems()     // → [newTag]
tags.getRemovedItems() // → [existingTag]
```

---

### Domain Events — decouple side effects

```ts
import { DomainEvents } from 'archstone/domain/enterprise'

// Register handlers anywhere in your infrastructure layer
DomainEvents.register(
  (event) => sendWelcomeEmail(event as UserCreatedEvent),
  UserCreatedEvent.name,
)

// Dispatch after persistence — events stay inside the aggregate until then
await userRepository.create(user)
DomainEvents.dispatchEventsForAggregate(user.id)
```

---

### Repository Contracts — keep infrastructure out of your domain

```ts
import { Repository, Creatable } from 'archstone/domain/application'

// Define your contract in the application layer
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}

// Compose only what you need
export interface AuditRepository extends Creatable<AuditLog> {}

// Implement anywhere in infrastructure — domain stays clean
```

---

## Package Exports

| Import | Contents |
|---|---|
| `archstone/core` | `Either`, `ValueObject`, `UniqueEntityId`, `WatchedList`, `Optional` |
| `archstone/domain` | All domain exports |
| `archstone/domain/enterprise` | `Entity`, `AggregateRoot`, `DomainEvent`, `DomainEvents`, `EventHandler` |
| `archstone/domain/application` | `UseCase`, `UseCaseError`, repository contracts |

---

## Architecture

```
src/
├── core/                    # Zero domain knowledge — pure language utilities
│   ├── either.ts            # Left / Right functional result type
│   ├── value-object.ts      # Value equality base class
│   ├── unique-entity-id.ts  # UUID v7 identity wrapper
│   ├── watched-list.ts      # Change-tracked collection
│   └── types/
│       └── optional.ts      # Optional<T, K> helper type
│
└── domain/
    ├── enterprise/          # Pure domain model — zero framework dependencies
    │   ├── entities/
    │   │   ├── entity.ts
    │   │   └── aggregate-root.ts
    │   └── events/
    │       ├── domain-event.ts
    │       ├── domain-events.ts
    │       └── event-handler.ts
    │
    └── application/         # Orchestration — use cases & repository contracts
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

**Built with care for the TypeScript community.**

[Contributing](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [MIT License](./LICENSE)

</div>
