# Tutorial: Register a user

This tutorial builds one feature with Archstone: a user registration that validates the email, refuses a duplicate, saves the user through a repository interface, and sends a welcome email only after that save.

> **New to these ideas?** The notes in this tutorial name the concept behind each step. Skip a note when you already know it.

---

## Before you start

You need:

- [Bun](https://bun.sh) 1.4 or newer
- Basic TypeScript
- Archstone in the project:

```bash
bun add archstone
```

You will add these files:

```
src/domain/enterprise/errors.ts
src/domain/enterprise/email.ts
src/domain/enterprise/user-created-event.ts
src/domain/enterprise/user.ts
src/domain/application/user-repository.ts
src/domain/application/register-user.ts
src/infra/on-user-created.ts
src/domain/application/register-user.spec.ts
```

The enterprise files are the business model. The application files orchestrate one operation. `src/infra` is yours: Archstone does not ship database or email code.

Along the way you will use `UseCaseError`, `Either`, `Maybe`, `ValueObject`, `EntityId`, `AggregateRoot`, `UseCase`, repository contracts, `DomainEvent`, and `EventHandler`. A final section shows `WatchedList` for a collection that must remember what changed.

---

## 1. The code this replaces

A registration function often looks like this:

```ts
class User {
  id: string
  name: string
  email: string
}

async function registerUser(name: string, email: string) {
  const exists = await db.findByEmail(email)
  if (exists) throw new Error("email already taken")

  const user = new User()
  user.id = crypto.randomUUID()
  user.name = name
  user.email = email.toLowerCase()

  await db.insert(user)
  await mailer.sendWelcome(email)
}
```

That function works until the project grows. The problems are in the shape of the code:

- The signature does not say that the email can be taken or invalid. The caller has to read the body to know about `throw`.
- `"ada@example.com"` and `"not-an-email"` are both `string`. The lowercase rule lives in this function, so the next function can forget it.
- `db` and `mailer` are concrete. A test has to provide both, and a mailer failure happens after the user is already inserted.
- `id` is a plain `string` created in the function. It has no shared format and no `equals()`.

The rest of this tutorial replaces that function with a use case, one file at a time.

---

## 2. Name the failures

A use case error implements `UseCaseError`. The interface asks for `message`.

```ts
// src/domain/enterprise/errors.ts
import type { UseCaseError } from "archstone/domain/application"

export class InvalidEmailError implements UseCaseError {
  message: string

  constructor(email: string) {
    this.message = `"${email}" is not a valid email address.`
  }
}

export class UserAlreadyExistsError implements UseCaseError {
  message = "A user with this email already exists."
}

export class WelcomeEmailError implements UseCaseError {
  message = "The user was saved, but the welcome email was not sent."
}
```

> **Why implement `UseCaseError`?**
> These objects are results the caller handles. They stay small: a `message`, and whatever else you add. They are not unexpected exceptions, so they do not extend `Error`.

---

## 3. Return both outcomes with `Either`

`left(error)` builds the failure. `right(value)` builds the success. Read `.value` in the branch where `isRight()` or `isLeft()` is true. TypeScript narrows `.value` in that branch only. The other branch keeps both types, and so does the code after an early return.

```ts
import { type Either, left, right } from "archstone/core"
import { InvalidEmailError } from "./errors.ts"

function normalizeEmail(raw: string): Either<InvalidEmailError, string> {
  const normalized = raw.trim().toLowerCase()

  if (!normalized.includes("@")) {
    return left(new InvalidEmailError(raw))
  }

  return right(normalized)
}

const result = normalizeEmail("ada@example.com")

if (result.isLeft()) {
  console.error(result.value.message)
}

if (result.isRight()) {
  console.log(result.value)
}
```

A bare `else` is the other branch, so it does not narrow `.value`. `.message` is available only inside `isLeft()`.

> **What `Either` changes**
> The return type lists the failure. The caller branches on `isLeft()` or `isRight()`. Ignoring the result is still possible, but the failure is no longer hidden inside `throw`.

---

## 4. Put the email rule on a value object

An email is the normalized text plus the rule that it must contain `@`. This is the function from the previous section, moved onto the email itself. Two emails with the same text are the same email, even when they are different objects. That is a value object: no identity of its own, equality by its attributes.

`ValueObject` keeps `props` protected. Build it from `create()`, and on success return `right(...)`.

```ts
// src/domain/enterprise/email.ts
import { type Either, left, right, ValueObject } from "archstone/core"
import { InvalidEmailError } from "./errors.ts"

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

    return right(new Email({ value: normalized }))
  }
}
```

Compare the emails after you know both calls succeeded:

```ts
const first = Email.create("user@example.com")
const second = Email.create("user@example.com")

if (first.isRight() && second.isRight()) {
  first.value.equals(second.value) // true
}
```

> **Why a value object?**
> `Email`, `Money`, or `Address` stop being bare strings. The rule runs in `create()`, and `.equals()` compares the attributes. `===` compares the two objects, so it stays false here.

---

## 5. Give the user an id

`EntityId` stores the string. It does not generate one. The project extends it and chooses the generator. That class is the usual `UniqueEntityId`. The domain creates the id before the insert. A database that can assign a key stays out of this decision: the aggregate already has an identity when it is saved.

```ts
// src/core/unique-entity-id.ts
import { randomUUID } from "node:crypto"
import { EntityId } from "archstone/core"

export class UniqueEntityId extends EntityId {
  constructor(value: string = randomUUID()) {
    super(value)
  }
}
```

`randomUUID()` is a UUID v4 from Node. Replace the default with the format you want. `new UniqueEntityId()` mints a new id. `new UniqueEntityId(row.id)` keeps the string already stored.

```ts
const generated = new UniqueEntityId()
generated.toValue() // the string you store and pass to findById

const stored = new UniqueEntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
generated.equals(stored) // false
```

`toValue()` is the plain string. `findById` takes that string. `equals()` compares two ids. `===` compares the objects.

> **What the wrapper gives you**
> A repository method can ask for `EntityId` instead of any `string`, and comparison goes through `equals()`. It is still one id type for every entity. A user id and an order id are both `EntityId`, so the type does not distinguish them. Put that distinction in the repository method, or in the aggregate that owns the reference.

`User.create()` calls `new UniqueEntityId()` when you are registering someone new, and you pass an existing id when you rebuild a user from a saved row. `Entity` requires that id. It does not create one.

Archstone still exports `UniqueEntityId`, marked deprecated, as another name for `EntityId`. Do not import that one. It requires a string and does not generate an id. The class above is yours.

---

## 6. Model the user

`User` is the consistency boundary for this feature: the name, the email, and the fact that a new user was created. It extends `AggregateRoot`, which can record domain events. An object with an id and no events extends `Entity` instead. An order line is a typical `Entity`. The order that owns the lines, and that records "order placed", is the `AggregateRoot`.

The event carries the user that was created. `getAggregateId()` tells the dispatcher which aggregate raised it.

```ts
// src/domain/enterprise/user-created-event.ts
import { type DomainEvent, type EntityId } from "archstone/core"
import type { User } from "./user.ts"

export class UserCreatedEvent implements DomainEvent {
  occurredAt = new Date()

  constructor(public readonly user: User) {}

  getAggregateId(): EntityId {
    return this.user.id
  }
}
```

```ts
// src/domain/enterprise/user.ts
import type { Optional } from "archstone/core"
import { AggregateRoot } from "archstone/domain/enterprise"
import { UniqueEntityId } from "../../core/unique-entity-id.ts"
import type { Email } from "./email.ts"
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
    id?: UniqueEntityId
  ): User {
    const user = new User(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId()
    )

    if (!id) {
      user.addDomainEvent(new UserCreatedEvent(user))
    }

    return user
  }
}
```

`Optional<UserProps, "createdAt">` lets the caller skip `createdAt`. The stored props still include it, because `create()` fills the default.

Pass `id` only when the row already exists. A missing id means this call is a registration, so `create()` records `UserCreatedEvent`. Rebuilding a user from the database passes the stored id and does not record that event again. `addDomainEvent()` is protected. It keeps the event on the aggregate until something dispatches it.

`user-created-event.ts` imports `User` as a type only, and `user.ts` imports the event class. Loading the user does not load itself again.

---

## 7. Write the use case

### The repository interface

The use case depends on an interface. The class that talks to the database implements it in your infrastructure.

```ts
// src/domain/application/user-repository.ts
import type { Maybe } from "archstone/core"
import type { Repository } from "archstone/domain/application"
import type { User } from "../enterprise/user.ts"

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<Maybe<User>>
}
```

`Repository<User>` includes these four contracts. A repository that does not need all of them extends only the ones it needs. An audit log often extends `Creatable<AuditLog>` and nothing else.

| Contract       | Method                                    |
| -------------- | ----------------------------------------- |
| `Findable<T>`  | `findById(id: string): Promise<Maybe<T>>` |
| `Creatable<T>` | `create(entity: T): Promise<void>`        |
| `Saveable<T>`  | `save(entity: T): Promise<void>`          |
| `Deletable<T>` | `delete(entity: T): Promise<void>`        |

Two details are easy to miss:

- `findById` takes the string from `user.id.toValue()`, and it returns `Maybe<T>`. `isJust()` means the entity is present, and `.value` is that entity inside the `isJust()` branch. `isNothing()` means it is absent. Code after `isNothing()` still types `.value` as `T | undefined`. A `Maybe` is always an object, so `if (!user)` does not mean "missing".
- `delete` takes the entity, not an id.

A custom query may return `T | null`. `findByEmail` returns `Maybe<User>` so this feature has one way to represent absence.

### The use case

```ts
// src/domain/application/register-user.ts
import { type Either, left, right } from "archstone/core"
import type { UseCase } from "archstone/domain/application"
import { Email } from "../enterprise/email.ts"
import {
  InvalidEmailError,
  UserAlreadyExistsError,
  WelcomeEmailError,
} from "../enterprise/errors.ts"
import { User } from "../enterprise/user.ts"
import type { UserRepository } from "./user-repository.ts"

type RegisterUserInput = {
  name: string
  email: string
}

type RegisterUserOutput = Either<
  UserAlreadyExistsError | InvalidEmailError | WelcomeEmailError,
  User
>

export class RegisterUserUseCase
  implements UseCase<RegisterUserInput, RegisterUserOutput>
{
  constructor(private readonly users: UserRepository) {}

  async execute({
    name,
    email,
  }: RegisterUserInput): Promise<RegisterUserOutput> {
    const emailResult = Email.create(email)

    if (emailResult.isRight()) {
      const emailAddress = emailResult.value
      const existing = await this.users.findByEmail(emailAddress.value)

      if (existing.isJust()) {
        return left(new UserAlreadyExistsError())
      }

      const user = User.create({ name, email: emailAddress })
      try {
        await this.users.create(user)
      } catch (error) {
        if (error instanceof AggregateError) {
          return left(new WelcomeEmailError())
        }
        throw error
      }
      return right(user)
    }

    if (emailResult.isLeft()) {
      return left(emailResult.value)
    }

    return left(new InvalidEmailError(email))
  }
}
```

The lookup uses `emailAddress.value`, the normalized text. Searching with the raw input would miss `Ada@Example.com` after the first save stored `ada@example.com`. `isJust()` only means a user is already stored. This use case does not need that user, so it does not read `.value`.

The email is read inside `isRight()`, where `.value` is an `Email`. The validation error is returned inside `isLeft()`, where `.value` is that error. TypeScript does not narrow the lines after either check, and it does not treat the two checks as exhaustive. The method therefore ends by building an `InvalidEmailError`. `Email.create` always returns one side or the other, so that last return does not run.

The class receives `UserRepository`, not a database client. It returns the user, a validation error, or `WelcomeEmailError` when `create()` rejects with the `AggregateError` from a handler. The next section is that handler. The aggregate has already recorded that a user was created.

---

## 8. Send the email after the save

### The handler

A handler implements `EventHandler<T>` from `archstone/core`. The constructor subscribes it. Create one instance when the process starts, before any registration runs.

```ts
// src/infra/on-user-created.ts
import { DomainEvents, type EventHandler } from "archstone/core"
import { UserCreatedEvent } from "../domain/enterprise/user-created-event.ts"

interface Mailer {
  sendWelcome(email: string): Promise<void>
}

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

```ts
new OnUserCreated(mailer)
```

### Dispatch from the repository

Call `await dispatchEventsForAggregate` after the write succeeds. The argument is `user.id`, the `EntityId`. The method runs the handlers, and clears the aggregate's events only after they settle. A rejected handler rejects the call and leaves the events in place.

```ts
import { DomainEvents } from "archstone/core"

async create(user: User): Promise<void> {
  await this.database.insert(user)
  await DomainEvents.dispatchEventsForAggregate(user.id)
}
```

`await dispatchEventsForAggregate` waits until the handlers for that save have settled. The insert is already done. A rejected handler rejects `create()` with an `AggregateError` and leaves the events on the aggregate. The use case catches that error and returns `left(new WelcomeEmailError())`, so the caller still receives an `Either`. Any other rejection is unexpected and is thrown again.

> **Why dispatch comes after the insert**
> The event means "a user was stored". Dispatching after the insert keeps the email on that side of the write. `clearEvents()` belongs to the dispatcher. Do not call it from the use case.

In tests, reset the registry so one case does not see another case's handlers or pending aggregates:

```ts
import { DomainEvents } from "archstone/core"
import { beforeEach } from "bun:test"

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
  DomainEvents.shouldRun = true
})
```

`shouldRun = false` keeps the handlers registered and skips dispatch. The events stay on the aggregate. Use that when a test builds aggregates and wants no side effects. Set it back to `true` afterwards, then dispatch if the test should deliver those events.

---

## 9. Follow one registration

```
RegisterUserUseCase.execute({ name, email })
  │
  ├─ Email.create(email)                 Either<InvalidEmailError, Email>
  ├─ users.findByEmail(normalized)       Maybe<User>
  ├─ User.create({ name, email })        records UserCreatedEvent when id is omitted
  ├─ users.create(user)                  writes the row, then dispatches
  │     └─ OnUserCreated.handle(event)
  │           └─ mailer.sendWelcome(user.email.value)
  └─ right(user)                         or left(WelcomeEmailError) if a handler rejects
