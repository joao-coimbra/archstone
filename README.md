# Archstone

Archstone is a TypeScript library of base classes and contracts for backend services organized with Domain-Driven Design and Clean Architecture.

It gives every service the same inner structure: a domain model, use cases, and repository interfaces. Your project keeps the outer layer — HTTP, database, queues, and mail.

[![npm version](https://img.shields.io/npm/v/archstone?logo=npm)](https://www.npmjs.com/package/archstone)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## What it is

Archstone covers the three inner layers of a backend:

```
your infrastructure     HTTP handlers, database adapters, mail, queues
        │
        ▼
application             use cases and repository interfaces
        │
        ▼
enterprise              entities, aggregates, and value objects
        │
        ▼
core                    results, identity, equality, and domain events
```

Each layer depends only on the layers below it. Archstone ships `core`, `enterprise`, and `application`. You write the infrastructure.

| Layer | What you get |
| --- | --- |
| `archstone/core` | `Either`, `Maybe`, `ValueObject`, `UniqueEntityId`, `WatchedList`, domain events |
| `archstone/domain/enterprise` | `Entity`, `AggregateRoot` |
| `archstone/domain/application` | `UseCase`, `UseCaseError`, repository interfaces |
| `archstone` | Every public export |

Import from these entry points. They are the supported public API.

## When to use it

Use Archstone when you want the business rules, the application operations, and the storage boundary to follow one shape across modules and services.

It fits a backend where:

- Rules such as "this email is valid" or "this order can be placed" live on domain objects
- Each operation is a use case with a typed input and a typed result
- The use case depends on a repository interface, and a database class implements that interface elsewhere
- Work that follows a successful save — a welcome email, a notification — runs from a domain event

You choose the HTTP stack and the database. Archstone runs on [Bun](https://bun.sh) 1.4 or newer and supplies the shared language for the domain and the application.

A step-by-step build of a registration feature is in the [tutorial](./docs/tutorial.md).

## Why it helps

- **The structure is already decided.** A new module starts from `AggregateRoot`, `UseCase`, and a repository interface, so it matches the rest of the service.
- **Success and failure are both visible.** A use case returns `right(value)` or `left(error)`. A missing record is `nothing()`. The caller handles both outcomes in the type.
- **The domain stays testable.** Use cases receive repository interfaces. Tests pass an in-memory implementation and leave the database out.
- **Side effects follow a successful save.** The aggregate records what happened. You dispatch those events after persistence, which keeps the welcome email tied to a write that succeeded.
- **Identity and equality mean something.** `UniqueEntityId` is a UUID v7. Two value objects with the same attributes are equal. Two entities are the same when their ids match.
- **A collection can report what changed.** `WatchedList` keeps the items added and the items removed, so the repository persists the difference.
- **Agents follow the same rules.** The project ships a skill that teaches these conventions to a coding agent.

## Install

Requires [Bun](https://bun.sh) 1.4 or newer.

```bash
bun add archstone
```

The only runtime dependency is [failcraft](https://github.com/joao-coimbra/failcraft), which provides `Either` and `Maybe`.

## Example

`GetUser` loads a user and returns a typed error when the id is unknown. `User` is the aggregate you define. `UserRepository` extends `Findable<User>`, so `findById` returns `Maybe<User>`.

```ts
import {
  type Findable,
  type UseCase,
  type UseCaseError,
} from "archstone/domain/application"
import { type Either, left, right } from "archstone/core"

class UserNotFoundError implements UseCaseError {
  message: string

  constructor(userId: string) {
    this.message = `User ${userId} was not found.`
  }
}

interface UserRepository extends Findable<User> {}

type Input = { userId: string }
type Output = Either<UserNotFoundError, User>

class GetUser implements UseCase<Input, Output> {
  constructor(private readonly users: UserRepository) {}

  async execute({ userId }: Input): Promise<Output> {
    const user = await this.users.findById(userId)

    if (user.isNothing()) {
      return left(new UserNotFoundError(userId))
    }

    return right(user.value)
  }
}
```

`user.isNothing()` means there is no user. `user.value` is the user when there is one. The use case returns that result. It leaves the database client and the HTTP response to your infrastructure.

## Building blocks

**Either.** `left(error)` and `right(value)` for an operation that can fail. Use cases return `Either`, and the error implements `UseCaseError` with a `message`.

**Maybe.** `just(value)` and `nothing()` for a value that may be absent. `maybe(value)` treats `null` and `undefined` as `nothing()`. `Findable.findById` returns `Promise<Maybe<T>>`.

**ValueObject.** An object defined by its attributes, created through a static `create()` factory. Equality compares those attributes.

**Entity.** An object defined by a `UniqueEntityId`, also created through `create()`. Equality compares ids.

**AggregateRoot.** The entity that guards a cluster of domain objects and records events with `addDomainEvent()`.

**UniqueEntityId.** UUID v7. `toValue()` is the string you pass to `findById`. `equals()` compares two ids.

**WatchedList.** Subclass it, implement `compareItems`, then read `getNewItems()` and `getRemovedItems()` when saving.

**UseCase.** A class whose `execute(input)` returns `Promise<Either<...>>` or `Promise<Maybe<...>>`. Repositories are constructor arguments, typed as interfaces.

**Repository.** An interface next to the use case. Extend `Repository<T>` for the full set, or only `Findable`, `Creatable`, `Saveable`, or `Deletable`. `delete` receives the entity. The class that talks to the database implements the interface in your infrastructure.

**Domain events.** Raise the event inside the aggregate. After a successful save, call `DomainEvents.dispatchEventsForAggregate(aggregate.id)`. A handler implements `EventHandler<T>` from `archstone/core`.

## For coding agents

```bash
bun x skills add joao-coimbra/archstone
```

The skill covers entities, value objects, use cases, repositories, domain events, and tests, so the agent applies Archstone's conventions.

## Next

- [Tutorial — register a user from the value object to the domain event](./docs/tutorial.md)
- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [MIT License](./LICENSE)
