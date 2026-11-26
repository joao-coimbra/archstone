# Tutorial: Building a Backend Feature with Archstone

This tutorial walks you through building a complete backend feature — registering a user — using every major primitive Archstone provides. You will end with a fully structured, testable feature that follows Domain-Driven Design and Clean Architecture conventions.

> **New to DDD?** Callout boxes like this one explain the concepts behind each step. Skip them if you are already familiar with DDD.

---

## Before You Start

**Prerequisites:**

- [Bun](https://bun.sh) >= 1.0 installed
- Basic TypeScript familiarity
- Archstone installed in your project:

```bash
bun add archstone
```

**What you will build:**

A `RegisterUser` feature, end-to-end:

1. A `User` aggregate root with an `Email` value object
2. A typed error contract for the failure case
3. A `RegisterUserUseCase` that never throws
4. A `UserRepository` interface decoupled from any database
5. A `UserCreatedEvent` that triggers side effects after persistence
6. A `RoleList` to track collection changes efficiently

**What you will learn:**

`UniqueEntityId` · `ValueObject` · `Entity` · `AggregateRoot` · `Either` · `UseCase` · `UseCaseError` · `Repository` contracts · `DomainEvent` · `EventHandler` · `WatchedList`

---

## 1. The Problem with Traditional Code

Consider a typical ad-hoc implementation:

```ts
// ❌ No structure, no contracts, no safety
class User {
  id: string
  name: string
  email: string
}

async function registerUser(name: string, email: string) {
  const exists = await db.findByEmail(email)
  if (exists) throw new Error("email already taken") // caller must remember to catch

  const user = new User()
  user.id = crypto.randomUUID()
  user.name = name
  user.email = email.toLowerCase() // validation scattered everywhere

  await db.insert(user)
  await mailer.sendWelcome(email) // side effect tightly coupled to the operation
}
```

Problems:

- Errors are thrown — callers may forget to handle them
- Validation logic is scattered — nothing enforces it at the type boundary
- The mailer is called inline — if persistence fails halfway, the email was already sent
- Identity is a raw string — nothing prevents passing an order ID where a user ID is expected
- The function is impossible to test without a real database

Archstone addresses every one of these. Let's rebuild it properly.

---

## 2. Modeling Identity — `UniqueEntityId`

Every entity in the domain needs a stable, typed identity. Archstone provides `UniqueEntityId`, a wrapper around UUID v7 (time-sortable, ideal for database indexing).

```ts
import { UniqueEntityId } from "archstone/core"

// auto-generated — use this when creating a new entity
const id = new UniqueEntityId()

// from an existing value — use this when reconstructing from a database row
const id = new UniqueEntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")

id.toValue() // → "0195d810-..." (raw string for serialization)
id.equals(otherId) // → true / false (value comparison)
```

> **Why wrap UUIDs?**
> A raw `string` carries no semantic meaning — TypeScript won't stop you from passing a `postId` where a `userId` is expected. `UniqueEntityId` makes identity nominal: the type system rejects mismatches, and `.equals()` provides safe value comparison without `===`.

You will not instantiate `UniqueEntityId` directly very often — `Entity` does it for you. But knowing the API is important for reconstruction and comparison.

---

## 3. Enforcing Invariants — `ValueObject`

An email address is not just a string. It has rules: it must contain `@`, it should be lowercase, and two identical emails should be considered equal regardless of which object instance holds them.

This is a **value object**: an object defined entirely by its properties, with no identity of its own.

```ts
import { ValueObject } from "archstone/core"
import { Either, left, right } from "archstone/core"

interface EmailProps {
  value: string
}

export class Email extends ValueObject<EmailProps> {
  get value() {
    return this.props.value
  }

  static create(raw: string): Either<InvalidEmailError, Email> {
    const normalized = raw.trim().toLowerCase()

    if (!normalized.includes("@")) {
      return left(new InvalidEmailError(raw))
    }

    return new Email({ value: normalized }) // constructed only when valid
  }
}
```

Notice that `create()` returns `Either` — validation failure is a first-class return value, not an exception. We will define `InvalidEmailError` in the next section; for now, focus on the pattern.

**Equality works by value, not reference:**

```ts
const a = Email.create("user@example.com")
const b = Email.create("user@example.com")

// if (a.isRight() && b.isRight())
a.value.equals(b.value) // ✅ true — same props, different instances
```

> **Why value objects?**
> When you model concepts like `Email`, `Money`, or `Address` as plain strings or numbers, you lose their constraints. A value object forces validation to happen in one place and makes equality semantically correct. Two `Email` instances with the same address *are* the same email.

---

## 4. Modeling Your Domain — `Entity` & `AggregateRoot`

### 4.1 Typed errors first

Before defining `User`, define the errors that can arise from its creation. Error classes **implement** `UseCaseError` — they do not extend `Error`.

```ts
import { UseCaseError } from "archstone/domain/application"

export class InvalidEmailError implements UseCaseError {
  message: string

  constructor(email: string) {
    this.message = `"${email}" is not a valid email address.`
  }
}

export class UserAlreadyExistsError implements UseCaseError {
  message = "A user with this email already exists."
}
```

> **Why `implements UseCaseError` and not `extends Error`?**
> `UseCaseError` is a simple interface that requires only `message: string`. Not extending `Error` keeps error objects lightweight, serializable, and free from the quirks of JavaScript's `Error` prototype chain. It also signals intent clearly: these are domain errors, not runtime exceptions.

### 4.2 The `User` aggregate

A `User` owns the consistency boundary for user data. Because it will raise domain events, it extends `AggregateRoot` rather than `Entity`.

```ts
import { AggregateRoot, UniqueEntityId, Optional } from "archstone/core"
import { Email } from "./email.ts"
import { UserCreatedEvent } from "./user-created-event.ts"

interface UserProps {
  name: string
  email: Email
  createdAt: Date
}

export class User extends AggregateRoot<UserProps> {
  get name() {
    return this.props.name
  }

  get email() {
    return this.props.email
  }

  get createdAt() {
    return this.props.createdAt
  }

  static create(
    props: Optional<UserProps, "createdAt">,
    id?: UniqueEntityId,
  ): User {
    const user = new User(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id,
    )

    const isNew = !id
    if (isNew) {
      user.addDomainEvent(new UserCreatedEvent(user))
    }

    return user
  }
}
```

A few important details:

- `Optional<UserProps, "createdAt">` makes `createdAt` optional at the call site. The default is set inside `create()`. This pattern keeps the factory ergonomic while keeping the stored props fully typed.
- The optional `id` parameter lets you reconstruct an existing user from the database by passing its persisted id. If omitted, a new `UniqueEntityId` is generated.
- The `isNew` check prevents re-raising `UserCreatedEvent` when rehydrating an entity from the database.
- `addDomainEvent()` is a protected method inherited from `AggregateRoot` — it queues the event and marks the aggregate for dispatch.

> **`Entity` vs `AggregateRoot` — when to use which?**
> Use `Entity` for objects that have identity but do not own domain events or act as a consistency boundary (e.g., an `Address` inside a `User`). Use `AggregateRoot` when the object is the root of a cluster, enforces invariants across its children, and needs to raise events. There is usually one `AggregateRoot` per use case transaction.

---

## 5. Handling Errors Without Throwing — `Either`

`Either<L, R>` is a discriminated union with two sides:

- `Left<L>` — the failure case, constructed with `left(error)`
- `Right<R>` — the success case, constructed with `right(value)`

Use cases **always** return `Either`. This forces callers to handle both outcomes at the type level — the compiler will not let a failure go unaddressed.

```ts
import { Either, left, right } from "archstone/core"

type RegisterResult = Either<
  UserAlreadyExistsError | InvalidEmailError,
  User
>
```

Narrowing at the call site:

```ts
const result = await registerUser.execute({ name: "Ada", email: "ada@example.com" })

if (result.isLeft()) {
  // result.value is UserAlreadyExistsError | InvalidEmailError
  console.error(result.value.message)
  return
}

// result.value is User — TypeScript knows this is the success branch
console.log(result.value.name)
```

> **Why not just throw?**
> Thrown exceptions are invisible in the type signature — callers have no way to know what can go wrong without reading the implementation. `Either` makes every failure path explicit in the return type, eliminating entire classes of unhandled errors.

---

## 6. Writing the Use Case — `UseCase`

A use case orchestrates a single application operation. It receives typed input, interacts with the domain and repositories, and returns `Either`.

### 6.1 Define the repository contract first

Repository interfaces live in the application layer — implementations live in infrastructure. This keeps the domain decoupled from any database.

```ts
import { Repository } from "archstone/domain/application"
import { User } from "../enterprise/user.ts"

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}
```

`Repository<User>` composes `Findable<User>`, `Creatable<User>`, `Saveable<User>`, and `Deletable<User>`. Add only the extra methods your domain actually needs.

> **Available segregated contracts:**
>
> | Contract | Method |
> |---|---|
> | `Findable<T>` | `findById(id: string): Promise<T \| null>` |
> | `Creatable<T>` | `create(entity: T): Promise<void>` |
> | `Saveable<T>` | `save(entity: T): Promise<void>` |
> | `Deletable<T>` | `delete(entity: T): Promise<void>` |
>
> Prefer composing only what you need — an audit log repository may only need `Creatable<AuditLog>`.

**Gotchas to remember:**
- `findById()` accepts a plain `string` — pass `user.id.toValue()`, not the `UniqueEntityId` object
- `delete()` accepts the **full entity**, not an id

### 6.2 The use case

```ts
import { UseCase } from "archstone/domain/application"
import { Either, left, right } from "archstone/core"
import { User } from "../enterprise/user.ts"
import { Email } from "../enterprise/email.ts"
import { UserAlreadyExistsError, InvalidEmailError } from "../enterprise/errors.ts"
import { UserRepository } from "./user-repository.ts"

type RegisterUserInput = {
  name: string
  email: string
}

type RegisterUserOutput = Either<
  UserAlreadyExistsError | InvalidEmailError,
  User
>

export class RegisterUserUseCase
  implements UseCase<RegisterUserInput, RegisterUserOutput>
{
  constructor(private readonly users: UserRepository) {}

  async execute({ name, email }: RegisterUserInput): Promise<RegisterUserOutput> {
    // Validate the email — returns Either
    const emailOrError = Email.create(email)
    if (emailOrError.isLeft()) return left(emailOrError.value)

    // Check for duplicates
    const existing = await this.users.findByEmail(email)
    if (existing) return left(new UserAlreadyExistsError())

    // Create the aggregate — domain event is queued inside
    const user = User.create({ name, email: emailOrError.value })

    // Persist — event dispatch happens after this
    await this.users.create(user)

    return right(user)
  }
}
```

The use case has no knowledge of the database, the HTTP layer, or the mailer. It only orchestrates domain logic.

---

## 7. Reacting to Domain Events — `DomainEvent` & `EventHandler<T>`

Domain events let you decouple side effects (sending a welcome email, logging to an audit trail) from the operation that caused them. The event is raised inside the aggregate; infrastructure dispatches it after the aggregate is safely persisted.

### 7.1 Define the event

```ts
import { DomainEvent, UniqueEntityId } from "archstone/core"
import { User } from "./user.ts"

export class UserCreatedEvent implements DomainEvent {
  occurredAt = new Date()

  constructor(public readonly user: User) {}

  getAggregateId(): UniqueEntityId {
    return this.user.id
  }
}
```

### 7.2 Write the handler

```ts
import { DomainEvents, EventHandler } from "archstone/core"
import { UserCreatedEvent } from "../enterprise/user-created-event.ts"

export class OnUserCreated implements EventHandler<UserCreatedEvent> {
  constructor(private readonly mailer: Mailer) {
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

The handler self-registers in its constructor. Instantiate it once in your infrastructure setup — before any use cases run — so it is ready to react when events are dispatched.

### 7.3 Dispatch after persistence

In your repository implementation (infrastructure layer), dispatch events immediately after a successful write:

```ts
// PrismaUserRepository.ts — infrastructure, not in this library
import { DomainEvents } from "archstone/core"

async create(user: User): Promise<void> {
  await this.prisma.user.create({ data: toPersistence(user) })

  // Dispatch all events queued on this aggregate
  DomainEvents.dispatchEventsForAggregate(user.id)
}
```

> **Why dispatch after persistence?**
> If you sent the welcome email *before* committing to the database and then the write failed, you would have a user who received a welcome email but does not exist in the system. Dispatching after persistence guarantees that side effects only happen when the state change is durable.

### 7.4 Test isolation

In tests, always reset the registry between cases to prevent handler cross-contamination:

```ts
import { DomainEvents } from "archstone/core"
import { beforeEach } from "bun:test"

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
})
```

---

## 8. Tracking Collection Changes — `WatchedList`

When an aggregate owns a collection (tags on a post, roles on a user), you do not want to overwrite the entire collection on every save. `WatchedList` tracks only what changed — additions and removals — so the repository writes the minimal diff.

Subclass `WatchedList` inside your domain model and implement `compareItems`:

```ts
import { WatchedList } from "archstone/core"

