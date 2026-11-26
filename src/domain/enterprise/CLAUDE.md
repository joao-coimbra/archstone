# Domain / Enterprise Layer

**Responsibility:** The pure domain model. No framework, no infrastructure, no application logic — only business rules and domain invariants.

Never import from `domain/application/` or any infrastructure. Only imports from `core/` are allowed.

## Entity

The base class for any object with a unique identity. Two entities are equal if their `id` matches, regardless of other properties.

Always provide a static `create()` factory — never expose the constructor directly. Use `Optional<Props, K>` for props that have sensible defaults.

```ts
import { Entity, UniqueEntityId } from "@/domain/enterprise/index.ts"
import { Optional } from "@/core/index.ts"

interface UserProps {
  name: string
  email: string
  createdAt: Date
}

class User extends Entity<UserProps> {
  get name() { return this.props.name }
  get email() { return this.props.email }

  static create(props: Optional<UserProps, "createdAt">, id?: UniqueEntityId): User {
    return new User(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id
    )
  }
}
```

## AggregateRoot

Extends `Entity`. The aggregate is the consistency boundary — it enforces invariants and owns domain events. Only one aggregate root per transaction.

Raise events inside the aggregate with `addDomainEvent()`. Dispatch happens in infrastructure after persistence — never inside the domain.

```ts
class UserCreatedEvent implements DomainEvent {
  occurredAt = new Date()
  constructor(public readonly user: User) {}
  getAggregateId() { return this.user.id }
}

class User extends AggregateRoot<UserProps> {
  static create(props: Optional<UserProps, "createdAt">): User {
    const user = new User({ ...props, createdAt: props.createdAt ?? new Date() })
    user.addDomainEvent(new UserCreatedEvent(user))
    return user
  }
}
```

**Gotcha:** `clearEvents()` is called automatically after dispatch — never call it manually.

## ValueObject

Objects without identity — defined entirely by their attributes. Immutable by design. Validate in the factory method.

```ts
class Email extends ValueObject<{ value: string }> {
  get value() { return this.props.value }

  static create(raw: string): Email {
    if (!raw.includes("@")) throw new Error("invalid email")
    return new Email({ value: raw.toLowerCase() })
  }
}
```

Prefer returning `Either<Error, ValueObject>` from `create()` when validation failure is a domain concern (i.e., when callers must handle it explicitly).

## WatchedList inside Aggregates

Use `WatchedList<T>` for any collection the aggregate owns that needs change tracking. Subclass it inside the domain file, not as a generic utility.

```ts
class AttachmentList extends WatchedList<Attachment> {
  compareItems(a: Attachment, b: Attachment) {
    return a.id.equals(b.id)
  }
}
```

## What Does NOT Belong Here

- Repository implementations — interfaces only, and those go in `application/`
- Use case logic
- Any import from a framework, ORM, or HTTP library
- Application-level error types (those implement `UseCaseError` in `application/`)