```

| Layer                          | Responsibility                                       |
| ------------------------------ | ---------------------------------------------------- |
| `archstone/core`               | `Either`, `Maybe`, `ValueObject`, `EntityId`, events |
| `archstone/domain/enterprise`  | `Entity`, `AggregateRoot`                            |
| `archstone/domain/application` | `UseCase` and repository interfaces                  |
| Your infrastructure            | The database, HTTP, and the mailer                   |

---

## 10. Test the use case

The test uses an in-memory repository. `findById` returns `nothing()` when the id is absent, which is what `Findable` requires.

```ts
// src/domain/application/register-user.spec.ts
import { beforeEach, expect, test } from "bun:test"
import { DomainEvents, just, nothing } from "archstone/core"
import {
  InvalidEmailError,
  UserAlreadyExistsError,
} from "../enterprise/errors.ts"
import type { User } from "../enterprise/user.ts"
import { RegisterUserUseCase } from "./register-user.ts"
import type { UserRepository } from "./user-repository.ts"

class InMemoryUserRepository implements UserRepository {
  items: User[] = []

  async findById(id: string) {
    const user = this.items.find((item) => item.id.toValue() === id)
    if (!user) return nothing()
    return just(user)
  }

  async findByEmail(email: string) {
    const user = this.items.find((item) => item.email.value === email)
    if (!user) return nothing()
    return just(user)
  }