// A simple role value for illustration
type Role = "admin" | "editor" | "viewer"

class RoleList extends WatchedList<Role> {
  compareItems(a: Role, b: Role): boolean {
    return a === b
  }

  static create(roles: Role[]): RoleList {
    return new RoleList(roles)
  }
}
```

Use it inside an aggregate that manages roles:

```ts
interface UserProps {
  name: string
  email: Email
  roles: RoleList
  createdAt: Date
}

class User extends AggregateRoot<UserProps> {
  get roles() {
    return this.props.roles
  }

  addRole(role: Role): void {
    this.props.roles.add(role)
  }

  removeRole(role: Role): void {
    this.props.roles.remove(role)
  }

  // ... rest of the aggregate
}
```

In the repository, write only what changed:

```ts
async save(user: User): Promise<void> {
  const newRoles = user.roles.getNewItems()
  const removedRoles = user.roles.getRemovedItems()

  if (newRoles.length > 0) {
    await this.db.userRoles.createMany(/* ... */)
  }

  if (removedRoles.length > 0) {
    await this.db.userRoles.deleteMany(/* ... */)
  }

  DomainEvents.dispatchEventsForAggregate(user.id)
}
```

> **Why not just replace the whole collection?**
> `DELETE WHERE userId = X` followed by `INSERT` re-creates every row, breaks foreign key constraints mid-transaction, and defeats any database-level change tracking. Writing the diff is both more efficient and more correct.

Available methods on any `WatchedList`:

| Method | Returns |
|---|---|
| `getItems()` | All current items |
| `getNewItems()` | Items added since construction |
| `getRemovedItems()` | Items removed since construction |
| `exists(item)` | Whether an item is currently in the list |
| `add(item)` | Add and track as new |
| `remove(item)` | Remove and track as removed |
| `update(items)` | Replace all, auto-computing the diff |

---

## 9. Putting It All Together

Here is the full flow for the `RegisterUser` feature:

```
HTTP Handler (infrastructure)
  │
  ▼
