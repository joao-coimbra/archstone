<div align="center">

<br />

# Archstone

### The TypeScript foundation for serious backend services.

Build on Domain-Driven Design and Clean Architecture — without writing the same boilerplate on every project.

[![failcraft](https://img.shields.io/badge/powered%20by-failcraft-F97316?style=for-the-badge)](https://github.com/joao-coimbra/failcraft)

<br />

[![npm version](https://img.shields.io/npm/v/archstone?style=for-the-badge&logo=npm&color=CB3837&logoColor=white)](https://www.npmjs.com/package/archstone)
[![license](https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![bun](https://img.shields.io/badge/Bun-ready-F9F1E1?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)

<br />

[Quick Start](#install) · [Why Archstone](#why-archstone) · [Usage](#usage) · [Agent Skills](#agent-skills-new-in-v110) · [Architecture](#architecture) · [Contributing](./CONTRIBUTING.md)

<br />

</div>

---

## Why Archstone?

Every backend project in DDD needs the same structural pieces — and most teams rewrite them from scratch each time. Archstone gives you a **battle-tested, minimal set of base classes and contracts** so you can skip the boilerplate and go straight to modeling your domain.

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

| | |
|---|---|
| **`Either`** | Functional error handling — use cases never throw |
| **`Maybe`** | Nullable value handling without null checks — `just`, `nothing`, `maybe` |
| **`Entity` / `AggregateRoot`** | Identity-based domain objects with built-in event support |
| **`ValueObject`** | Equality by value, not reference |
| **`UniqueEntityId`** | UUID v7 identity, consistent across your entire domain |
| **`WatchedList`** | Track additions and removals in collections without overwriting persistence |
| **`UseCase`** | Typed contract for application logic that always returns `Either` |
| **Repository contracts** | Define your interface in the domain — implement anywhere in infrastructure |
| **Agent Skills** | Built-in AI skill so your coding agent knows every DDD convention |

---

## Install

```bash
bun add archstone
# or
npm install archstone
```

> Minimal dependencies — only [failcraft](https://github.com/joao-coimbra/failcraft) for `Either` and `Maybe`. Pure TypeScript.

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

### `Maybe` — nullable values without null checks

```ts
import { Maybe, just, nothing, maybe } from 'archstone/core'

type FindUserResult = Maybe<User>

async function findUser(id: string): Promise<FindUserResult> {
  const user = await repo.findById(id)
  return maybe(user) // wraps null/undefined as nothing(), anything else as just()
}

const result = await findUser('123')

if (result.isNothing()) {
  console.log('not found')
} else {
  console.log(result.value) // User ✓
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
import type { EventHandler } from 'archstone/core'
import { DomainEvents } from 'archstone/core'

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

// Instantiate in infrastructure — handler self-registers via constructor
new OnUserCreated(mailer)

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
| `archstone` | Everything |
| `archstone/core` | `Either`, `Maybe`, `left`, `right`, `just`, `nothing`, `maybe`, `ValueObject`, `UniqueEntityId`, `WatchedList`, `Optional`, `DomainEvent`, `DomainEvents`, `EventHandler` |
| `archstone/domain` | All domain exports |
| `archstone/domain/enterprise` | `Entity`, `AggregateRoot` |
| `archstone/domain/application` | `UseCase`, `UseCaseError`, repository contracts |

All sub-paths share type declarations via a common chunk — mixing imports from multiple sub-paths is fully type-safe with no duplicate declaration conflicts.

---

## Architecture

```
src/
├── core/                    # Zero domain knowledge — pure language utilities
│   ├── value-object.ts      # Value equality base class
│   ├── unique-entity-id.ts  # UUID v7 identity wrapper
│   ├── watched-list.ts      # Change-tracked collection
│   ├── events/
│   │   ├── domain-event.ts  # Marker interface for all domain events
│   │   ├── domain-events.ts # Central registry and dispatcher (singleton)
│   │   └── event-handler.ts # Generic handler interface EventHandler<T>
│   └── types/
│       └── optional.ts      # Optional<T, K> helper type
│
└── domain/
    ├── enterprise/          # Pure domain model — zero framework dependencies
    │   └── entities/
    │       ├── entity.ts
    │       └── aggregate-root.ts
    │
    └── application/         # Orchestration — use cases & repository contracts
        ├── use-cases/
        │   ├── use-case.ts
        │   └── use-case.error.ts
        └── repositories/
            ├── repository.ts
            ├── findabe.ts
            ├── creatable.ts
            ├── saveble.ts
            └── deletable.ts
```

---

## Technology Stack

| | |
|---|---|
| **Language** | TypeScript 5+ |
| **Runtime / Package Manager** | [Bun](https://bun.sh) (required) |
| **Test Framework** | `bun:test` (built-in) |
| **Build Tool** | [bunup](https://github.com/nicepkg/bunup) |
| **Linter / Formatter** | [Biome](https://biomejs.dev) via [Ultracite](https://ultracite.dev) |
| **Dependencies** | [failcraft](https://github.com/joao-coimbra/failcraft) — `Either` and `Maybe` types |

---

## Development Workflow

Requirements: **Bun >= 1.0**

```bash
bun install          # install dev dependencies
bun test             # run tests
bun run build        # compile to dist/
bun x ultracite fix  # lint + format
```

Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`

Every commit must pass `bun test` and `bun x ultracite fix` before pushing.

---

## Coding Standards

- **Error handling:** never throw inside use cases — always return `left(error)` with `Either`
- **Imports:** always import from a layer's index (`archstone/core`, `archstone/domain/enterprise`), never from deep paths
- **Layer boundaries:** inner layers never import outer ones — `core` has zero domain knowledge, `enterprise` never imports `application`
- **Factories:** always provide a static `create()` factory on entities and value objects — never expose constructors directly
- **Style:** no semicolons, 2-space indent, double quotes (enforced by Biome via Ultracite)
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

---

## Testing

Framework: `bun:test`. Test files are `*.spec.ts` co-located with the source they test.

```ts
import { test, expect } from "bun:test"

test("example", () => {
  expect(1).toBe(1)
})
```

Use **in-memory repository implementations** for use case tests — never couple tests to a real database. Isolate domain event state between tests:

```ts
import { DomainEvents } from "archstone/core"
import { beforeEach } from "bun:test"

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
})
```

---

## Agent Skills — new in v1.1.0

Archstone ships with a built-in skill for AI coding agents. Once installed, your agent understands every DDD convention, layer boundary, and usage pattern — without you ever having to explain them.

**The skill covers:**
- Entities, aggregates, and value objects
- Use cases with `Either` error handling
- Repository contracts and in-memory implementations
- Domain events — raising, dispatching, and handling
- Testing patterns with `bun:test` and in-memory repos
- Common mistakes and how to avoid them

**Install with Claude Code:**

```bash
bun x skills add joao-coimbra/archstone
```

**Or copy from the installed package:**

```bash
cp -r node_modules/archstone/skills/use-archstone .claude/skills/
```

---

<div align="center">

**Built with ❤️ for the TypeScript community.**

[Contributing](./CONTRIBUTING.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [MIT License](./LICENSE)

</div>