  async create(user: User) {
    this.items.push(user)
    await DomainEvents.dispatchEventsForAggregate(user.id)
  }

  async save(user: User) {
    const index = this.items.findIndex((item) => item.id.equals(user.id))
    if (index >= 0) this.items[index] = user
    await DomainEvents.dispatchEventsForAggregate(user.id)
  }

  async delete(user: User) {
    this.items = this.items.filter((item) => !item.id.equals(user.id))
  }
}

let users: InMemoryUserRepository
let sut: RegisterUserUseCase

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
  DomainEvents.shouldRun = true
  users = new InMemoryUserRepository()
  sut = new RegisterUserUseCase(users)
})

test("registers a new user", async () => {
  const result = await sut.execute({ name: "Ada", email: "ada@example.com" })

  expect(result.isRight()).toBe(true)
  if (result.isRight()) {
    expect(result.value.name).toBe("Ada")
    expect(result.value.email.value).toBe("ada@example.com")
  }
  expect(users.items).toHaveLength(1)
})

test("rejects an invalid email", async () => {
  const result = await sut.execute({ name: "Ada", email: "not-an-email" })

  expect(result.isLeft()).toBe(true)
  if (result.isLeft()) {
    expect(result.value).toBeInstanceOf(InvalidEmailError)
  }
  expect(users.items).toHaveLength(0)
})