RegisterUserUseCase.execute({ name, email })
  │
  ├─ Email.create(email)                → Either<InvalidEmailError, Email>
  ├─ userRepository.findByEmail(email)  → User | null
  ├─ User.create({ name, email })       → queues UserCreatedEvent internally
  ├─ userRepository.create(user)        → persists, then dispatches events
  │     └─ DomainEvents.dispatchEventsForAggregate(user.id)
  │           └─ OnUserCreated.handle(event)
  │                 └─ mailer.sendWelcome(user.email.value)
  │
  └─ return right(user)                 → Either<..., User>
```

Each layer has one responsibility:

| Layer | Responsibility |
|---|---|
| `core` | Language-level utilities — `Either`, `UniqueEntityId`, `ValueObject`, events |
| `domain/enterprise` | Business rules — entities, aggregates, value objects |
| `domain/application` | Orchestration — use cases, repository interfaces |
| `infrastructure` | Implementation details — database, HTTP, email (not in this library) |

---

## 10. Testing the Use Case

Use an in-memory repository — never a real database.

```ts
import { test, expect, beforeEach } from "bun:test"
import { DomainEvents } from "archstone/core"
import { RegisterUserUseCase } from "./register-user-use-case.ts"
import { UserAlreadyExistsError } from "../enterprise/errors.ts"

// In-memory implementation of UserRepository
class InMemoryUserRepository implements UserRepository {
  items: User[] = []

  async findById(id: string) {
    return this.items.find((u) => u.id.toValue() === id) ?? null
  }

  async findByEmail(email: string) {
    return this.items.find((u) => u.email.value === email) ?? null
  }

  async create(user: User) {
    this.items.push(user)
    DomainEvents.dispatchEventsForAggregate(user.id)
  }

  async save(user: User) {
    const index = this.items.findIndex((u) => u.id.equals(user.id))
    if (index >= 0) this.items[index] = user
    DomainEvents.dispatchEventsForAggregate(user.id)
  }

  async delete(user: User) {
    this.items = this.items.filter((u) => !u.id.equals(user.id))
  }
}

let users: InMemoryUserRepository
let sut: RegisterUserUseCase

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
  users = new InMemoryUserRepository()
  sut = new RegisterUserUseCase(users)
})

test("registers a new user", async () => {
  const result = await sut.execute({ name: "Ada", email: "ada@example.com" })

  expect(result.isRight()).toBe(true)
  expect(users.items).toHaveLength(1)
})

test("rejects an invalid email", async () => {
  const result = await sut.execute({ name: "Ada", email: "not-an-email" })

  expect(result.isLeft()).toBe(true)
  expect(result.value).toBeInstanceOf(InvalidEmailError)
})

test("rejects a duplicate email", async () => {
  await sut.execute({ name: "Ada", email: "ada@example.com" })
  const result = await sut.execute({ name: "Ada Lovelace", email: "ada@example.com" })

  expect(result.isLeft()).toBe(true)
  expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
})
```

---

## What's Next

You now have a complete, structured feature built on Archstone. From here:

- **Add more use cases** — `GetUser`, `UpdateUser`, `DeleteUser` follow the same pattern
- **Wire the infrastructure** — implement `UserRepository` against your database (Prisma, Drizzle, raw SQL) in your infrastructure layer
- **Install the AI skill** — your coding agent can apply these conventions automatically:

```bash
bun x skills add joao-coimbra/archstone
```

For a full reference of every export, see the [Package Exports](../README.md#package-exports) section of the README.