test("rejects a duplicate email", async () => {
  await sut.execute({ name: "Ada", email: "ada@example.com" })

  const result = await sut.execute({
    name: "Ada Lovelace",
    email: "ADA@example.com",
  })

  expect(result.isLeft()).toBe(true)
  if (result.isLeft()) {
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
  }
  expect(users.items).toHaveLength(1)
})
```

`ADA@example.com` matches the stored `ada@example.com` because `Email.create` normalizes before the lookup.

`expect(result.isRight())` does not change the type. `.value` is the user inside `if (result.isRight())`, and it is the error inside `if (result.isLeft())`.

---

## 11. Track what changed in a collection

Registration does not need this. Use it when an aggregate owns a collection and the repository should write the difference: roles added to a user, tags removed from a post.

Subclass `WatchedList` and implement `compareItems`.

```ts
import { WatchedList } from "archstone/core"

type Role = "admin" | "editor" | "viewer"

class RoleList extends WatchedList<Role> {
  compareItems(a: Role, b: Role): boolean {
    return a === b
  }

  static create(roles: Role[]): RoleList {
    return new RoleList(roles)
  }
}

const roles = RoleList.create(["viewer"])
roles.add("admin")
roles.remove("viewer")

roles.getNewItems() // ["admin"]
roles.getRemovedItems() // ["viewer"]
```

The repository reads that difference after `save`:

```ts
const added = user.roles.getNewItems()
const removed = user.roles.getRemovedItems()
```

| Method              | Behavior                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `getItems()`        | The current items                                                                                   |
| `getNewItems()`     | Items added that were not in the initial list                                                       |
| `getRemovedItems()` | Initial items that have been removed                                                                |
| `exists(item)`      | Whether the item is in the current list                                                             |
| `add(item)`         | Adds the item. A brand-new item is tracked as new. An item that was only removed is restored        |
| `remove(item)`      | Removes the item. An initial item is tracked as removed. An item that was only new is dropped       |
| `update(items)`     | Replaces the current items and recomputes the diff against the list the collection was created with |

An item in the initial list is not reported by `getNewItems()` when you add it again. Removing an item that was added in this same session drops it from `getNewItems()` and does not report it as removed.

---

## Next

The same shape fits `GetUser`, `UpdateUser`, and `DeleteUser`: a repository interface, a use case that returns `Either` or `Maybe`, and infrastructure behind the interface.

Install the skill if a coding agent will write the next use case:

```bash
bun x skills add joao-coimbra/archstone
```

The [README](../README.md#building-blocks) lists every building block and the public entry points.
